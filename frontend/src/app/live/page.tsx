"use client";

import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Activity } from "lucide-react";

export default function LiveChatPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [status, setStatus] = useState("disconnected"); // disconnected, connecting, connected, error

  // Refs for persistent objects across renders
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:5000";
  const WS_URL = ML_API_URL.replace("http", "ws") + "/api/live/chat";

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    try {
      setStatus("connecting");
      
      // 1. Get User Media (Audio + Video)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
        }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 2. Setup Audio Context & Processor
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // Mute local feedback

      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // 3. Connect WebSocket
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to Backend");
        setStatus("connected");
        setIsConnected(true);
        ws.send(JSON.stringify({ text: "Client Connected - Video Consultation Started" }));

        // Start Video Capture Loop (1 frame per second)
        videoIntervalRef.current = setInterval(() => {
            captureAndSendFrame();
        }, 1000);
      };

      ws.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.error) {
                console.error("Backend Error:", data.error);
                setStatus("error");
                stopSession();
                alert("Session Error: " + data.error);
                return;
            }

            if (data.text) {
                console.log("Gemini Text:", data.text);
            }
            
            if (data.audio) {
                await playAudioChunk(data.audio);
            }
        } catch (e) {
            console.error("Error parsing message", e);
        }
      };

      ws.onclose = () => {
        console.log("Disconnected from Backend");
        stopSession();
      };

      ws.onerror = (e) => {
        console.error("WebSocket Error", e);
        setStatus("error");
      };

      // 4. Audio Processing Loop
      let frameCount = 0;
      processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        
        frameCount++;

        if (!isMicOn) {
            ws.send(JSON.stringify({ silence: true }));
            return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        if (rms < 0.015) {
            ws.send(JSON.stringify({ silence: true }));
            return;
        }
        
        const gain = 2.0; 
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i] * gain));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const base64Audio = arrayBufferToBase64(pcmData.buffer);
        ws.send(JSON.stringify({ audio: base64Audio }));
      };

    } catch (err) {
      console.error("Failed to start session:", err);
      setStatus("error");
    }
  };

  const captureAndSendFrame = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isVideoOn) return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context && video.videoWidth > 0) {
        // Draw video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to low-quality JPEG to save bandwidth
        const jpegData = canvas.toDataURL('image/jpeg', 0.5);
        const base64Image = jpegData.split(',')[1];

        wsRef.current.send(JSON.stringify({
            image: base64Image
        }));
    }
  };

  const stopSession = () => {
    setStatus("disconnected");
    setIsConnected(false);

    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }

    if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current && audioContextRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    nextStartTimeRef.current = 0;
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    try {
        const audioCtx = audioContextRef.current;
        const binaryString = window.atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);
        
        for (let i = 0; i < int16Data.length; i++) {
            const int = int16Data[i];
            float32Data[i] = int >= 0 ? int / 0x7FFF : int / 0x8000;
        }

        const buffer = audioCtx.createBuffer(1, float32Data.length, 24000); 
        buffer.getChannelData(0).set(float32Data);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);

        let startTime = nextStartTimeRef.current;
        if (startTime < audioCtx.currentTime) {
            startTime = audioCtx.currentTime;
        }
        
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;

    } catch (e) {
        console.error("Error playing audio chunk", e);
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const toggleMic = () => {
    if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => track.enabled = !isMicOn);
        setIsMicOn(!isMicOn);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoOn);
        setIsVideoOn(!isVideoOn);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" />
                        HealthMate Live Consultation
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        AI-Powered Video & Voice Assessment
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    status === 'connected' ? 'bg-green-100 text-green-800' :
                    status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                    status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                    {status.toUpperCase()}
                </div>
            </div>

            {/* Main Interaction Area */}
            <div className="flex flex-col md:flex-row bg-gray-100 dark:bg-gray-900 min-h-[450px]">
                
                {/* Video Feed */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
                    {isVideoOn && isConnected ? (
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-center">
                            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <VideoOff className="w-10 h-10 text-gray-500" />
                            </div>
                            <p className="text-gray-500 font-medium">Camera is Off</p>
                        </div>
                    )}
                    
                    {/* Visualizer Overlay */}
                    {isConnected && (
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
                            <div className="flex gap-1 items-end h-4">
                                <div className="w-1 bg-blue-500 animate-pulse h-2"></div>
                                <div className="w-1 bg-blue-500 animate-pulse h-4" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1 bg-blue-500 animate-pulse h-3" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-xs text-white font-medium">Live Feed</span>
                        </div>
                    )}
                </div>

                {/* AI Status / Information */}
                <div className="w-full md:w-80 p-8 flex flex-col items-center justify-center bg-white dark:bg-gray-800">
                    {status === 'connected' ? (
                        <div className="text-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg relative z-10 mx-auto">
                                    <Activity className="w-10 h-10 text-white" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">HealthMate AI</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                I can see and hear you now. How can I help you today?
                            </p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-gray-400 text-sm">
                                Start session to begin your AI consultation
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex justify-center items-center gap-6">
                
                {!isConnected ? (
                    <button 
                        onClick={startSession}
                        disabled={status === 'connecting'}
                        className="px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full font-bold shadow-lg transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                    >
                        <Activity className="w-5 h-5" />
                        {status === 'connecting' ? 'Initializing...' : 'Start Consultation'}
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={toggleMic}
                            className={`p-5 rounded-full transition-all shadow-md ${isMicOn ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900' : 'bg-red-100 text-red-600 ring-2 ring-red-100 dark:ring-red-900'}`}
                            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                        >
                            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                        </button>

                        <button 
                            onClick={toggleVideo}
                            className={`p-5 rounded-full transition-all shadow-md ${isVideoOn ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900' : 'bg-red-100 text-red-600 ring-2 ring-red-100 dark:ring-red-900'}`}
                            title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
                        >
                            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                        </button>

                        <button 
                            onClick={stopSession}
                            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-lg transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                        >
                            <PhoneOff className="w-5 h-5" />
                            End Consultation
                        </button>
                    </>
                )}
            </div>
            
            {/* Hidden Canvas for Frame Capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>
    </div>
  );
}