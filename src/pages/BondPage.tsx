import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import type { RelationshipStats, RelationshipEvent } from "../types";
import BottomNav from "../components/BottomNav";
import { ArrowLeft, Heart, Sparkles, TrendingUp, MessageCircle, Calendar, Star } from "lucide-react";

export default function BondPage() {
  const navigate = useNavigate();
  const { companion, user } = useStore();
  const { lang, setLang, t } = useLang();
  const [stats, setStats] = useState<RelationshipStats | null>(null);
  const [events, setLocalEvents] = useState<RelationshipEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [companion, user]);

  async function load() {
    if (!companion || !user) return;
    setLoading(true);
    try {
      const { data: s } = await supabase.from("relationship_stats").select("*").eq("companion_id", companion.id).single();
      const { data: e } = await supabase.from("relationship_events").select("*").eq("companion_id", companion.id).order("created_at", { ascending: false }).limit(20);
      if (s) setStats(s);
      else setStats(generateDemoStats(companion));
      if (e && e.length > 0) setLocalEvents(e);
      else setLocalEvents(generateDemoEvents(companion));
    } catch {
      setStats(generateDemoStats(companion));
      setLocalEvents(generateDemoEvents(companion));
    } finally { setLoading(false); }
  }

  function generateDemoStats(c: any): RelationshipStats {
    const days = Math.max(1, Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000));
    return { id: "demo", companion_id: c.id, user_id: c.user_id || "", bond_level: Math.min(100, 20 + days * 2), intimacy_score: Math.min(100, 15 + days), trust_score: Math.min(100, 25 + days), total_messages: 42 + days * 3, days_together: days, first_interaction: c.created_at, last_interaction: new Date().toISOString(), created_at: c.created_at, updated_at: new Date().toISOString() };
  }
  function generateDemoEvents(c: any): RelationshipEvent[] {
    return [
      { id: "1", companion_id: c.id, user_id: c.user_id || "", event_type: "first_meet", description: lang === "zh" ? "初次相遇" : "First encounter", bond_delta: 10, created_at: c.created_at },
      { id: "2", companion_id: c.id, user_id: c.user_id || "", event_type: "adoption", description: c.adopted_from_plaza ? (lang === "zh" ? "从广场领养" : "Adopted from plaza") : (lang === "zh" ? "亲手创造" : "Created by hand"), bond_delta: 15, created_at: new Date(new Date(c.created_at).getTime() + 60000).toISOString() },
    ];
  }

  if (!stats) return null;
  const statCards = [
    { label: t("bondLevel"), value: stats.bond_level, icon: Heart, color: "#FF1493", max: 100 },
    { label: t("intimacy"), value: stats.intimacy_score, icon: Sparkles, color: "#FF69B4", max: 100 },
    { label: t("trust"), value: stats.trust_score, icon: TrendingUp, color: "#FFB6C1", max: 100 },
  ];
  const eventIcons: Record<string, any> = { first_meet: Star, adoption: Heart, deep_conversation: MessageCircle, milestone: Sparkles };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/chat")} className="text-white/40 hover:text-white/80 p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-light tracking-wider">{t("bondTitle")}</h2>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
          <span className="text-white/10">/</span>
          <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="w-5 h-5 border-2 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" /></div>
        ) : (
          <div className="max-w-lg mx-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
              className="glass-dark rounded-2xl p-5 mb-4 text-center relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <motion.div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)" }} animate={{ scale: [1,1.2,1], opacity: [0.5,0.8,0.5] }} transition={{ duration: 4, repeat: Infinity }} />
                <motion.div className="absolute top-1/2 right-1/3 w-20 h-20 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,20,147,0.08) 0%, transparent 70%)" }} animate={{ scale: [1,1.3,1], opacity: [0.3,0.5,0.3] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-5 mb-3">
                  <div className="text-center"><div className="w-12 h-12 rounded-full bg-white/8 border border-white/15 flex items-center justify-center"><span className="text-white/50 text-xs">{lang==="zh"?"你":"You"}</span></div></div>
                  <div className="flex-1 max-w-[80px]">
                    <svg viewBox="0 0 120 40" className="w-full">
                      <motion.path d="M 0 20 Q 30 5, 60 20 T 120 20" fill="none" stroke="#FF1493" strokeWidth="1" strokeOpacity="0.35"
                        animate={{ d: ["M 0 20 Q 30 5, 60 20 T 120 20","M 0 20 Q 30 35, 60 20 T 120 20","M 0 20 Q 30 5, 60 20 T 120 20"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
                      <motion.circle cx="60" cy="20" r="3" fill="#FF1493" animate={{ opacity: [0.4,1,0.4], scale: [1,1.3,1] }} transition={{ duration: 2, repeat: Infinity }} />
                    </svg>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#FF1493]/8 border border-[#FF1493]/25 flex items-center justify-center overflow-hidden">
                      {companion?.avatar_url ? <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[#FF1493] text-[10px]">{companion?.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 text-[10px] text-white/30">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{stats.days_together} {t("days")}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{stats.total_messages} {t("messages")}</span>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }}
                    className="glass-dark rounded-xl p-2.5 text-center">
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
                    <div className="text-lg font-light" style={{ color: stat.color }}>{Math.round(stat.value)}</div>
                    <div className="text-[9px] text-white/30">{stat.label}</div>
                    <div className="mt-1.5 h-[3px] bg-white/4 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: stat.color }} initial={{ width: 0 }} animate={{ width: `${(stat.value / stat.max) * 100}%` }} transition={{ duration: 1.2, delay: 0.4 }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <h3 className="text-[10px] text-white/30 mb-2 tracking-wider">{t("events")}</h3>
              <div className="space-y-1.5">
                {events.map((event, i) => {
                  const EventIcon = eventIcons[event.event_type] || Star;
                  return (
                    <motion.div key={event.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-2.5 glass-dark rounded-xl p-2.5 border border-white/4">
                      <div className="w-6 h-6 rounded-md bg-[#FF1493]/8 border border-[#FF1493]/18 flex items-center justify-center shrink-0">
                        <EventIcon className="w-3 h-3 text-[#FF1493]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-white/60">{event.description}</p>
                        <p className="text-[9px] text-white/20">{new Date(event.created_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}</p>
                      </div>
                      {event.bond_delta > 0 && <span className="text-[#FF1493] text-[10px]">+{event.bond_delta}</span>}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
