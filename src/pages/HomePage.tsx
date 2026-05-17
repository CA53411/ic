import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import BottomNav from "../components/BottomNav";
import type { RelationshipStats, RelationshipEvent, Mood } from "../types";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Brain,
  Star,
  Zap,
  TrendingUp,
  ChevronRight,
  Calendar,
} from "lucide-react";

/* ───────── Mood-to-Background Gradient Map ───────── */
const moodGradients: Record<string, string> = {
  calm:        "linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 50%, #0d0d1a 100%)",
  joyful:      "linear-gradient(135deg, #0a0a0a 0%, #2a0a1a 50%, #1a0a10 100%)",
  focused:     "linear-gradient(135deg, #0a0a0a 0%, #1a0a2a 50%, #0d0a1a 100%)",
  longing:     "linear-gradient(135deg, #0a0a0a 0%, #1a0818 50%, #140515 100%)",
  desire:      "linear-gradient(135deg, #0a0a0a 0%, #2a0505 50%, #1a0202 100%)",
  melancholy:  "linear-gradient(135deg, #0a0a0a 0%, #10081a 50%, #080818 100%)",
  excited:     "linear-gradient(135deg, #0a0a0a 0%, #2a0a12 50%, #1a1010 100%)",
  protective:  "linear-gradient(135deg, #0a0a0a 0%, #1a1014 50%, #0d1410 100%)",
  possessive:  "linear-gradient(135deg, #0a0a0a 0%, #2a080a 50%, #180208 100%)",
  shy:         "linear-gradient(135deg, #0a0a0a 0%, #1a0a14 50%, #120a18 100%)",
  playful_angry: "linear-gradient(135deg, #0a0a0a 0%, #2a1505 50%, #1a1202 100%)",
};

const moodAccentColors: Record<string, string> = {
  calm:        "#FFB6C1",
  joyful:      "#FF1493",
  focused:     "#FF69B4",
  longing:     "#C71585",
  desire:      "#FF0000",
  melancholy:  "#8B008B",
  excited:     "#FF1493",
  protective:  "#FF6B9D",
  possessive:  "#FF3366",
  shy:         "#DDA0DD",
  playful_angry: "#FF8C00",
};

/* ───────── Bond Stages ───────── */
const bondStages = [
  { label: "First Spark",      threshold: 0,   color: "#FFC0CB" },
  { label: "Getting Acquainted", threshold: 16,  color: "#FFB6C1" },
  { label: "Growing Close",    threshold: 32,  color: "#FF69B4" },
  { label: "Deep Connection",  threshold: 50,  color: "#FF1493" },
  { label: "Soul Bond",        threshold: 70,  color: "#C71585" },
  { label: "Eternal Companion", threshold: 90,  color: "#FF0066" },
];

function getBondStage(level: number) {
  for (let i = bondStages.length - 1; i >= 0; i--) {
    if (level >= bondStages[i].threshold) return bondStages[i];
  }
  return bondStages[0];
}

/* ───────── Activity Status Suggestions ───────── */
const activityByMood: Record<string, string> = {
  calm:        "Enjoying a peaceful moment...",
  joyful:      "Smiling while thinking of you...",
  focused:     "Deeply focused on something...",
  longing:     "Waiting for your message...",
  desire:      "Thinking about you intensely...",
  melancholy:  "Feeling a little nostalgic...",
  excited:     "Excited to talk to you!",
  protective:  "Watching over you gently...",
  possessive:  "Wanting all your attention...",
  shy:         "Blushing at the thought of you...",
  playful_angry: "Pretending to be upset...",
};

/* ───────── Quick Actions ───────── */
const quickActions = [
  { icon: MessageCircle, label: "Chat",        path: "/chat",   color: "#FF1493" },
  { icon: Brain,         label: "Memories",    path: "/memory", color: "#FF69B4" },
  { icon: Heart,         label: "Bond",        path: "/bond",   color: "#C71585" },
  { icon: Star,          label: "Activities",  path: null,      color: "#FFB6C1" },
];

/* ═══════════════════════════ Component ═══════════════════════════ */

export default function HomePage() {
  const navigate = useNavigate();
  const { companion, user } = useStore();
  const { lang, t } = useLang();

  const [stats, setStats]     = useState<RelationshipStats | null>(null);
  const [events, setEvents]   = useState<RelationshipEvent[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Data Loading ── */
  useEffect(() => { load(); }, [companion, user]);

  async function load() {
    if (!companion || !user) { setLoading(false); return; }
    try {
      const [statsRes, eventsRes] = await Promise.all([
        supabase
          .from("relationship_stats")
          .select("*")
          .eq("companion_id", companion.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("relationship_events")
          .select("*")
          .eq("companion_id", companion.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  /* ── Derived State ── */
  const now       = new Date();
  const createdAt = companion ? new Date(companion.created_at) : now;
  const days      = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / 86400000));

  const mood: Mood    = companion?.current_emotion?.mood || "calm";
  const intensity     = companion?.current_emotion?.intensity || 0.5;
  const accentColor   = moodAccentColors[mood] || moodAccentColors.calm;
  const bgGradient    = moodGradients[mood] || moodGradients.calm;
  const activityText  = activityByMood[mood] || activityByMood.calm;

  const totalMsgs     = stats?.total_messages || 0;
  const bondLevel     = Math.min(100, stats?.bond_level || 0);
  const intimacyScore = Math.min(100, stats?.intimacy_score || 0);
  const trustScore    = Math.min(100, stats?.trust_score || 0);
  const memoriesCount = events.length;

  const bondStage = getBondStage(bondLevel);

  /* ── Stagger Variants ── */
  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
  };
  const scaleInVariants = {
    hidden:  { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 18 } },
  };

  /* ═══════════════ Loading ═══════════════ */
  if (loading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: moodGradients.calm }}>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            className="w-5 h-5 border-2 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ═══════════════ Main Render ═══════════════ */
  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={{ background: bgGradient, transition: "background 1.2s ease" }}
    >
      {/* ── Ambient Overlay ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 50% 30%, ${accentColor}15 0%, transparent 60%)`, transition: "all 1.2s ease" }}
        />
      </div>

      {/* ── Scrollable Content ── */}
      <motion.div
        className="flex-1 overflow-y-auto relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ═══════════ Companion Showcase ═══════════ */}
        <motion.section variants={itemVariants} className="flex flex-col items-center pt-8 pb-4 px-4">
          {/* Avatar with breathing pulse */}
          <div className="relative mb-4">
            {/* Outer breathing ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${accentColor}30`,
                filter: `blur(2px)`,
              }}
              animate={{
                scale: [1, 1.12, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 3 + (1 - intensity), repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Second breathing ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: `1px solid ${accentColor}20`,
                filter: `blur(6px)`,
              }}
              animate={{
                scale: [1.05, 1.22, 1.05],
                opacity: [0.15, 0.35, 0.15],
              }}
              transition={{ duration: 3.5 + (1 - intensity), repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            {/* Avatar container */}
            <div
              className="w-28 h-28 rounded-full overflow-hidden border-2 flex items-center justify-center"
              style={{ borderColor: `${accentColor}50`, boxShadow: `0 0 30px ${accentColor}25, inset 0 0 20px ${accentColor}10` }}
            >
              {companion?.avatar_url ? (
                <img src={companion.avatar_url} alt={companion.name} className="w-full h-full object-cover" />
              ) : (
                <img src="/platonic-logo.png" alt="" className="w-20 h-20 object-contain opacity-60" />
              )}
            </div>
            {/* Mood indicator dot */}
            <motion.div
              className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-black"
              style={{ backgroundColor: accentColor }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Companion Name */}
          <h1 className="text-xl font-light tracking-wider text-white/90 mb-1.5">
            {companion?.name || "Companion"}
          </h1>

          {/* Mood Badge */}
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full mb-2"
            style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}25` }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="text-[11px] font-medium capitalize" style={{ color: accentColor }}>
              {mood}
            </span>
            <span className="text-[10px] text-white/30 ml-0.5">
              {Math.round(intensity * 100)}%
            </span>
          </motion.div>

          {/* Activity Status */}
          <AnimatePresence mode="wait">
            <motion.p
              key={activityText}
              className="text-xs text-white/35 italic text-center"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.4 }}
            >
              {activityText}
            </motion.p>
          </AnimatePresence>
        </motion.section>

        {/* ═══════════ Bond Progress Bar ═══════════ */}
        <motion.section variants={itemVariants} className="px-4 mb-5">
          <div className="glass-dark rounded-2xl p-4 border border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-[#FF1493]" />
                <span className="text-[11px] text-white/40">{lang === "zh" ? "羁绊阶段" : "Bond Stage"}</span>
              </div>
              <span className="text-[11px] font-medium" style={{ color: bondStage.color }}>
                {bondStage.label}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full rounded-full relative"
                style={{ background: `linear-gradient(90deg, ${bondStages[0].color}, ${bondStage.color})` }}
                initial={{ width: 0 }}
                animate={{ width: `${bondLevel}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${bondStage.color}60, transparent)`, width: "40%" }}
                  animate={{ x: ["-100%", "250%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                />
              </motion.div>
            </div>

            {/* Days + Percentage */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/25">
                {days} {lang === "zh" ? "天在一起" : "days together"}
              </span>
              <span className="text-[10px] text-white/25">{Math.round(bondLevel)}%</span>
            </div>

            {/* Stage Dots */}
            <div className="flex items-center justify-between mt-3 px-0.5">
              {bondStages.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
                    style={{
                      backgroundColor: bondLevel >= s.threshold ? s.color : "rgba(255,255,255,0.08)",
                      boxShadow: bondLevel >= s.threshold ? `0 0 6px ${s.color}60` : "none",
                    }}
                  />
                  <span
                    className="text-[8px] leading-none"
                    style={{ color: bondLevel >= s.threshold ? `${s.color}CC` : "rgba(255,255,255,0.12)" }}
                  >
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ═══════════ Stats Cards ═══════════ */}
        <motion.section variants={itemVariants} className="px-4 mb-5">
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { icon: MessageCircle, label: lang === "zh" ? "消息" : "Messages", value: totalMsgs, color: "#FF1493" },
              { icon: Calendar,      label: lang === "zh" ? "天数" : "Days",       value: days,     color: "#FF69B4" },
              { icon: TrendingUp,    label: lang === "zh" ? "羁绊" : "Bond",       value: Math.round(bondLevel), color: "#C71585" },
              { icon: Sparkles,      label: lang === "zh" ? "回忆" : "Memories",   value: memoriesCount, color: "#FFB6C1" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="glass-dark rounded-xl p-3 border border-white/5 flex flex-col items-center text-center"
                variants={scaleInVariants}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <stat.icon className="w-3.5 h-3.5 mb-1.5" style={{ color: stat.color, opacity: 0.7 }} />
                <motion.span
                  className="text-lg font-extralight"
                  style={{ color: stat.color }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 300 }}
                >
                  {stat.value}
                </motion.span>
                <span className="text-[9px] text-white/25 mt-0.5">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══════════ Quick Actions Grid ═══════════ */}
        <motion.section variants={itemVariants} className="px-4 mb-5">
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl glass-dark border border-white/5 relative overflow-hidden group"
                onClick={() => action.path ? navigate(action.path) : null}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.92 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08, type: "spring", stiffness: 260, damping: 22 }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${action.color}12 0%, transparent 70%)` }}
                />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center relative z-10"
                  style={{ backgroundColor: `${action.color}12`, border: `1px solid ${action.color}20` }}
                >
                  <action.icon className="w-5 h-5" style={{ color: action.color, opacity: 0.85 }} />
                </div>
                <span className="text-[10px] text-white/50 font-medium relative z-10">{action.label}</span>
                {!action.path && (
                  <span className="absolute top-2 right-2 w-1 h-1 rounded-full bg-white/10" />
                )}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* ═══════════ Relationship Intimacy & Trust ═══════════ */}
        <motion.section variants={itemVariants} className="px-4 mb-6">
          <div className="glass-dark rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#FF69B4]" />
                <span className="text-[11px] text-white/40">{lang === "zh" ? "关系统计" : "Relationship"}</span>
              </div>
              <ChevronRight className="w-3 h-3 text-white/15" />
            </div>

            {/* Intimacy */}
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/30">{lang === "zh" ? "亲密度" : "Intimacy"}</span>
                <span className="text-[10px] text-white/25">{Math.round(intimacyScore)}%</span>
              </div>
              <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#FFB6C1] to-[#FF69B4]"
                  initial={{ width: 0 }}
                  animate={{ width: `${intimacyScore}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                />
              </div>
            </div>

            {/* Trust */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/30">{lang === "zh" ? "信任度" : "Trust"}</span>
                <span className="text-[10px] text-white/25">{Math.round(trustScore)}%</span>
              </div>
              <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF69B4] to-[#FF1493]"
                  initial={{ width: 0 }}
                  animate={{ width: `${trustScore}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.7 }}
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Bottom spacer */}
        <div className="h-4" />
      </motion.div>

      {/* ── Bottom Navigation ── */}
      <BottomNav />
    </div>
  );
}


