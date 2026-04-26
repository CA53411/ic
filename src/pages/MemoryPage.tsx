import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import type { Memory } from "../types";
import { ArrowLeft, Brain, Star, Clock, Bookmark, Heart } from "lucide-react";

export default function MemoryPage() {
  const navigate = useNavigate();
  const { companion, user } = useStore();
  const [memories, setLocalMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<"all" | "short_term" | "long_term" | "milestone">("all");

  useEffect(() => {
    if (!companion || !user) return;

    const load = async () => {
      const { data } = await supabase
        .from("memories")
        .select("*")
        .eq("companion_id", companion.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        setLocalMemories(data);
      } else {
        // Demo memories
        const demo: Memory[] = [
          {
            id: "1",
            companion_id: companion.id,
            user_id: user.id,
            content: "第一次见面时的对话",
            memory_type: "milestone",
            importance_score: 1.0,
            created_at: companion.created_at,
          },
          {
            id: "2",
            companion_id: companion.id,
            user_id: user.id,
            content: "用户提到喜欢深夜听雨声",
            memory_type: "long_term",
            importance_score: 0.7,
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: "3",
            companion_id: companion.id,
            user_id: user.id,
            content: "用户今天工作很累，需要安慰",
            memory_type: "short_term",
            importance_score: 0.4,
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ];
        setLocalMemories(demo);
      }
    };

    load();
  }, [companion, user]);

  const filtered = filter === "all" ? memories : memories.filter((m) => m.memory_type === filter);

  const typeConfig = {
    milestone: { icon: Star, color: "#FF1493", label: "里程碑" },
    long_term: { icon: Bookmark, color: "#FF69B4", label: "长期记忆" },
    short_term: { icon: Clock, color: "#FFB6C1", label: "短期记忆" },
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
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-[#FF1493]" />
            <h2 className="text-2xl font-light tracking-wider">
              记忆<span className="text-gradient-pink">殿堂</span>
            </h2>
          </div>
          <p className="text-white/40 text-xs mt-1">你们共同走过的每一刻，都被珍藏在这里</p>
        </motion.div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(["all", "milestone", "long_term", "short_term"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs tracking-wider whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-[#FF1493]/20 text-[#FF1493] border border-[#FF1493]/30"
                  : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
              }`}
            >
              {f === "all" ? "全部" : typeConfig[f]?.label}
            </button>
          ))}
        </div>

        {/* Memories list */}
        <div className="space-y-3 max-w-2xl mx-auto">
          {filtered.map((memory, i) => {
            const config = typeConfig[memory.memory_type] || typeConfig.short_term;
            const Icon = config.icon;
            return (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-dark rounded-xl p-4 border border-white/5 hover:border-[#FF1493]/20 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                    style={{ background: `${config.color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/80 text-sm leading-relaxed mb-2 font-light">{memory.content}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-white/30">{config.label}</span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${memory.importance_score * 100}%`,
                            background: config.color,
                            opacity: 0.6,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-white/20">
                        {new Date(memory.created_at).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Heart className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">记忆还在编织中...</p>
          </div>
        )}
      </div>
    </div>
  );
}
