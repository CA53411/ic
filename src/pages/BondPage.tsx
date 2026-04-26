import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import type { RelationshipStats, RelationshipEvent } from "../types";
import { ArrowLeft, Heart, Sparkles, TrendingUp, MessageCircle, Calendar, Star } from "lucide-react";

export default function BondPage() {
  const navigate = useNavigate();
  const { companion, user } = useStore();
  const [stats, setStats] = useState<RelationshipStats | null>(null);
  const [events, setLocalEvents] = useState<RelationshipEvent[]>([]);

  useEffect(() => {
    if (!companion || !user) return;

    const load = async () => {
      const { data: statsData } = await supabase
        .from("relationship_stats")
        .select("*")
        .eq("companion_id", companion.id)
        .single();

      const { data: eventsData } = await supabase
        .from("relationship_events")
        .select("*")
        .eq("companion_id", companion.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (statsData) {
        setStats(statsData);
      } else {
        // Demo stats
        const days = Math.floor((Date.now() - new Date(companion.created_at).getTime()) / 86400000);
        setStats({
          id: "demo",
          companion_id: companion.id,
          user_id: user.id,
          bond_level: Math.min(100, 20 + days * 2),
          intimacy_score: Math.min(100, 15 + days * 1.5),
          trust_score: Math.min(100, 25 + days * 1.8),
          total_messages: 42 + days * 3,
          days_together: Math.max(1, days),
          first_interaction: companion.created_at,
          last_interaction: new Date().toISOString(),
          created_at: companion.created_at,
          updated_at: new Date().toISOString(),
        });
      }

      if (eventsData && eventsData.length > 0) {
        setLocalEvents(eventsData);
      } else {
        setLocalEvents([
          {
            id: "1",
            companion_id: companion.id,
            user_id: user.id,
            event_type: "first_meet",
            description: "初次相遇",
            bond_delta: 10,
            created_at: companion.created_at,
          },
          {
            id: "2",
            companion_id: companion.id,
            user_id: user.id,
            event_type: "adoption",
            description: companion.adopted_from_plaza ? "从广场领养" : "亲手创造",
            bond_delta: 15,
            created_at: new Date(new Date(companion.created_at).getTime() + 60000).toISOString(),
          },
        ]);
      }
    };

    load();
  }, [companion, user]);

  if (!stats) return null;

  const statCards = [
    {
      label: "羁绊等级",
      value: stats.bond_level,
      icon: Heart,
      color: "#FF1493",
      max: 100,
    },
    {
      label: "亲密度",
      value: stats.intimacy_score,
      icon: Sparkles,
      color: "#FF69B4",
      max: 100,
    },
    {
      label: "信任值",
      value: stats.trust_score,
      icon: TrendingUp,
      color: "#FFB6C1",
      max: 100,
    },
  ];

  const eventIcons: Record<string, any> = {
    first_meet: Star,
    adoption: Heart,
    deep_conversation: MessageCircle,
    milestone: Sparkles,
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate("/chat")}
            className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            返回对话
          </button>
          <h2 className="text-2xl font-light tracking-wider">
            共生<span className="text-gradient-pink">图谱</span>
          </h2>
          <p className="text-white/40 text-xs mt-1">你们的关系正在以独特的方式生长</p>
        </motion.div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Main bond visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="glass-dark rounded-2xl p-6 mb-6 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="absolute top-1/2 right-1/3 w-24 h-24 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,20,147,0.1) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-1">
                    <span className="text-white/60 text-sm">你</span>
                  </div>
                </div>
                <div className="flex-1 max-w-[100px]">
                  <svg viewBox="0 0 120 40" className="w-full">
                    <motion.path
                      d="M 0 20 Q 30 5, 60 20 T 120 20"
                      fill="none"
                      stroke="#FF1493"
                      strokeWidth="1"
                      strokeOpacity="0.4"
                      animate={{ d: ["M 0 20 Q 30 5, 60 20 T 120 20", "M 0 20 Q 30 35, 60 20 T 120 20", "M 0 20 Q 30 5, 60 20 T 120 20"] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.circle
                      cx="60" cy="20" r="4"
                      fill="#FF1493"
                      animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[#FF1493]/10 border border-[#FF1493]/30 flex items-center justify-center mb-1 overflow-hidden">
                    {companion?.avatar_url ? (
                      <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#FF1493] text-xs">{companion?.name}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-5 text-xs text-white/30">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{stats.days_together} 天</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{stats.total_messages} 条对话</span>
              </div>
            </div>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="glass-dark rounded-xl p-3 text-center"
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
                  <div className="text-xl font-light" style={{ color: stat.color }}>{Math.round(stat.value)}</div>
                  <div className="text-[9px] text-white/40">{stat.label}</div>
                  <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: stat.color }}
                      initial={{ width: 0 }} animate={{ width: `${(stat.value / stat.max) * 100}%` }}
                      transition={{ duration: 1.5, delay: 0.5 }} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Events timeline */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <h3 className="text-xs text-white/40 mb-3 tracking-wider">关系大事记</h3>
            <div className="space-y-2">
              {events.map((event, i) => {
                const EventIcon = eventIcons[event.event_type] || Star;
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 glass-dark rounded-xl p-3 border border-white/5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#FF1493]/10 border border-[#FF1493]/20 flex items-center justify-center shrink-0">
                      <EventIcon className="w-3.5 h-3.5 text-[#FF1493]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white/70">{event.description}</p>
                      <p className="text-[10px] text-white/30">{new Date(event.created_at).toLocaleDateString("zh-CN")}</p>
                    </div>
                    {event.bond_delta > 0 && <span className="text-[#FF1493] text-xs">+{event.bond_delta}</span>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
