import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import BottomNav from "../components/BottomNav";
import type { Message, EmotionState } from "../types";
import { Send, Brain, Sparkles, Settings, ChevronLeft, Zap, CheckCheck, Paperclip, X, FileText, Image, ChevronDown, Lightbulb } from "lucide-react";

interface UploadedFile {
  name: string;
  type: string;
  content: string;
  isImage: boolean;
}

/* Ambient glow */
function ChatAmbient() {
  const { companion } = useStore();
  const mood = companion?.current_emotion?.mood || "calm";
  const intensity = companion?.current_emotion?.intensity || 0.4;
  const colors: Record<string, string> = {
    calm: "#FFB6C1", focused: "#FF69B4", joyful: "#FF1493", longing: "#C71585",
    desire: "#FF0000", melancholy: "#8B008B", protective: "#FF6B9D",
  };
  const c = colors[mood] || "#FFB6C1";
  const dur = 3 + (1 - intensity) * 4;
  const hexOp = (o: number) => Math.round(o * 255).toString(16).padStart(2, "0");
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[50%] rounded-[100%]"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${c}${hexOp(0.06 + intensity * 0.08)} 0%, transparent 70%)`, animation: `ambientBreathe ${dur}s ease-in-out infinite`, filter: "blur(60px)" }}></div>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full"
        style={{ background: `radial-gradient(circle, ${c}${hexOp(0.02 + intensity * 0.03)} 0%, transparent 60%)`, animation: `ambientBreathe ${dur * 1.3}s ease-in-out infinite reverse`, filter: "blur(40px)" }}></div>
    </div>
  );
}

/* Thinking panel - collapsible */
function ThinkingPanel({ thinking, isStreaming }: { thinking: string; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!thinking && !isStreaming) return null;

  return (
    <div className="mb-1.5 ml-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-white/20 hover:text-[#FF1493]/60 transition-colors py-0.5"
      >
        {isStreaming ? (
          <>
            <div className="flex items-center gap-[2px]">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-[3px] h-[3px] rounded-full bg-[#FF1493]/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}></motion.div>
              ))}
            </div>
            <span>思考中...</span>
          </>
        ) : (
          <>
            <Lightbulb className="w-2.5 h-2.5" />
            <span>思考过程</span>
          </>
        )}
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-2.5 h-2.5" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && thinking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white/3 border border-white/5 rounded-lg px-2.5 py-1.5 max-h-[120px] overflow-y-auto">
              <p className="text-[9px] text-white/20 leading-relaxed whitespace-pre-wrap">{thinking}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* File chip */
function FileChip({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#FF1493]/10 border border-[#FF1493]/20 rounded-lg px-2 py-1 text-[10px] text-[#FF1493]">
      {file.type.startsWith("image/") ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      <span className="max-w-[100px] truncate">{file.name}</span>
      <button onClick={onRemove} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
    </div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, companion, messages, addMessage, removeMessage, setMessages, updateFromEmotion } = useStore();
  const { lang, setLang, t } = useLang();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmotion, setShowEmotion] = useState(false);
  const [ghostMessage, setGhostMessage] = useState<string | null>(null);
  const [chatError, setChatError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, streamingText, isTyping]);

  // Load messages
  useEffect(() => {
    if (!companion || !user || messages.length > 0) return;
    const load = async () => {
      try {
        const { data } = await supabase.from("messages").select("*").eq("companion_id", companion.id).order("created_at", { ascending: true }).limit(100);
        if (data && data.length > 0) setMessages(data);
        else {
          const welcome: Message = {
            id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
            content: lang === "zh" ? `你好，我是${companion.name}。` : `Hi, I'm ${companion.name}.`,
            role: "companion", emotion_state: { mood: "calm", intensity: 0.4, valence: 0.6, arousal: 0.3 },
            created_at: new Date().toISOString(),
          };
          setMessages([welcome]);
        }
      } catch {
        const welcome: Message = {
          id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
          content: lang === "zh" ? `你好，我是${companion.name}。` : `Hi, I'm ${companion.name}.`,
          role: "companion", emotion_state: { mood: "calm", intensity: 0.4, valence: 0.6, arousal: 0.3 },
          created_at: new Date().toISOString(),
        };
        setMessages([welcome]);
      }
      try {
        const { data: proactive } = await supabase.from("proactive_messages").select("*")
          .eq("user_id", user.id).eq("companion_id", companion.id).eq("is_read", false).order("created_at", { ascending: true });
        if (proactive && proactive.length > 0) {
          setGhostMessage(proactive[proactive.length - 1].content);
          await supabase.from("proactive_messages").update({ is_read: true }).eq("id", proactive[proactive.length - 1].id);
        }
      } catch { /* ignore */ }
    };
    load();
  }, [companion, user]);

  // File upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) continue;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setUploadedFiles(prev => [...prev, { name: file.name, type: file.type, content: reader.result as string, isImage: true }]);
        reader.readAsDataURL(file);
      } else if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        const text = await file.text();
        setUploadedFiles(prev => [...prev, { name: file.name, type: file.type, content: text.slice(0, 3000), isImage: false }]);
      }
    }
    e.target.value = "";
  }, []);

  // SSE Streaming handler
  const streamChat = async (userMsg: Message): Promise<{ response: string; thinking: string; emotion: EmotionState } | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token || !companion) return null;

    let fileContext = "";
    const textFiles = uploadedFiles.filter(f => !f.isImage);
    if (textFiles.length > 0) {
      fileContext = textFiles.map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n");
    }

    const payload = {
      message: userMsg.content,
      companionId: companion.id,
      companionName: companion.name,
      companionGender: companion.gender || "female",
      personalityDesc: companion.personality_desc,
      history: messages.slice(-10).map(m => ({ role: m.role === "companion" ? "assistant" : "user", content: m.content })),
      lang,
      fileContext: fileContext || undefined,
    };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        console.warn("[Chat] EF failed:", res.status);
        return null;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let fullThinking = "";
      let finalEmotion: EmotionState = { mood: "focused", intensity: 0.4, valence: 0.5, arousal: 0.4 };

      setIsStreaming(true);
      setStreamingText("");
      setStreamingThinking("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || !line.startsWith("event: ")) continue;
          const eventType = line.slice(7);
          const dataLine = lines[++i]?.trim();
          if (!dataLine || !dataLine.startsWith("data: ")) continue;
          const jsonStr = dataLine.slice(6);

          if (eventType === "content") {
            try {
              const d = JSON.parse(jsonStr);
              fullContent += d.text || "";
              setStreamingText(fullContent);
            } catch { /* ignore */ }
          } else if (eventType === "thinking") {
            try {
              const d = JSON.parse(jsonStr);
              fullThinking += d.text || "";
              setStreamingThinking(fullThinking);
            } catch { /* ignore */ }
          } else if (eventType === "error") {
            try {
              const d = JSON.parse(jsonStr);
              console.error("[Chat] Server error:", d.error);
              throw new Error(d.error || "AI 服务错误");
            } catch { throw new Error("AI 服务错误"); }
          } else if (eventType === "done") {
            try {
              const d = JSON.parse(jsonStr);
              if (d.emotion) finalEmotion = d.emotion;
              fullContent = d.response || fullContent;
              fullThinking = d.thinking || fullThinking;
            } catch { /* ignore */ }
          }
        }
      }

      return { response: fullContent, thinking: fullThinking, emotion: finalEmotion };
    } catch (e: any) {
      if (e.name !== "AbortError") console.warn("[Chat] stream error:", e.message);
      setChatError(e.message || "连接失败，请重试");
      return null;
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      setStreamingThinking("");
      abortRef.current = null;
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !companion || !user || isTyping || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
      content: input.trim(), role: "user", created_at: new Date().toISOString(),
    };
    addMessage(userMsg);
    setInput("");
    setIsTyping(true);
    setChatError("");
    if (ghostMessage) setGhostMessage(null);

    let responseText = "";
    let emotion: EmotionState = { mood: "calm", intensity: 0.4, valence: 0.5, arousal: 0.4 };

    const result = await streamChat(userMsg);
    setUploadedFiles([]);
    setIsTyping(false);

    if (result) {
      responseText = result.response;
      emotion = result.emotion;
      const companionMsg: Message = {
        id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
        content: responseText, role: "companion", emotion_state: emotion,
        created_at: new Date().toISOString(),
      };
      addMessage(companionMsg);
      updateFromEmotion(emotion);
      // DB 写入已由 Edge Function 完成，前端不再重复插入（解决双写问题）
    } else {
      // 发送失败：从本地 UI 移除 user 消息，避免"刷新后消失"的幻觉
      removeMessage(userMsg.id);
      setChatError(lang === "zh" ? "连接失败了，再试一次吧..." : "Connection failed. Please try again...");
    }
  }, [input, companion, user, isTyping, isStreaming, messages, addMessage, removeMessage, updateFromEmotion, lang, ghostMessage, uploadedFiles]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const currentEmotion = [...messages].reverse().find((m: Message) => m.role === "companion" && m.emotion_state)?.emotion_state;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-black">
      <ChatAmbient />

      {/* Header */}
      <div className="shrink-0 glass-dark border-b border-white/5 px-4 py-2.5 z-20">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate("/home")} className="text-white/40 hover:text-white/80 p-1 -ml-1"><ChevronLeft className="w-5 h-5" /></button>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-[#FF1493]/15 border border-[#FF1493]/30 flex items-center justify-center overflow-hidden">
                {companion?.avatar_url ? <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" /> : <img src="/platonic-logo.png" alt="" className="w-3.5 h-3.5 object-contain" />}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#FF1493] rounded-full border-2 border-black animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-sm font-medium">{companion?.name}</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-white/35">{(isTyping || isStreaming) ? t("typing") : t("online")}</span>
                {currentEmotion && <button onClick={() => setShowEmotion(!showEmotion)} className="text-[9px] text-[#FF1493]/50 hover:text-[#FF1493] flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{currentEmotion.mood}</button>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="flex items-center gap-1 text-[10px] mr-2">
              <button onClick={() => setLang("zh")} className={`px-1.5 py-0.5 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
              <span className="text-white/10">/</span>
              <button onClick={() => setLang("en")} className={`px-1.5 py-0.5 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
            </div>
            <button onClick={() => navigate("/memory")} className="p-1.5 text-white/25 hover:text-[#FF1493] transition-colors"><Brain className="w-3.5 h-3.5" /></button>
            <button onClick={() => navigate("/bond")} className="p-1.5 text-white/25 hover:text-[#FF1493] transition-colors"><Sparkles className="w-3.5 h-3.5" /></button>
            <button onClick={() => navigate("/settings")} className="p-1.5 text-white/25 hover:text-[#FF1493] transition-colors"><Settings className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Emotion panel */}
      <AnimatePresence>
        {showEmotion && currentEmotion && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="shrink-0 glass-dark border-b border-white/5 px-4 py-1.5 overflow-hidden z-10">
            <div className="flex items-center gap-4 text-[10px] text-white/35 max-w-3xl mx-auto">
              <span>{t("emotion")}: <span className="text-[#FF1493]">{currentEmotion.mood}</span></span>
              <span>{t("intensity")}: {Math.round(currentEmotion.intensity * 100)}%</span>
              <span>{t("valence")}: {Math.round(currentEmotion.valence * 100)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat error banner */}
      <AnimatePresence>
        {chatError && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="shrink-0 glass-dark border-b border-red-500/20 px-4 py-2 z-20">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              <p className="text-red-400 text-[11px]">{chatError}</p>
              <button onClick={() => setChatError("")} className="text-red-400/50 hover:text-red-400 text-[10px]">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 z-10">
        {messages.map((msg, idx) => {
          const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString();
          const isFirst = idx === 0 || messages[idx - 1].role !== msg.role;
          const isLast = idx === messages.length - 1 || messages[idx + 1].role !== msg.role;
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center my-3">
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/8">
                    <span className="text-[9px] text-white/20">{new Date(msg.created_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", weekday: "short" })}</span>
                  </div>
                </div>
              )}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.role === "companion" && isFirst && (
                  <span className="text-[8px] text-white/15 mb-0.5 ml-1">{companion?.name}</span>
                )}
                <div className={`relative px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-[#FF1493]/12 border border-[#FF1493]/18 text-white rounded-2xl rounded-tr-sm"
                    : "glass-dark border border-white/6 text-white/85 rounded-2xl rounded-tl-sm"
                }`}>
                  {msg.role === "companion" && msg.emotion_state && (
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-1 h-1 rounded-full animate-pulse"
                        style={{ background: msg.emotion_state.mood === "desire" ? "#FF0000" : msg.emotion_state.mood === "joyful" ? "#FF1493" : msg.emotion_state.mood === "melancholy" ? "#8B008B" : "#FFB6C1" }}></div>
                      <span className="text-[7px] text-white/15">{msg.emotion_state.mood}</span>
                    </div>
                  )}
                  <p className="text-[12px] leading-relaxed font-light whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${msg.role === "user" ? "mr-1" : "ml-1"}`}>
                  <span className="text-[7px] text-white/10">{new Date(msg.created_at).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  {msg.role === "user" && isLast && <CheckCheck className="w-2.5 h-2.5 text-[#FF1493]/30" />}
                </div>
              </div>
            </motion.div>
            </div>
          );
        })}

        {/* Streaming message bubble */}
        {(isStreaming || streamingText) && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="flex flex-col items-start max-w-[80%]">
              <ThinkingPanel thinking={streamingThinking} isStreaming={isStreaming && !!streamingThinking} />
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-[#FF1493]/15 border border-[#FF1493]/30 flex items-center justify-center overflow-hidden shrink-0">
                  {companion?.avatar_url ? <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" /> : <img src="/platonic-logo.png" alt="" className="w-3 h-3 object-contain" />}
                </div>
                <div className="glass-dark rounded-2xl px-3.5 py-2.5 border border-white/6 rounded-tl-sm min-w-[60px]">
                  <p className="text-[12px] leading-relaxed font-light whitespace-pre-wrap">
                    {streamingText}
                    {isStreaming && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-[2px] h-[12px] bg-[#FF1493]/60 ml-[1px] align-middle"
                      />
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Typing indicator (only when not streaming) */}
        {isTyping && !isStreaming && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-[#FF1493]/15 border border-[#FF1493]/30 flex items-center justify-center overflow-hidden shrink-0">
                {companion?.avatar_url ? <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" /> : <img src="/platonic-logo.png" alt="" className="w-3 h-3 object-contain" />}
              </div>
              <div className="glass-dark rounded-2xl px-4 py-2.5 border border-white/6 rounded-tl-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[#FF1493]/5 animate-pulse" />
                <div className="relative flex items-center gap-1.5">
                  <div className="flex items-center gap-[3px]">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-[5px] h-[5px] rounded-full bg-[#FF1493]"
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }} />
                    ))}
                  </div>
                  <span className="text-white/25 text-[10px] ml-1 tracking-wide">{t("typing")}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Ghost message */}
        <AnimatePresence>
          {ghostMessage && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.8, ease: "easeOut" }} className="flex justify-center my-4">
              <div className="relative px-5 py-3 border border-[#FF1493]/30 rounded-2xl bg-[#FF1493]/5 backdrop-blur-md max-w-[85%]">
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF1493] rounded-full animate-pulse" />
                <p className="text-[12px] text-[#FF1493]/80 font-light leading-relaxed">{ghostMessage}</p>
                <p className="text-[8px] text-[#FF1493]/30 mt-1.5 text-right">{lang === "zh" ? companion?.name + " " + t("ghostLabel") : "From " + companion?.name}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="shrink-0 px-3 pt-1.5 z-20">
          <div className="flex flex-wrap gap-1.5 max-w-3xl mx-auto">
            {uploadedFiles.map((f, i) => (
              <FileChip key={i} file={f} onRemove={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} />
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`shrink-0 glass-dark border-t border-white/5 px-3 py-2.5 z-20 transition-all duration-300 ${inputFocused ? "border-[#FF1493]/20" : ""}`}>
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <input ref={fileInputRef} type="file" accept="image/*,.txt,.md" multiple className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-xl border transition-all shrink-0 ${uploadedFiles.length > 0 ? "bg-[#FF1493]/15 border-[#FF1493]/30 text-[#FF1493]" : "bg-white/5 border-white/10 text-white/25 hover:text-[#FF1493] hover:border-[#FF1493]/20"}`}>
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
            placeholder={lang === "zh" ? `对${companion?.name || "TA"}说点什么...` : `Say something to ${companion?.name || "them"}...`}
            rows={1} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-white/12 focus:outline-none focus:border-[#FF1493]/35 transition-all resize-none" style={{ minHeight: "36px", maxHeight: "80px" }} />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSend}
            disabled={!input.trim() || isTyping || isStreaming}
            className="p-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] hover:bg-[#FF1493]/30 transition-all disabled:opacity-20 shrink-0">
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
