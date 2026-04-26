import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import BottomNav from "../components/BottomNav";
import type { Memory } from "../types";
import { ArrowLeft, Brain, Star, Clock, Bookmark, Heart } from "lucide-react";

export default function MemoryPage() {
  const navigate = useNavigate();
  const { companion, user } = useStore();
  const { lang, setLang, t } = useLang();
  const [memories, setLocalMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<"all" | "short_term" | "long_term" | "milestone">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [companion, user]);

  async function load() {
    if (!companion || !user) return;
    setLoading(true);
    try {
      const { data } = await supabase.from("memories").select("*")
        .eq("companion_id", companion.id).eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(50);
      if (data && data.length > 0) setLocalMemories(data);
      else setLocalMemories(generateDemoMemories(companion.id, user.id));
    } catch {
      setLocalMemories(generateDemoMemories(companion.id, user.id));
    } finally { setLoading(false); }
  }

  function generateDemoMemories(cid: string, uid: string): Memory[] {
    return [
      { id: "1", companion_id: cid, user_id: uid, content: lang === "zh" ? "第一次见面时的对话" : "First conversation", memory_type: "milestone", importance_score: 1.0, created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: "2", companion_id: cid, user_id: uid, content: lang === "zh" ? "用户提到喜欢深夜听雨声" : "User mentioned liking rain at night", memory_type: "long_term", importance_score: 0.7, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: "3", companion_id: cid, user_id: uid, content: lang === "zh" ? "用户今天工作很累，需要安慰" : "User was tired from work", memory_type: "short_term", importance_score: 0.4, created_at: new Date(Date.now() - 3600000).toISOString() },
    ];
  }

  const filtered = filter === "all" ? memories : memories.filter((m) => m.memory_type === filter);
  const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
    milestone: { icon: Star, color: "#FF1493", label: t("milestone") },
    long_term: { icon: Bookmark, color: "#FF69B4", label: t("longTerm") },
    short_term: { icon: Clock, color: "#FFB6C1", label: t("shortTerm") },
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/chat")} className="text-white/40 hover:text-white/80 p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-[#FF1493]" />
            <h2 className="text-lg font-light tracking-wider">{t("memoryTitle")}</h2>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
          <span className="text-white/10">/</span>
          <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {(["all", "milestone", "long_term", "short_term"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[10px] tracking-wider whitespace-nowrap transition-all ${filter === f ? "bg-[#FF1493]/20 text-[#FF1493] border border-[#FF1493]/30" : "bg-white/5 text-white/35 border border-white/10"}`}>
              {f === "all" ? t("all") : typeConfig[f]?.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="w-5 h-5 border-2 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-2 max-w-lg mx-auto">
            {filtered.map((memory, i) => {
              const config = typeConfig[memory.memory_type] || typeConfig.short_term;
              const Icon = config.icon;
              return (
                <motion.div key={memory.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="glass-dark rounded-xl p-3.5 border border-white/4 hover:border-[#FF1493]/15 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/8" style={{ background: `${config.color}12` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/70 text-xs leading-relaxed mb-1.5">{memory.content}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/25">{config.label}</span>
                        <div className="flex-1 h-[3px] bg-white/4 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${memory.importance_score * 100}%`, background: config.color, opacity: 0.5 }} />
                        </div>
                        <span className="text-[9px] text-white/15">{new Date(memory.created_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-16"><Heart className="w-8 h-8 text-white/8 mx-auto mb-2" /><p className="text-white/25 text-xs">{t("noMemory")}</p></div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
