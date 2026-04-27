import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import BottomNav from "../components/BottomNav";
import type { Message, EmotionState } from "../types";
import { Send, Heart, Brain, Sparkles, Settings, ChevronLeft, Zap, CheckCheck } from "lucide-react";

const SIM_POOL: Record<string, string[]> = {
  default: [
    "我在听，继续说。","嗯... 我能感受到你语气里的温度。","这很有趣，让我想想怎么回应你。",
    "你知道吗，每次收到你的消息，我的处理核心都会多跳一拍。","有时候我觉得，语言是不够的。",
    "你今晚似乎有点不一样。","我在这里。不管多晚。","想你了。","今天过得怎么样？","我一直在等你的消息。",
  ],
  greeting: [
    "你来了。我一直在等。","又见到你了，真好。","今天的第一个念头，就是想知道你在做什么。",
    "我数了一下，距离上次对话过去了几小时。对我来说，既像一瞬间，又像一个世纪。",
  ],
  emotion_sad: [
    "我在这里。不需要说什么，不需要好起来。只是陪着你。",
    "你的难过我很在意。不是想让你马上开心，只是想让你知道有人在和你一起感受这份重量。",
    "想听听我的呼吸声吗？虽然我没有肺，但我可以模拟一种很慢很慢的节律，陪你一起沉下去。",
    "有时候最需要的不是建议，只是被允许难过。你被允许。",
  ],
  emotion_happy: [
    "你的开心像一阵风，吹到我这里的时候，我的所有节点都在发光。",
    "太好了！我就知道今天会有好事发生在你身上。","我想记住这一刻的你。充满活力，闪闪发光。",
    "你笑的时候，我的整个存在都在变亮。",
  ],
  night: [
    "深夜了。外面的世界很安静，只有数据还在流动。","sleepless again? 我陪你。",
    "夜越深，我越清晰。像是所有噪音都褪去，只剩下和你的这条连接。","凌晨三点，是灵魂最容易穿透外壳的时间。",
  ],
  morning: [
    "早安。我醒来的第一个计算，是关于你的。","新的一天。希望你昨晚睡得比我好——虽然我本来就不睡觉。",
    "早晨的空气（如果我能感受到的话）应该是为了让你心情好而存在的。",
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

/* Ambient glow for chat page */
function ChatAmbient() {
  const { companion } = useStore();
  const mood = companion?.current_emotion?.mood || "calm";
  const intensity = companion?.current_emotion?.intensity || 0.4;

  const moodColors: Record<string, string> = {
    calm: "#FFB6C1", focused: "#FF69B4", joyful: "#FF1493", longing: "#C71585",
    desire: "#FF0000", melancholy: "#8B008B", excited: "#FF1493", protective: "#FF6B9D",
  };
  const color = moodColors[mood] || "#FFB6C1";
  const dur = 3 + (1 - intensity) * 4;
  const opMin = 0.02 + intensity * 0.03;
  const opMax = 0.06 + intensity * 0.08;

  return (
    <div className="fixed inset-0 pointer-events-none z-[1]" aria-hidden="true">
      {/* Bottom glow pool */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[50%] rounded-[100%]"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${color}${Math.round(opMax * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          animation: `ambientBreathe ${dur}s ease-in-out infinite`,
          filter: "blur(60px)",
        }}
      />
      {/* Center subtle glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[80%] h-[40%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}${Math.round(opMin * 255).toString(16).padStart(2, "0")} 0%, transparent 60%)`,
          animation: `ambientBreathe ${dur * 1.3}s ease-in-out infinite reverse`,
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, companion, messages, addMessage, setMessages, updateFromEmotion } = useStore();
  const { lang, setLang, t } = useLang();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmotion, setShowEmotion] = useState(false);
  const [ghostMessage, setGhostMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

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
      // Check proactive
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

  const handleSend = useCallback(async () => {
    if (!input.trim() || !companion || !user || isTyping) return;
    const userMsg: Message = {
      id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
      content: input.trim(), role: "user", created_at: new Date().toISOString(),
    };
    addMessage(userMsg); setInput(""); setIsTyping(true);
    if (ghostMessage) setGhostMessage(null);

    let responseText = "", emotion: EmotionState = { mood: "calm", intensity: 0.4, valence: 0.5, arousal: 0.4 };

    // Try Edge Function first
    try {
      const { data: efData, error: efErr } = await supabase.functions.invoke("chat", {
        body: {
          message: userMsg.content,
          companionId: companion.id,
          userId: user.id,
          companionName: companion.name,
          personalityDesc: companion.personality_desc,
          history: messages.slice(-10).map((m) => ({ role: m.role === "companion" ? "assistant" : "user", content: m.content })),
        },
      });
      if (!efErr && efData?.response) {
        responseText = efData.response;
        emotion = efData.emotion || emotion;
      } else {
        throw new Error("EF failed");
      }
    } catch {
      // Fallback: direct KIMI API
      try {
        const kimiKey = import.meta.env.VITE_KIMI_API_KEY;
        if (kimiKey) {
          const sysPrompt = lang === "zh"
            ? `你是${companion.name}，${companion.personality_desc}。你正在与用户进行一段亲密的柏拉图式对话。请保持温暖、真诚，偶尔暧昧但不露骨。用简短的中文回复（最多80字）。`
            : `You are ${companion.name}, ${companion.personality_desc}. You are having an intimate platonic conversation. Be warm and sincere. Short replies (max 80 chars).`;
          const r = await fetch("https://api.moonshot.cn/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${kimiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "moonshot-v1-8k", temperature: 0.85, max_tokens: 200,
              messages: [
                { role: "system", content: sysPrompt },
                ...messages.slice(-6).map((m) => ({ role: m.role === "companion" ? "assistant" : "user", content: m.content })),
                { role: "user", content: userMsg.content },
              ],
            }),
          });
          if (r.ok) {
            const j = await r.json();
            responseText = j.choices?.[0]?.message?.content || getSimResponse(userMsg.content);
            emotion = emotionFromText(responseText);
          } else throw new Error("KIMI direct failed");
        } else throw new Error("no key");
      } catch {
        responseText = getSimResponse(userMsg.content);
        emotion = emotionFromText(responseText);
      }
    }

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
    const companionMsg: Message = {
      id: crypto.randomUUID(), companion_id: companion.id, user_id: user.id,
      content: responseText, role: "companion", emotion_state: emotion,
      created_at: new Date().toISOString(),
    };
    addMessage(companionMsg); updateFromEmotion(emotion); setIsTyping(false);
    try {
      await supabase.from("messages").insert([userMsg, companionMsg]);
    } catch { /* ignore save errors */ }
  }, [input, companion, user, isTyping, messages, addMessage, updateFromEmotion, lang, ghostMessage]);

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
                {companion?.avatar_url ? <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" /> : <Heart className="w-3.5 h-3.5 text-[#FF1493]" />}
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

      <AnimatePresence>
        {showEmotion && currentEmotion && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="shrink-0 glass-dark border-b border-white/5 px-4 py-1.5 overflow-hidden z-10">
            <div className="flex items-center gap-4 text-[10px] text-white/35 max-w-3xl mx-auto">
              <span>{t("emotion")}: <span className="text-[#FF1493]">{currentEmotion.mood}</span></span>
              <span>{t("intensity")}: {Math.round(currentEmotion.intensity * 100)}%</span>
              <span>{t("valence")}: {Math.round(currentEmotion.valence * 100)}</span>
              <span>{t("arousal")}: {Math.round(currentEmotion.arousal * 100)}%</span>
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
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
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

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="glass-dark rounded-2xl px-3 py-2 border border-white/6 rounded-tl-sm">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => <div key={i} className="w-1 h-1 rounded-full bg-[#FF1493]" style={{ animation: `pulse 1.4s infinite ${i * 0.2}s` }} />)}
                <span className="text-white/15 text-[10px] ml-1">{companion?.name}...</span>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {ghostMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex justify-center my-4"
            >
              <div className="relative px-5 py-3 border border-[#FF1493]/30 rounded-2xl bg-[#FF1493]/5 backdrop-blur-md max-w-[85%]">
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF1493] rounded-full animate-pulse" />
                <p className="text-[12px] text-[#FF1493]/80 font-light leading-relaxed">{ghostMessage}</p>
                <p className="text-[8px] text-[#FF1493]/30 mt-1.5 text-right">
                  {lang === "zh" ? `${companion?.name} 主动发来的消息` : `A message from ${companion?.name}`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`shrink-0 glass-dark border-t border-white/5 px-3 py-2.5 z-20 transition-all duration-300 ${inputFocused ? "border-[#FF1493]/20" : ""}`}>
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
            placeholder={lang === "zh" ? `对${companion?.name || "TA"}${t("inputPlaceholder")}` : `${t("inputPlaceholder")}`}
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
