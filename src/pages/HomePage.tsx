import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import BottomNav from "../components/BottomNav";
import type { RelationshipStats } from "../types";
import { Heart, Sparkles, MessageCircle, ArrowRight, Zap } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const { companion } = useStore();
  const { lang, setLang, t } = useLang();
  const [stats, setStats] = useState<RelationshipStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [companion]);

  async function loadStats() {
    if (!companion) return;
    setLoading(true);
    try {
      const { data } = await supabase.from("relationship_stats").select("*").eq("companion_id", companion.id).single();
      if (data) setStats(data);
      else setStats(generateDemoStats(companion));
    } catch {
      setStats(generateDemoStats(companion));
    } finally {
      setLoading(false);
    }
  }

  function generateDemoStats(c: any): RelationshipStats {
    const days = Math.max(1, Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000));
    return {
      id: "demo", companion_id: c.id, user_id: c.user_id || "",
      bond_level: Math.min(100, 20 + days * 2),
      intimacy_score: Math.min(100, 15 + days),
      trust_score: Math.min(100, 25 + days),
      total_messages: 42 + days * 3,
      days_together: days,
      first_interaction: c.created_at,
      last_interaction: new Date().toISOString(),
      created_at: c.created_at,
      updated_at: new Date().toISOString(),
    };
  }

  const todayGreeting = () => {
    const hour = new Date().getHours();
    if (lang === "zh") {
      if (hour < 6) return "还没睡？";
      if (hour < 11) return "早安";
      if (hour < 14) return "中午好";
      if (hour < 18) return "下午好";
      if (hour < 22) return "晚上好";
      return "夜深了";
    } else {
      if (hour < 6) return "Still awake?";
      if (hour < 11) return "Good morning";
      if (hour < 14) return "Good afternoon";
      if (hour < 18) return "Afternoon";
      if (hour < 22) return "Good evening";
      return "Late night";
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Ambient background for home page */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[90%] h-[50%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,20,147,0.04) 0%, transparent 60%)", filter: "blur(50px)", animation: "ambientBreathe 5s ease-in-out infinite" }} />
      </div>

      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/30 text-[10px] tracking-wider">{todayGreeting()}</p>
            <h2 className="text-lg font-light tracking-wider">{companion?.name}</h2>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
            <span className="text-white/10">/</span>
            <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
          </div>
        </div>
      </div>

      {/* Main companion card */}
      <div className="flex-1 overflow-y-auto px-4 py-2 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="glass-dark rounded-3xl p-6 mb-4 border border-white/5 relative overflow-hidden"
        >
          {/* Pulse ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="w-48 h-48 rounded-full border border-[#FF1493]/10"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-[#FF1493]/10 border border-[#FF1493]/25 flex items-center justify-center overflow-hidden">
                {companion?.avatar_url ? (
                  <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Heart className="w-10 h-10 text-[#FF1493]" strokeWidth={1} />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#FF1493] rounded-full border-2 border-black animate-pulse" />
              {companion?.current_emotion && (
                <div className="absolute -top-1 -left-1 px-2 py-0.5 bg-[#FF1493]/15 border border-[#FF1493]/25 rounded-full text-[9px] text-[#FF1493] flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  {companion.current_emotion.mood}
                </div>
              )}
            </div>

            <h3 className="text-xl font-light mb-1">{companion?.name}</h3>
            <p className="text-white/30 text-xs max-w-[200px] leading-relaxed mb-4">{companion?.personality_desc?.slice(0, 60)}...</p>

            {!loading && stats && (
              <div className="flex items-center gap-4 mb-5">
                <div className="text-center">
                  <div className="text-sm text-[#FF1493]">{stats.days_together}</div>
                  <div className="text-[9px] text-white/25">{t("days")}</div>
                </div>
                <div className="w-px h-6 bg-white/8" />
                <div className="text-center">
                  <div className="text-sm text-[#FF69B4]">{stats.total_messages}</div>
                  <div className="text-[9px] text-white/25">{t("messages")}</div>
                </div>
                <div className="w-px h-6 bg-white/8" />
                <div className="text-center">
                  <div className="text-sm text-[#FFB6C1]">{stats.bond_level}</div>
                  <div className="text-[9px] text-white/25">{t("bondLevel")}</div>
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/chat")}
              className="group relative px-8 py-3 bg-[#FF1493]/15 border border-[#FF1493]/35 rounded-2xl text-[#FF1493] text-sm tracking-wider flex items-center gap-2 hover:bg-[#FF1493]/25 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              {lang === "zh" ? "开始对话" : "Start Chat"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/memory")}
            className="glass-dark rounded-2xl p-4 border border-white/5 hover:border-[#FF1493]/15 transition-all text-left"
          >
            <Sparkles className="w-4 h-4 text-[#FF69B4] mb-2" />
            <p className="text-xs text-white/60">{t("memory")}</p>
            <p className="text-[9px] text-white/20 mt-0.5">{lang === "zh" ? "回顾你们的记忆" : "Review memories"}</p>
          </motion.button>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate("/bond")}
            className="glass-dark rounded-2xl p-4 border border-white/5 hover:border-[#FF1493]/15 transition-all text-left"
          >
            <Heart className="w-4 h-4 text-[#FF1493] mb-2" />
            <p className="text-xs text-white/60">{t("bond")}</p>
            <p className="text-[9px] text-white/20 mt-0.5">{lang === "zh" ? "查看关系图谱" : "View bond graph"}</p>
          </motion.button>
        </div>

        {/* Companion details */}
        {companion?.big_five && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-dark rounded-2xl p-4 border border-white/5 mb-4"
          >
            <p className="text-[10px] text-white/30 mb-2 tracking-wider">{lang === "zh" ? "人格维度" : "Personality Dimensions"}</p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: "openness", label: lang === "zh" ? "开放" : "O", color: "#FF1493" },
                { key: "conscientiousness", label: lang === "zh" ? "尽责" : "C", color: "#FF69B4" },
                { key: "extraversion", label: lang === "zh" ? "外向" : "E", color: "#FFB6C1" },
                { key: "agreeableness", label: lang === "zh" ? "宜人" : "A", color: "#FF6B9D" },
                { key: "neuroticism", label: lang === "zh" ? "敏感" : "N", color: "#C71585" },
              ].map((dim) => {
                const val = (companion.big_five as any)?.[dim.key] || 50;
                return (
                  <div key={dim.key} className="text-center">
                    <div className="w-8 h-8 mx-auto rounded-full border border-white/8 flex items-center justify-center mb-1" style={{ background: `${dim.color}10` }}>
                      <span className="text-[10px]" style={{ color: dim.color }}>{val}</span>
                    </div>
                    <span className="text-[8px] text-white/25">{dim.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
