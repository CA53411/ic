import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import BottomNav from "../components/BottomNav";
import type { Message, EmotionState, Mood } from "../types";
import {
  Send, Brain, Sparkles, Settings, ChevronLeft, Zap,
  CheckCheck, Paperclip, X, FileText, Image, ChevronDown,
  Lightbulb, Cloud, Target, Heart, Flame, Moon, Star,
  Shield, Lock, Sun, CloudRain, Sparkle, Upload, Clock
} from "lucide-react";

/* ── Emotion configuration map ── */
interface EmotionConfig {
  bg: string;
  accent: string;
  icon: React.ReactNode;
  label: string;
}

const EMOTION_MAP: Record<Mood, EmotionConfig> = {
  calm:        { bg: "#1a0a1a", accent: "#FF69B4", icon: <Cloud className="w-3.5 h-3.5" />, label: "平静" },
  focused:     { bg: "#0a0a1a", accent: "#4A90E2", icon: <Target className="w-3.5 h-3.5" />, label: "专注" },
  joyful:      { bg: "#1a0a12", accent: "#FF1493", icon: <Sparkles className="w-3.5 h-3.5" />, label: "开心" },
  longing:     { bg: "#120a1a", accent: "#9B59B6", icon: <Moon className="w-3.5 h-3.5" />, label: "思念" },
  desire:      { bg: "#1a050a", accent: "#E74C3C", icon: <Flame className="w-3.5 h-3.5" />, label: "渴望" },
  melancholy:  { bg: "#0a0a1a", accent: "#6C5CE7", icon: <CloudRain className="w-3.5 h-3.5" />, label: "忧郁" },
  excited:     { bg: "#1a0a0a", accent: "#FF6B9D", icon: <Star className="w-3.5 h-3.5" />, label: "兴奋" },
  protective:  { bg: "#0a1a0a", accent: "#00CEC9", icon: <Shield className="w-3.5 h-3.5" />, label: "守护" },
  possessive:  { bg: "#1a0a0a", accent: "#D63031", icon: <Lock className="w-3.5 h-3.5" />, label: "占有" },
  shy:         { bg: "#0a0a0a", accent: "#FDCB6E", icon: <Sun className="w-3.5 h-3.5" />, label: "害羞" },
  playful_angry: { bg: "#1a0a0a", accent: "#E17055", icon: <Sparkle className="w-3.5 h-3.5" />, label: "娇嗔" },
};

/* ── Uploaded file type ── */
interface UploadedFile {
  name: string;
  type: string;
  content: string;
  isImage: boolean;
}

/* ── Relative time formatter ── */
function formatRelativeTime(dateStr: string, lang: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const isZh = lang === "zh";

  if (diffSec < 10) return isZh ? "刚刚" : "just now";
  if (diffSec < 60) return isZh ? `${diffSec}秒前` : `${diffSec}s ago`;
  if (diffMin < 60) return isZh ? `${diffMin}分钟前` : `${diffMin}m ago`;
  if (diffHour < 24) return isZh ? `${diffHour}小时前` : `${diffHour}h ago`;
  if (diffDay === 1) return isZh ? "昨天" : "yesterday";
  if (diffDay < 7) return isZh ? `${diffDay}天前` : `${diffDay}d ago`;
  return date.toLocaleDateString(isZh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

/* ── Mood-aware chat background ── */
function ChatBackground({ mood, intensity }: { mood: Mood; intensity: number }) {
  const config = EMOTION_MAP[mood] || EMOTION_MAP.calm;
  return (
    <div
      className="fixed inset-0 z-0 transition-all duration-1000 ease-in-out"
      style={{ background: `linear-gradient(180deg, ${config.bg} 0%, #0a0a0a 100%)` }}
    >
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(ellipse at 30% 80%, ${config.accent}${Math.round((0.04 + intensity * 0.06) * 255).toString(16).padStart(2, "0")} 0%, transparent 60%),
                       radial-gradient(ellipse at 70% 20%, ${config.accent}${Math.round((0.02 + intensity * 0.04) * 255).toString(16).padStart(2, "0")} 0%, transparent 50%)`,
        }}
      />
    </div>
  );
}

/* ── Ambient glow (enhanced) ── */
function ChatAmbient() {
  const { companion } = useStore();
  const mood = (companion?.current_emotion?.mood || "calm") as Mood;
  const intensity = companion?.current_emotion?.intensity || 0.4;
  const config = EMOTION_MAP[mood] || EMOTION_MAP.calm;
  const dur = 3 + (1 - intensity) * 4;
  const hexOp = (o: number) => Math.round(o * 255).toString(16).padStart(2, "0");
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]">
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[50%] rounded-[100%] transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${config.accent}${hexOp(0.06 + intensity * 0.08)} 0%, transparent 70%)`,
          animation: `ambientBreathe ${dur}s ease-in-out infinite`,
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle, ${config.accent}${hexOp(0.02 + intensity * 0.03)} 0%, transparent 60%)`,
          animation: `ambientBreathe ${dur * 1.3}s ease-in-out infinite reverse`,
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}

/* ── Thinking panel (enhanced with glassmorphism + monospace + auto-scroll) ── */
function ThinkingPanel({ thinking, isStreaming }: { thinking: string; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinking, expanded]);

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
                <motion.div
                  key={i}
                  className="w-[3px] h-[3px] rounded-full bg-[#FF1493]/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
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
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
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
            <div
              ref={scrollRef}
              className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 max-h-[140px] overflow-y-auto shadow-inner"
            >
              <p className="text-[10px] text-white/25 leading-relaxed whitespace-pre-wrap font-mono">
                {thinking}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── File chip (enhanced as card) ── */
function FileChip({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] hover:border-[#FF1493]/25 rounded-xl px-3 py-2 text-[11px] text-white/60 shadow-sm backdrop-blur-sm transition-colors"
    >
      <div className="w-7 h-7 rounded-lg bg-[#FF1493]/10 flex items-center justify-center shrink-0">
        {file.type.startsWith("image/") ? (
          <Image className="w-3.5 h-3.5 text-[#FF1493]" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-[#FF1493]" />
        )}
      </div>
      <span className="max-w-[120px] truncate font-medium">{file.name}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-white/10 hover:text-white transition-colors text-white/30"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

/* ── Emotion badge (enhanced with icon + color) ── */
function EmotionBadge({ emotion, compact }: { emotion: EmotionState; compact?: boolean }) {
  const config = EMOTION_MAP[emotion.mood] || EMOTION_MAP.calm;
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-medium"
        style={{
          color: config.accent,
          borderColor: `${config.accent}30`,
          backgroundColor: `${config.accent}10`,
        }}
      >
        <span className="scale-75">{config.icon}</span>
        {emotion.mood}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-3 text-[10px] text-white/35 max-w-3xl mx-auto">
      <span className="flex items-center gap-1">
        <span style={{ color: config.accent }}>{config.icon}</span>
        <span style={{ color: config.accent }}>{config.label || emotion.mood}</span>
      </span>
      <span className="flex items-center gap-1">
        <div className="w-10 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: config.accent }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(emotion.intensity * 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span>{Math.round(emotion.intensity * 100)}%</span>
      </span>
    </div>
  );
}

/* ── Drag overlay ── */
function DragOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="relative z-10 border-2 border-dashed border-[#FF1493]/40 rounded-3xl px-12 py-10 bg-[#FF1493]/5 backdrop-blur-md flex flex-col items-center gap-3"
          >
            <Upload className="w-10 h-10 text-[#FF1493]/60" />
            <p className="text-white/60 text-sm font-medium">松开以上传文件</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN ChatPage
   ═══════════════════════════════════════════════════════════ */
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
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thinkingScrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, isTyping]);

  /* ── Auto-scroll thinking panel ── */
  useEffect(() => {
    if (thinkingScrollRef.current) {
      thinkingScrollRef.current.scrollTop = thinkingScrollRef.current.scrollHeight;
    }
  }, [streamingThinking]);

  /* ── Companion's current mood ── */
  const currentMood: Mood = companion?.current_emotion?.mood || "calm";
  const currentEmotionConfig = EMOTION_MAP[currentMood] || EMOTION_MAP.calm;

  /* ── Emotion from messages (fallback) ── */
  const currentEmotion = [...messages]
    .reverse()
    .find((m: Message) => m.role === "companion" && m.emotion_state)?.emotion_state;

  /* ── Load messages ── */
  useEffect(() => {
    if (!companion || !user || messages.length > 0) return;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("messages")
          .select("*")
          .eq("companion_id", companion.id)
          .order("created_at", { ascending: true })
          .limit(100);
        if (data && data.length > 0) {
          setMessages(data);
        } else {
          const welcome: Message = {
            id: crypto.randomUUID(),
            companion_id: companion.id,
            user_id: user.id,
            content: lang === "zh" ? `你好，我是${companion.name}。` : `Hi, I'm ${companion.name}.`,
            role: "companion",
            emotion_state: { mood: "calm", intensity: 0.4, valence: 0.6, arousal: 0.3 },
            created_at: new Date().toISOString(),
          };
          setMessages([welcome]);
        }
      } catch {
        const welcome: Message = {
          id: crypto.randomUUID(),
          companion_id: companion.id,
          user_id: user.id,
          content: lang === "zh" ? `你好，我是${companion.name}。` : `Hi, I'm ${companion.name}.`,
          role: "companion",
          emotion_state: { mood: "calm", intensity: 0.4, valence: 0.6, arousal: 0.3 },
          created_at: new Date().toISOString(),
        };
        setMessages([welcome]);
      }
      try {
        const { data: proactive } = await supabase
          .from("proactive_messages")
          .select("*")
          .eq("user_id", user.id)
          .eq("companion_id", companion.id)
          .eq("is_read", false)
          .order("created_at", { ascending: true });
        if (proactive && proactive.length > 0) {
          setGhostMessage(proactive[proactive.length - 1].content);
          await supabase
            .from("proactive_messages")
            .update({ is_read: true })
            .eq("id", proactive[proactive.length - 1].id);
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, [companion, user]);

  /* ── File select (click) ── */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) continue;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () =>
          setUploadedFiles((prev) => [
            ...prev,
            { name: file.name, type: file.type, content: reader.result as string, isImage: true },
          ]);
        reader.readAsDataURL(file);
      } else if (
        file.type.includes("text") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md")
      ) {
        const text = await file.text();
        setUploadedFiles((prev) => [
          ...prev,
          { name: file.name, type: file.type, content: text.slice(0, 3000), isImage: false },
        ]);
      }
    }
    e.target.value = "";
  }, []);

  /* ── Drag & drop handlers ── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) continue;
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () =>
          setUploadedFiles((prev) => [
            ...prev,
            { name: file.name, type: file.type, content: reader.result as string, isImage: true },
          ]);
        reader.readAsDataURL(file);
      } else if (
        file.type.includes("text") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md")
      ) {
        const text = await file.text();
        setUploadedFiles((prev) => [
          ...prev,
          { name: file.name, type: file.type, content: text.slice(0, 3000), isImage: false },
        ]);
      }
    }
  }, []);

  /* ── SSE Streaming handler ── */
  const streamChat = async (
    userMsg: Message
  ): Promise<{ response: string; thinking: string; emotion: EmotionState } | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token || !companion) return null;

    let fileContext = "";
    const textFiles = uploadedFiles.filter((f) => !f.isImage);
    if (textFiles.length > 0) {
      fileContext = textFiles.map((f) => `--- ${f.name} ---\n${f.content}`).join("\n\n");
    }

    const payload = {
      message: userMsg.content,
      companionId: companion.id,
      companionName: companion.name,
      companionGender: companion.gender || "female",
      personalityDesc: companion.personality_desc,
      history: messages.slice(-10).map((m) => ({
        role: m.role === "companion" ? "assistant" : "user",
        content: m.content,
      })),
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
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
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
      let finalEmotion: EmotionState = {
        mood: "focused",
        intensity: 0.4,
        valence: 0.5,
        arousal: 0.4,
      };

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
            } catch {
              /* ignore */
            }
          } else if (eventType === "thinking") {
            try {
              const d = JSON.parse(jsonStr);
              fullThinking += d.text || "";
              setStreamingThinking(fullThinking);
            } catch {
              /* ignore */
            }
          } else if (eventType === "error") {
            try {
              const d = JSON.parse(jsonStr);
              console.error("[Chat] Server error:", d.error);
              throw new Error(d.error || "AI 服务错误");
            } catch {
              throw new Error("AI 服务错误");
            }
          } else if (eventType === "done") {
            try {
              const d = JSON.parse(jsonStr);
              if (d.emotion) finalEmotion = d.emotion;
              fullContent = d.response || fullContent;
              fullThinking = d.thinking || fullThinking;
            } catch {
              /* ignore */
            }
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

  /* ── Send handler ── */
  const handleSend = useCallback(async () => {
    if (!input.trim() || !companion || !user || isTyping || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      companion_id: companion.id,
      user_id: user.id,
      content: input.trim(),
      role: "user",
      created_at: new Date().toISOString(),
    };
    addMessage(userMsg);
    setInput("");
    setIsTyping(true);
    setChatError("");
    if (ghostMessage) setGhostMessage(null);

    let responseText = "";
    let emotion: EmotionState = {
      mood: "calm",
      intensity: 0.4,
      valence: 0.5,
      arousal: 0.4,
    };

    const result = await streamChat(userMsg);
    setUploadedFiles([]);
    setIsTyping(false);

    if (result) {
      responseText = result.response;
      emotion = result.emotion;
      const companionMsg: Message = {
        id: crypto.randomUUID(),
        companion_id: companion.id,
        user_id: user.id,
        content: responseText,
        role: "companion",
        emotion_state: emotion,
        created_at: new Date().toISOString(),
      };
      addMessage(companionMsg);
      updateFromEmotion(emotion);
    } else {
      removeMessage(userMsg.id);
      setChatError(
        lang === "zh" ? "连接失败了，再试一次吧..." : "Connection failed. Please try again..."
      );
    }
  }, [
    input, companion, user, isTyping, isStreaming, messages,
    addMessage, removeMessage, updateFromEmotion, lang, ghostMessage, uploadedFiles,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-black relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Mood-aware background */}
      <ChatBackground
        mood={currentMood}
        intensity={companion?.current_emotion?.intensity || 0.4}
      />
      <ChatAmbient />

      {/* Drag overlay */}
      <DragOverlay show={isDragOver} />

      {/* ═══════ Header ═══════ */}
      <div className="shrink-0 backdrop-blur-2xl bg-black/30 border-b border-white/[0.06] px-4 py-2.5 z-20">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/home")}
              className="text-white/40 hover:text-white/80 p-1 -ml-1 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border transition-colors duration-500"
                style={{
                  backgroundColor: `${currentEmotionConfig.accent}15`,
                  borderColor: `${currentEmotionConfig.accent}40`,
                }}
              >
                {companion?.avatar_url ? (
                  <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <img src="/platonic-logo.png" alt="" className="w-3.5 h-3.5 object-contain" />
                )}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black animate-pulse"
                style={{ backgroundColor: currentEmotionConfig.accent }}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium">{companion?.name}</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-white/35">
                  {isTyping || isStreaming ? t("typing") : t("online")}
                </span>
                {currentEmotion && (
                  <button
                    onClick={() => setShowEmotion(!showEmotion)}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <EmotionBadge emotion={currentEmotion} compact />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="flex items-center gap-1 text-[10px] mr-2">
              <button
                onClick={() => setLang("zh")}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  lang === "zh" ? "text-[#FF1493]" : "text-white/20 hover:text-white/40"
                }`}
              >
                中
              </button>
              <span className="text-white/10">/</span>
              <button
                onClick={() => setLang("en")}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  lang === "en" ? "text-[#FF1493]" : "text-white/20 hover:text-white/40"
                }`}
              >
                EN
              </button>
            </div>
            <button
              onClick={() => navigate("/memory")}
              className="p-1.5 text-white/25 hover:text-[#FF1493] transition-colors"
            >
              <Brain className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate("/bond")}
              className="p-1.5 text-white/25 hover:text-[#FF1493] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-1.5 text-white/25 hover:text-[#FF1493] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ Emotion panel ═══════ */}
      <AnimatePresence>
        {showEmotion && currentEmotion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 backdrop-blur-2xl bg-black/20 border-b border-white/[0.06] px-4 py-2 overflow-hidden z-10"
          >
            <EmotionBadge emotion={currentEmotion} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Chat error banner ═══════ */}
      <AnimatePresence>
        {chatError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 backdrop-blur-2xl bg-black/20 border-b border-red-500/20 px-4 py-2 z-20"
          >
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              <p className="text-red-400 text-[11px]">{chatError}</p>
              <button
                onClick={() => setChatError("")}
                className="text-red-400/50 hover:text-red-400 text-[10px] px-2"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Messages ═══════ */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 z-10">
        {messages.map((msg, idx) => {
          const showDate =
            idx === 0 ||
            new Date(msg.created_at).toDateString() !==
              new Date(messages[idx - 1].created_at).toDateString();
          const isFirst = idx === 0 || messages[idx - 1].role !== msg.role;
          const isLast =
            idx === messages.length - 1 || messages[idx + 1].role !== msg.role;
          const msgEmotion = msg.emotion_state;
          const msgEmotionConfig = msgEmotion
            ? EMOTION_MAP[msgEmotion.mood] || EMOTION_MAP.calm
            : null;

          return (
            <div key={msg.id}>
              {/* Date divider */}
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <div className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
                    <span className="text-[9px] text-white/20">
                      {new Date(msg.created_at).toLocaleDateString(
                        lang === "zh" ? "zh-CN" : "en-US",
                        { month: "short", day: "numeric", weekday: "short" }
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Message bubble */}
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[82%] flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* Companion name label */}
                  {msg.role === "companion" && isFirst && (
                    <span className="text-[8px] text-white/15 mb-0.5 ml-1">
                      {companion?.name}
                    </span>
                  )}

                  {/* Bubble */}
                  <div
                    className={`relative px-3.5 py-2.5 shadow-lg transition-shadow duration-300 ${
                      msg.role === "user"
                        ? "text-white rounded-2xl rounded-tr-md"
                        : "text-white/90 rounded-2xl rounded-tl-md border border-white/[0.06]"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(255,20,147,0.18) 0%, rgba(255,20,147,0.08) 100%)",
                            boxShadow:
                              "0 2px 12px rgba(255,20,147,0.08), 0 0 1px rgba(255,20,147,0.15)",
                            border: "1px solid rgba(255,20,147,0.12)",
                          }
                        : {
                            background:
                              "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                            boxShadow:
                              "0 2px 8px rgba(0,0,0,0.15), 0 0 1px rgba(255,255,255,0.04)",
                            borderLeft: `2px solid ${msgEmotionConfig?.accent || "#FF1493"}30`,
                          }
                    }
                  >
                    {/* Emotion indicator inside companion bubble */}
                    {msg.role === "companion" && msgEmotion && msgEmotionConfig && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: msgEmotionConfig.accent }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <span
                          className="text-[7px] font-medium"
                          style={{ color: `${msgEmotionConfig.accent}80` }}
                        >
                          {msgEmotion.mood}
                        </span>
                      </div>
                    )}
                    <p className="text-[13px] leading-relaxed font-light whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>

                  {/* Timestamp + read status */}
                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      msg.role === "user" ? "mr-1" : "ml-1"
                    }`}
                  >
                    <Clock className="w-2 h-2 text-white/10" />
                    <span className="text-[7px] text-white/12">
                      {formatRelativeTime(msg.created_at, lang)}
                    </span>
                    {msg.role === "user" && isLast && (
                      <CheckCheck className="w-2.5 h-2.5 text-[#FF1493]/30 ml-0.5" />
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}

        {/* ═══════ Streaming message bubble ═══════ */}
        {(isStreaming || streamingText) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex flex-col items-start max-w-[82%]">
              <ThinkingPanel
                thinking={streamingThinking}
                isStreaming={isStreaming && !!streamingThinking}
              />
              <div className="flex items-end gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border"
                  style={{
                    backgroundColor: `${currentEmotionConfig.accent}15`,
                    borderColor: `${currentEmotionConfig.accent}30`,
                  }}
                >
                  {companion?.avatar_url ? (
                    <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <img src="/platonic-logo.png" alt="" className="w-3 h-3 object-contain" />
                  )}
                </div>
                <div
                  className="rounded-2xl px-3.5 py-2.5 border rounded-tl-sm min-w-[60px]"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                    borderColor: "rgba(255,255,255,0.06)",
                    borderLeft: `2px solid ${currentEmotionConfig.accent}30`,
                  }}
                >
                  <p className="text-[13px] leading-relaxed font-light whitespace-pre-wrap">
                    {streamingText}
                    {isStreaming && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-[2px] h-[13px] bg-[#FF1493]/60 ml-[1px] align-middle"
                      />
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════ Typing indicator (enhanced with bouncing dots + halo) ═══════ */}
        {isTyping && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex justify-start"
          >
            <div className="flex items-end gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border"
                style={{
                  backgroundColor: `${currentEmotionConfig.accent}15`,
                  borderColor: `${currentEmotionConfig.accent}30`,
                }}
              >
                {companion?.avatar_url ? (
                  <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <img src="/platonic-logo.png" alt="" className="w-3 h-3 object-contain" />
                )}
              </div>
              <div className="relative rounded-2xl px-4 py-2.5 border border-white/[0.06] rounded-tl-sm overflow-hidden">
                {/* Pulsing halo background */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center, ${currentEmotionConfig.accent}10 0%, transparent 70%)`,
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Bouncing dots */}
                <div className="relative flex items-center gap-1.5">
                  <div className="flex items-center gap-[4px]">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-[6px] h-[6px] rounded-full"
                        style={{ backgroundColor: currentEmotionConfig.accent }}
                        animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-white/25 text-[10px] ml-1 tracking-wide">
                    {t("typing")}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════ Ghost message ═══════ */}
        <AnimatePresence>
          {ghostMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex justify-center my-4"
            >
              <div className="relative px-5 py-3 border border-[#FF1493]/30 rounded-2xl bg-[#FF1493]/5 backdrop-blur-md max-w-[85%] shadow-lg shadow-[#FF1493]/5">
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF1493] rounded-full animate-pulse" />
                <p className="text-[12px] text-[#FF1493]/80 font-light leading-relaxed">
                  {ghostMessage}
                </p>
                <p className="text-[8px] text-[#FF1493]/30 mt-1.5 text-right">
                  {lang === "zh"
                    ? companion?.name + " " + t("ghostLabel")
                    : "From " + companion?.name}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ═══════ Uploaded files (enhanced cards) ═══════ */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="shrink-0 px-3 pt-2 pb-1 z-20"
          >
            <div className="flex flex-wrap gap-2 max-w-3xl mx-auto">
              {uploadedFiles.map((f, i) => (
                <FileChip
                  key={i}
                  file={f}
                  onRemove={() =>
                    setUploadedFiles((prev) => prev.filter((_, j) => j !== i))
                  }
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Input ═══════ */}
      <div
        className={`shrink-0 backdrop-blur-2xl bg-black/30 border-t border-white/[0.06] px-3 py-2.5 z-20 transition-all duration-300 ${
          inputFocused ? "border-[#FF1493]/20" : ""
        }`}
      >
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.md"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-xl border transition-all shrink-0 ${
              uploadedFiles.length > 0
                ? "bg-[#FF1493]/15 border-[#FF1493]/30 text-[#FF1493]"
                : "bg-white/5 border-white/10 text-white/25 hover:text-[#FF1493] hover:border-[#FF1493]/20"
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={
              lang === "zh"
                ? `对${companion?.name || "TA"}说点什么...`
                : `Say something to ${companion?.name || "them"}...`
            }
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white placeholder:text-white/12 focus:outline-none focus:border-[#FF1493]/35 transition-all resize-none"
            style={{ minHeight: "36px", maxHeight: "80px" }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isStreaming}
            className="p-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] hover:bg-[#FF1493]/30 transition-all disabled:opacity-20 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
