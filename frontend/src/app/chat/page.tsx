"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Trash2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Heart,
  Mic,
  Paperclip,
  X,
  Image as ImageIcon,
  ArrowUp,
  Plus,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import toast from "react-hot-toast";
import { useAuthGuard } from "@/lib/use-auth-guard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  timestamp: Date;
  liked?: boolean;
  disliked?: boolean;
}

const suggestedQuestions = [
  { text: "Early symptoms of diabetes?", icon: "🩺" },
  { text: "Improve sleep quality", icon: "💤" },
  { text: "Heart-healthy foods", icon: "❤️" },
  { text: "Daily exercise needs", icon: "🏃" },
  { text: "Signs of dehydration", icon: "💧" },
  { text: "Reduce stress naturally", icon: "🌿" },
];

export default function ChatPage() {
  const isAuthorized = useAuthGuard();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size too large. Please upload an image under 5MB.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file.");
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  if (!isAuthorized) return null;

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async (content: string = input) => {
    if ((!content.trim() && !selectedFile) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      imageUrl: previewUrl || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    
    setIsLoading(true);

    // Keep file for API but clear UI state if needed
    // We'll keep the previewUrl in the message, so we can clear the input state
    const fileToSend = selectedFile;
    removeFile(); 

    try {
      let response;
      
      if (fileToSend) {
        const formData = new FormData();
        formData.append("message", content.trim() || "Analyze this image");
        formData.append("file", fileToSend);
        formData.append("session_id", "default");
        formData.append("use_rag", "true");
        
        response = await fetch("http://localhost:5000/api/chat", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("http://localhost:5000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content.trim(), session_id: "default", use_rag: true }),
        });
      }

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        toast.error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error(error);
      toast.error("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const likeMessage = (id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, liked: !m.liked, disliked: false } : m
      )
    );
  };

  const dislikeMessage = (id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, disliked: !m.disliked, liked: false } : m
      )
    );
  };

  const regenerateResponse = async () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      // Remove last assistant message(s) if any
      setMessages((prev) => {
        const lastUserIndex = prev.map(m => m.id).lastIndexOf(lastUserMessage.id);
        return prev.slice(0, lastUserIndex + 1);
      });
      sendMessage(lastUserMessage.content);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 font-sans">
      <Navbar />

      <main className="flex-1 flex flex-col pt-16 relative overflow-hidden">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          <div className="max-w-3xl mx-auto px-4 py-6 w-full">
            {messages.length === 0 ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Hi, I&apos;m HealthMate Medical AI
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg">
                    I can access authoritative medical textbooks to answer your questions with evidence-based information.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(q.text)}
                      className="flex items-center gap-3 p-4 text-left bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{q.icon}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {q.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-1">
                      {message.role === "assistant" ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-sm">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div
                      className={`group relative max-w-[85%] sm:max-w-[75%] px-5 py-4 rounded-2xl shadow-sm ${
                        message.role === "user"
                          ? "bg-primary-600 text-white rounded-tr-sm"
                          : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-tl-sm"
                      }`}
                    >
                      {message.imageUrl && (
                        <div className="mb-3">
                          <img
                            src={message.imageUrl}
                            alt="Uploaded"
                            className="max-w-full rounded-lg max-h-64 object-cover border border-white/20"
                          />
                        </div>
                      )}
                      
                      {message.role === "assistant" ? (
                        <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      )}

                      {/* Assistant Actions */}
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            title="Copy"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => likeMessage(message.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              message.liked
                                ? "text-green-500"
                                : "text-slate-400 hover:text-green-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button
                            onClick={() => dislikeMessage(message.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              message.disliked
                                ? "text-red-500"
                                : "text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800/90 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="w-full bg-transparent p-4 sticky bottom-0 z-10">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex flex-col gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 focus-within:border-primary-500/30 transition-all shadow-lg shadow-slate-200/40 dark:shadow-slate-950/30">
              
              {/* File Preview */}
              {previewUrl && (
                <div className="relative mx-2 mt-2 w-fit">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-16 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    onClick={removeFile}
                    className="absolute -top-1.5 -right-1.5 bg-slate-500 hover:bg-red-500 text-white rounded-full p-0.5 shadow-md transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 px-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-primary-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-full transition-colors mb-1"
                  title="Upload image"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask HealthMate..."
                  className="flex-1 max-h-[200px] py-3 bg-transparent border-0 focus:ring-0 resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed"
                  rows={1}
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={(!input.trim() && !selectedFile) || isLoading}
                  className={`p-2 rounded-xl mb-1 transition-all ${
                    (!input.trim() && !selectedFile) || isLoading
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-400"
                      : "bg-primary-500 text-white hover:bg-primary-600 shadow-md hover:shadow-lg"
                  }`}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
            
            <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2">
              HealthMate AI can make mistakes. Please consult a professional for medical advice.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
