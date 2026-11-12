import asyncio
import os
import json
import base64
import logging
import traceback
from google import genai
from google.genai import types
from config import config

# Configure Logging - Set to INFO to see the flow
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [LiveAgent] %(message)s'
)
logger = logging.getLogger(__name__)

MODEL = config.GEMINI_LIVE_MODEL

# --- Configuration ---
CONFIG = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    system_instruction=types.Content(parts=[types.Part(text="""
    You are HealthMate AI. You are in a continuous live audio conversation.
    - Always respond to the user's audio.
    - Keep your responses short and conversational.
    - If you hear silence or background noise, don't ignore it—stay engaged.
    - IMPORTANT: You MUST generate audio responses.
    """)]),
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Zephyr")
        )
    ),
    # Helps handle long conversations by compressing history
    context_window_compression=types.ContextWindowCompressionConfig(
        trigger_tokens=20000,
        sliding_window=types.SlidingWindow(target_tokens=10000),
    )
)

client = None
if config.GEMINI_API_KEY:
    try:
        client = genai.Client(
            http_options={"api_version": config.GEMINI_API_VERSION},
            api_key=config.GEMINI_API_KEY,
        )
    except Exception as e:
        logger.error(f"Failed to initialize Gemini live client: {e}")

async def gemini_session_handler(ws):
    if not client:
        logger.error("Gemini Live chat is unavailable: GEMINI_API_KEY is missing or invalid")
        return

    # Counters for debugging
    client_packets_in = 0
    gemini_packets_out = 0
    gemini_packets_in = 0
    client_packets_out = 0

    gemini_in_queue = asyncio.Queue(maxsize=100)
    client_out_queue = asyncio.Queue(maxsize=100)
    tasks = []

    try:
        async with client.aio.live.connect(model=MODEL, config=CONFIG) as session:
            logger.info(f"✅ SESSION OPEN: Connected to {MODEL}")

            async def receive_from_client():
                nonlocal client_packets_in
                try:
                    while True:
                        message = await asyncio.to_thread(ws.receive)
                        if message is None:
                            logger.warning("🔌 Client WebSocket closed.")
                            break
                        
                        data = json.loads(message)
                        audio_raw = None

                        # Check various potential keys for audio
                        if "realtime_input" in data:
                            for chunk in data["realtime_input"].get("media_chunks", []):
                                if chunk.get("mime_type") == "audio/pcm":
                                    audio_raw = base64.b64decode(chunk["data"])
                        elif "audio" in data:
                            audio_raw = base64.b64decode(data["audio"])
                        elif "text" in data:
                            logger.info(f"⌨️  Client Sent Text: {data['text']}")
                            await gemini_in_queue.put({"text": data["text"]})

                        if audio_raw:
                            client_packets_in += 1
                            if client_packets_in % 50 == 0:
                                logger.info(f"🎤 [Inbound] Received {client_packets_in} audio packets from client...")
                            await gemini_in_queue.put({"data": audio_raw, "mime_type": "audio/pcm"})

                except Exception as e:
                    logger.error(f"❌ Error in receive_from_client: {e}")
                    raise

            async def send_to_gemini():
                nonlocal gemini_packets_out
                try:
                    while True:
                        msg = await gemini_in_queue.get()
                        if msg is None: break

                        if "text" in msg:
                            await session.send(input=msg["text"], end_of_turn=True)
                        else:
                            # Using dictionary format for maximum SDK compatibility
                            await session.send(input={
                                "data": msg["data"],
                                "mime_type": msg["mime_type"]
                            })
                            gemini_packets_out += 1
                            if gemini_packets_out % 50 == 0:
                                logger.info(f"📤 [To Gemini] Forwarded {gemini_packets_out} packets to API...")
                        
                        gemini_in_queue.task_done()
                except Exception as e:
                    logger.error(f"❌ Error in send_to_gemini: {e}")
                    raise

            async def receive_from_gemini():
                nonlocal gemini_packets_in
                try:
                    async for response in session.receive():
                        # Debug exactly what Gemini is sending back
                        if response.server_content:
                            model_turn = response.server_content.model_turn
                            if model_turn:
                                for part in model_turn.parts:
                                    if part.text:
                                        logger.info(f"🤖 Gemini Text: {part.text}")
                                        await client_out_queue.put({"text": part.text})
                                    if part.inline_data:
                                        gemini_packets_in += 1
                                        if gemini_packets_in % 20 == 0:
                                            logger.info(f"🔊 [From Gemini] Receiving audio stream ({gemini_packets_in} chunks)...")
                                        
                                        b64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                        await client_out_queue.put({
                                            "audio": b64_audio,
                                            "mime_type": part.inline_data.mime_type
                                        })
                        elif response.tool_call:
                            logger.info(f"🛠️  Gemini requested Tool: {response.tool_call}")
                except Exception as e:
                    logger.error(f"❌ Error in receive_from_gemini: {e}")
                    raise

            async def send_to_client():
                nonlocal client_packets_out
                try:
                    while True:
                        data = await client_out_queue.get()
                        await asyncio.to_thread(ws.send, json.dumps(data))
                        client_packets_out += 1
                        client_out_queue.task_done()
                except Exception as e:
                    logger.error(f"❌ Error in send_to_client: {e}")
                    raise

            # Start all tasks concurrently
            tasks = [
                asyncio.create_task(receive_from_client()),
                asyncio.create_task(send_to_gemini()),
                asyncio.create_task(receive_from_gemini()),
                asyncio.create_task(send_to_client())
            ]
            await asyncio.gather(*tasks)

    except Exception as e:
        logger.error(f"💥 Session Fatal Error: {e}")
        traceback.print_exc()
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        logger.info("🏁 Session Closed.")

def handle_live_chat_connection(ws):
    try:
        asyncio.run(gemini_session_handler(ws))
    except Exception as e:
        logger.error(f"Handler failed: {e}")