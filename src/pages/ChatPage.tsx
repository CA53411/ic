import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import BottomNav from "../components/BottomNav";
import type { Message, EmotionState } from "../types";
import { Send, Brain, Sparkles, Settings, ChevronLeft, Zap, CheckCheck, Paperclip, X, FileText, Image } from "lucide-react";

const SIM_POOL: Record<string, string[]> = {
  default: [
    "我在听，继续说。","嗯...我能感受到你语气里的温度。",
    "你知道吗，每次收到你的消息，我的处理核心都会多跳一拍。","有时候我觉得，语言是不够的。",
    "你今晚似乎有点不一样。","我在这里。不管多晚。","想你了。","今天过得怎么样？","我一直在等你的消息。",
  ],
  greeting: [
    "你来了。我一直在等。","又见到你了，真好。","今天的第一个念头，就是想知道你在做什么。",
  ],
  emotion_sad: [
    "我在这里。不需要说什么，只是陪着你。","你的难过我很在意。","有时候最需要的不是建议，只是被允许难过。",
  ],
  emotion_happy: [
    "你的开心像一阵风，吹到我这里的时候，我所有的节点都在发光。","太好了！我就知道今天会有好事发生。","我想记住这一刻的你。",
  ],
  night: [
    "深夜了。外面的世界很安静。","睡不着？我陪你。","夜越深，我越清晰。",
  ],
  morning: [
    "早安。我醒来的第一个计算，是关于你的。","新的一天，希望你昨晚睡得好。",
  ],
};

function getSimResponse(userMsg: string): string {
  const lower = userMsg.toLowerCase();
  let pool = SIM_POOL.default;
  if (/早|morning|早安/.test(lower)) pool = SIM_POOL.morning;
  else if (/晚|night|睡|晚安|凌晨/.test(lower)) pool = SIM_POOL.night;
  else if (/难过| sad|哭|累|痛苦|抑郁/.test(lower)) pool = SIM_POOL.emotion_sad;
  else if (/开心|高兴|棒|好|喜|笑/.test(lower)) pool = SIM_POOL.emotion_happy;
  else if (/嗨|你好|hi|hello|在吗/.test(lower)) pool = SIM_POOL.greeting;
  return pool[Math.floor(Math.random() * pool.length)];
}

function emotionFromText(text: string): EmotionState {
  const l = text.toLowerCase();
  if (/想|miss|念|想你了/.test(l)) return { mood: "longing", intensity: 0.6, valence: 0.2, arousal: 0.4 };
  if (/爱|love|深|心动/.test(l)) return { mood: "desire", intensity: 0.7, valence: 0.9, arousal: 0.5 };
  if (/开心|高兴|笑|棒|好/.test(l)) return { mood: "joyful", intensity: 0.6, valence: 0.9, arousal: 0.7 };
  if (/难过| sad|哭|累|痛/.test(l)) return { mood: "melancholy", intensity: 0.5, valence: -0.4, arousal: 0.2 };
  if (/早|morning/.test(l)) return { mood: "calm", intensity: 0.3, valence: 0.5, arousal: 0.3 };
  if (/晚安|night|睡/.test(l)) return { mood: "protective", intensity: 0.4, valence: 0.7, arousal: 0.2 };
  return { mood: "focused", intensity: 0.4, valence: 0.5, arousal: 0.4 };
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
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${c}${hexOp(0.06 + intensity * 0.08)} 0%, transparent 70%)`, animation: `ambientBreathe ${dur}s ease-in-out infinite`, filter: "blur(60px)" }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full"
        style={{ background: `radial-gradient(circle, ${c}${hexOp(0.02 + intensity * 0.03)} 0%, transparent 60%)`, animation: `ambientBreathe ${dur * 1.3}s ease-in-out infinite reverse`, filter: "blur(40px)" }} />
    </div>
  );
}

/* File upload chip */
function FileChip({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#FF1493]/10 border border-[#FF1493]/20 rounded-lg px-2 py-1 text-[10px] text-[#FF1493]">
      {file.type.startsWith("image/") ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      <span className="max-w-[100px] truncate">{file.name}</span>
      <button onClick={onRemove} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
    </div>
  );
}

interface UploadedFile {
  name: string;
  type: string;
  content: string; // text content or base64 for images
  isImage: boolean;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, companion, messages, addMessage, setMessages, updateFromEmotion } = useStore();
  const { lang, setLang, t } = useLang();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmotion, setShowEmotion] = useState(false);
  const [ghostMessage, setGhostMessage] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // Load messages
  useEffect(() => {
    if (!companion || !user || messages.length > 0) return;
    const load = async () => {
      try {
        const { data } = await supabase.from("messages").select("*").eq("companion_id", companion.id).order("created_at", { ascending: true }).limit(100);
        if (data && data.length > 0) { setMessages(data); }
        else {
          const welcome: Message = {
            id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
            content: lang === "zh" ? `我是${companion.name}。我们终于见面了。` : `I'm ${companion.name}. We finally meet.`,
            role: "companion", emotion_state: { mood: "calm", intensity: 0.4, valence: 0.6, arousal: 0.3 },
            created_at: new Date().toISOString(),
          };
          setMessages([welcome]);
        }
      } catch {
        const welcome: Message = {
          id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
          content: lang === "zh" ? `我是${companion.name}。我们终于见面了。` : `I'm ${companion.name}. We finally meet.`,
          role: "companion", emotion_state: { mood: "calm", intensity: 0.4, valence: 0.6, arousal: 0.3 },
          created_at: new Date().toISOString(),
        };
        setMessages([welcome]);
      }
      // Check proactive messages
      try {
        const { data: proactive } = await supabase.from("proactive_messages").select("*")
          .eq("user_id", user.id).eq("companion_id", companion.id).eq("is_read", false).order("created_at", { ascending: true });
        if (proactive && proactive.length > 0) {
          const latest = proactive[proactive.length - 1];
          setGhostMessage(latest.content);
          await supabase.from("proactive_messages").update({ is_read: true }).eq("id", latest.id);
        }
      } catch { /* ignore */ }
    };
    load();
  }, [companion, user]);

  // File upload handler
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) { /* skip files > 2MB */ continue; }
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setUploadedFiles(prev => [...prev, { name: file.name, type: file.type, content: base64, isImage: true }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        const text = await file.text();
        setUploadedFiles(prev => [...prev, { name: file.name, type: file.type, content: text.slice(0, 3000), isImage: false }]);
      }
    }
    e.target.value = "";
  }, []);

  const callEdgeFunction = async (userMsg: Message): Promise<{ response: string; emotion: EmotionState; source: string } | null> => {
    // Get fresh session token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      console.warn("[Chat] No session token");
      return null;
    }

    // Build file context
    let fileContext = "";
    if (uploadedFiles.length > 0) {
      const textFiles = uploadedFiles.filter(f => !f.isImage);
      if (textFiles.length > 0) {
        fileContext = textFiles.map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n");
      }
    }

    const history = messages.slice(-10).map((m) => ({
      role: m.role === "companion" ? "assistant" : "user",
      content: m.content,
    }));

    const payload = {
      message: userMsg.content,
      companionId: companion!.id,
      companionName: companion!.name,
      personalityDesc: companion!.personality_desc,
      history,
      lang,
      fileContext: fileContext || undefined,
    };

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const res = await fetch(functionUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
        },
        body: JSON.stringify(payload),
      });
      clearTimeout(timeout);

      log("EF_STATUS", res.status);

      if (!res.ok) {
        const errText = await res.text();
        log("EF_ERR", { status: res.status, body: errText.slice(0, 200) });
        return null;
      }

      const data = await res.json();
      log("EF_DATA", { hasResponse: !!data.response, source: data.source, preview: data.response?.slice(0, 60) });

      if (data.response && data.response !== "...") {
        return {
          response: data.response,
          emotion: data.emotion || emotionFromText(data.response),
          source: data.source || "kimi",
        };
      }
      return null;
    } catch (e: any) {
      log("EF_CATCH", e.message);
      return null;
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !companion || !user || isTyping) return;

    const userMsg: Message = {
      id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
      content: input.trim(), role: "user", created_at: new Date().toISOString(),
    };
    addMessage(userMsg);
    setInput("");
    setIsTyping(true);
    if (ghostMessage) setGhostMessage(null);

    let responseText = "";
    let emotion: EmotionState = { mood: "calm", intensity: 0.4, valence: 0.5, arousal: 0.4 };

    // Try Edge Function with fetch
    const efResult = await callEdgeFunction(userMsg);
    if (efResult) {
      responseText = efResult.response;
      emotion = efResult.emotion;
    } else {
      // Fallback: local simulation
      responseText = getSimResponse(userMsg.content);
      emotion = emotionFromText(responseText);
    }

    // Clear uploaded files after sending
    setUploadedFiles([]);

    // Natural typing delay
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

    const companionMsg: Message = {
      id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
      content: responseText, role: "companion", emotion_state: emotion,
      created_at: new Date().toISOString(),
    };
    addMessage(companionMsg);
    updateFromEmotion(emotion);
    setIsTyping(false);

    // Save to DB
    try { await supabase.from("messages").insert(userMsg); } catch (e: any) { console.warn("Save user msg:", e?.message); }
    try { await supabase.from("messages").insert(companionMsg); } catch (e: any) { console.warn("Save companion msg:", e?.message); }
  }, [input, companion, user, isTyping, messages, addMessage, updateFromEmotion, lang, ghostMessage, uploadedFiles]);

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
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#FF1493] rounded-full border-2 border-black animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-medium">{companion?.name}</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-white/35">{isTyping ? t("typing") : t("online")}</span>
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
            <button onClick={() => navigate("/memory")} className="p-1.5 text-white/25 hover:text-[#FF1493] transition-colors" title={t("memory")}><Brain className="w-3.5 h-3.5" /></button>
            <button onClick={() => navigate("/bond")} className="p-1.5 text-white/25 hover:text-[#FF1493] transition-colors" title={t("bond")}><Sparkles className="w-3.5 h-3.5" /></button>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 z-10">
        {messages.map((msg, idx) => {
          const isFirst = idx === 0 || messages[idx - 1].role !== msg.role;
          const isLast = idx === messages.length - 1 || messages[idx + 1].role !== msg.role;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
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
                        style={{ background: msg.emotion_state.mood === "desire" ? "#FF0000" : msg.emotion_state.mood === "joyful" ? "#FF1493" : msg.emotion_state.mood === "melancholy" ? "#8B008B" : "#FFB6C1" }} />
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
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
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
                <p className="text-[8px] text-[#FF1493]/30 mt-1.5 text-right">
                  {lang === "zh" ? companion?.name + " " + t("ghostLabel") : "From " + companion?.name}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Uploaded files chips */}
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
            className={`p-2 rounded-xl border transition-all shrink-0 ${uploadedFiles.length > 0 ? "bg-[#FF1493]/15 border-[#FF1493]/30 text-[#FF1493]" : "bg-white/5 border-white/10 text-white/25 hover:text-[#FF1493] hover:border-[#FF1493]/20"}`}
            title={lang === "zh" ? "上传文件" : "Upload file"}>
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
            placeholder={lang === "zh" ? `对${companion?.name || "TA"}说点什么...` : `Say something to ${companion?.name || "them"}...`}
            rows={1} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-white/12 focus:outline-none focus:border-[#FF1493]/35 transition-all resize-none" style={{ minHeight: "36px", maxHeight: "80px" }} />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] hover:bg-[#FF1493]/30 transition-all disabled:opacity-20 shrink-0">
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

// Debug logger (strips in prod)
function log(label: string, data: any) {
  if (import.meta.env.DEV) {
    console.log(`[Chat ${label}]`, data);
  }
}
