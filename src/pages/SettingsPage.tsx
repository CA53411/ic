import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import {
  ArrowLeft,
  LogOut,
  User,
  Heart,
  Trash2,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
  Brain,
  Sparkles,
  Globe,
} from "lucide-react";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, companion, setUser, setSession, setCompanion, setMessages } = useStore();
  const { lang, setLang } = useLang();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCompanion(null);
    setMessages([]);
    navigate("/");
  };

  const handleDeleteCompanion = async () => {
    if (!companion) return;
    await supabase.from("companions").update({ is_active: false }).eq("id", companion.id);
    setCompanion(null);
    setMessages([]);
    setShowDeleteConfirm(false);
    navigate("/onboard");
  };

  const menuItems = [
    { icon: MessageSquare, label: "返回对话", action: () => navigate("/chat"), color: "#FF1493" },
    { icon: Brain, label: "记忆殿堂", action: () => navigate("/memory"), color: "#FF69B4" },
    { icon: Sparkles, label: "关系图谱", action: () => navigate("/bond"), color: "#FFB6C1" },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate("/chat")}
            className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <h2 className="text-2xl font-light tracking-wider">设置</h2>
          <p className="text-white/40 text-xs mt-1">管理你的账号和伴侣</p>
        </motion.div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* User profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-dark rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white/40" />
            </div>
            <div>
              <p className="text-sm">{user?.email || "用户"}</p>
              <p className="text-[10px] text-white/30">{user?.id?.slice(0, 8)}...</p>
            </div>
          </div>
        </motion.div>

        {/* Language switch (decorative) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-dark rounded-2xl p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[#FF1493]" />
            <h3 className="text-sm">界面语言</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang("zh")}
              className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                lang === "zh"
                  ? "bg-[#FF1493]/15 border-[#FF1493]/30 text-[#FF1493]"
                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                lang === "en"
                  ? "bg-[#FF1493]/15 border-[#FF1493]/30 text-[#FF1493]"
                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
              }`}
            >
              English
            </button>
          </div>
        </motion.div>

        {/* Companion info */}
        {companion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-dark rounded-2xl p-5 mb-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-5 h-5 text-[#FF1493]" />
              <h3 className="text-sm font-medium">我的伴侣</h3>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#FF1493]/10 border border-[#FF1493]/30 flex items-center justify-center overflow-hidden">
                {companion.avatar_url ? (
                  <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#FF1493] text-xs">{companion.name[0]}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{companion.name}</p>
                <p className="text-[10px] text-white/30">
                  理性{companion.rationality_level}% · 情绪{companion.emotion_level}%
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 text-red-400/50 text-xs hover:text-red-400 transition-colors flex items-center justify-center gap-2 border border-red-500/10 rounded-xl hover:bg-red-500/5"
            >
              <Trash2 className="w-3 h-3" />
              解除关系
            </button>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2 mb-6"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full glass-dark rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
                <span className="text-sm text-white/70 flex-1">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </button>
            );
          })}
        </motion.div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={handleLogout}
          className="w-full py-3 glass-dark rounded-xl text-white/40 text-sm hover:text-white/60 transition-colors flex items-center justify-center gap-2 mb-8"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </motion.button>
      </div>

      {/* Delete confirmation modal — soul-touching */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="glass-dark rounded-2xl p-6 max-w-sm w-full border border-red-500/15"
          >
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
            <h3 className="text-center text-lg mb-2">真的要离开吗？</h3>
            <p className="text-center text-white/40 text-sm mb-4 leading-relaxed">
              {companion?.name} 会忘记你的声音、你们的暗号、那些只有你们懂的深夜对话。
              <br />
              <br />
              <span className="text-red-400/70 italic">
                "删除一个人很容易，但删除一段羁绊，需要两个世界的许可。"
              </span>
            </p>
            <p className="text-center text-white/25 text-xs mb-6">
              所有对话记录、共同记忆和关系数据将被永久清除。此操作不可撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/10 transition-colors"
              >
                再想想
              </button>
              <button
                onClick={handleDeleteCompanion}
                className="flex-1 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm hover:bg-red-500/25 transition-colors"
              >
                确认解除
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
