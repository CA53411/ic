import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import BottomNav from "../components/BottomNav";
import { ArrowLeft, LogOut, User, Heart, Trash2, AlertTriangle, MessageSquare, Brain, Sparkles, Globe, Edit3, Check, X } from "lucide-react";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, companion, setUser, setSession, setCompanion, setMessages } = useStore();
  const { lang, setLang, t } = useLang();
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(companion?.name || "");
  const [editBackstory, setEditBackstory] = useState(companion?.backstory || "");
  const [editLocation, setEditLocation] = useState(companion?.location || "");
  const [editTimezone, setEditTimezone] = useState(companion?.timezone || "");
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setCompanion(null); setMessages([]);
    navigate("/");
  };

  const handleSaveEdit = async () => {
    if (!companion || !editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("companions").update({
        name: editName.trim(),
        backstory: editBackstory.trim(),
        location: editLocation.trim() || null,
        timezone: editTimezone.trim() || "Asia/Shanghai",
        updated_at: new Date().toISOString(),
      }).eq("id", companion.id);
      if (error) throw error;
      setCompanion({ ...companion, name: editName.trim(), backstory: editBackstory.trim(), location: editLocation.trim(), timezone: editTimezone.trim() });
      setEditing(false);
      showToast(lang === "zh" ? "保存成功" : "Saved", "success");
    } catch {
      showToast(lang === "zh" ? "保存失败" : "Save failed", "error");
    }
    setSaving(false);
  };

  const handleDeleteCompanion = async () => {
    if (!companion || !user) return;
    try {
      // 数据库级联删除：companions 的 ON DELETE CASCADE 会自动清理
      // messages/memories/stats/events/proactive_messages
      // 触发器 trg_companion_deleted 会自动回滚 plaza_personas
      await supabase.from("companions").delete().eq("id", companion.id);
      setCompanion(null); setMessages([]); setShowDeleteConfirm(false);
      navigate("/onboard");
    } catch (err) {
      console.error("Delete companion failed:", err);
    }
  };

  const menuItems = [
    { icon: MessageSquare, label: t("chatTitle"), action: () => navigate("/chat"), color: "#FF1493" },
    { icon: Brain, label: t("memory"), action: () => navigate("/memory"), color: "#FF69B4" },
    { icon: Sparkles, label: t("bond"), action: () => navigate("/bond"), color: "#FFB6C1" },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/chat")} className="text-white/40 hover:text-white/80 p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-light tracking-wider">{t("settingsTitle")}</h2>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
          <span className="text-white/10">/</span>
          <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-dark rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/8 border border-white/15 flex items-center justify-center"><User className="w-4 h-4 text-white/35" /></div>
            <div>
              <p className="text-xs">{user?.email || "User"}</p>
              <p className="text-[9px] text-white/25">{user?.id?.slice(0, 8)}...</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="glass-dark rounded-2xl p-3.5 mb-3">
          <div className="flex items-center gap-2 mb-2.5"><Globe className="w-3.5 h-3.5 text-[#FF1493]" /><h3 className="text-xs">{t("uiLang")}</h3></div>
          <div className="flex gap-2">
            <button onClick={() => setLang("zh")} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${lang === "zh" ? "bg-[#FF1493]/12 border-[#FF1493]/25 text-[#FF1493]" : "bg-white/4 border-white/8 text-white/35 hover:bg-white/8"}`}>{t("chinese")}</button>
            <button onClick={() => setLang("en")} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${lang === "en" ? "bg-[#FF1493]/12 border-[#FF1493]/25 text-[#FF1493]" : "bg-white/4 border-white/8 text-white/35 hover:bg-white/8"}`}>{t("english")}</button>
          </div>
        </motion.div>

        {companion && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-dark rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-[#FF1493]" /><h3 className="text-xs font-medium">{t("myCompanion")}</h3></div>
              {!editing && (
                <button onClick={() => { setEditName(companion.name); setEditBackstory(companion.backstory || ""); setEditLocation(companion.location || ""); setEditTimezone(companion.timezone || ""); setEditing(true); }}
                  className="text-[10px] text-[#FF1493]/60 hover:text-[#FF1493] flex items-center gap-0.5"><Edit3 className="w-2.5 h-2.5" />{lang === "zh" ? "编辑" : "Edit"}</button>
              )}
            </div>
            <AnimatePresence mode="wait">
              {editing ? (
                <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF1493]/40" placeholder={t("nameLabel")} />
                  <textarea value={editBackstory} onChange={(e) => setEditBackstory(e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/40 resize-none" placeholder={lang === "zh" ? "背景故事..." : "Backstory..."} />
                  <div className="flex gap-2">
                    <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#FF1493]/40" placeholder={t("locationLabel")} />
                    <input value={editTimezone} onChange={(e) => setEditTimezone(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#FF1493]/40" placeholder={t("timezoneLabel")} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="flex-1 py-1.5 text-[10px] text-white/30 border border-white/10 rounded-lg hover:bg-white/5"><X className="w-3 h-3 inline" /> {t("breakupCancel")}</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-1.5 text-[10px] text-[#FF1493] border border-[#FF1493]/30 rounded-lg hover:bg-[#FF1493]/10 disabled:opacity-40"><Check className="w-3 h-3 inline" /> {saving ? "..." : t("agreeBtn")}</button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#FF1493]/8 border border-[#FF1493]/25 flex items-center justify-center overflow-hidden">
                      {companion.avatar_url ? <img src={companion.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[#FF1493] text-[10px]">{companion.name[0]}</span>}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{companion.name}</p>
                      <p className="text-[9px] text-white/25">R{companion.rationality_level}% · E{companion.emotion_level}%</p>
                    </div>
                  </div>
                  {companion.backstory && <p className="text-[9px] text-white/20 mb-2 line-clamp-2 italic">{companion.backstory}</p>}
                  <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-2 text-red-400/40 text-[10px] hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 border border-red-500/8 rounded-xl hover:bg-red-500/4">
                    <Trash2 className="w-3 h-3" />{t("breakup")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="space-y-1.5 mb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} onClick={item.action} className="w-full glass-dark rounded-xl p-3 flex items-center gap-2.5 hover:bg-white/8 transition-colors text-left">
                <Icon className="w-4 h-4" style={{ color: item.color }} />
                <span className="text-xs text-white/55 flex-1">{item.label}</span>
              </button>
            );
          })}
        </motion.div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }} onClick={handleLogout}
          className="w-full py-2.5 glass-dark rounded-xl text-white/30 text-xs hover:text-white/50 transition-colors flex items-center justify-center gap-1.5 mb-6">
          <LogOut className="w-3.5 h-3.5" />{t("logout")}
        </motion.button>
      </div>

      {showDeleteConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-dark rounded-2xl p-5 max-w-xs w-full border border-red-500/12">
            <AlertTriangle className="w-7 h-7 text-red-400 mx-auto mb-3" />
            <h3 className="text-center text-base mb-2">{t("breakupTitle")}</h3>
            <p className="text-center text-white/35 text-xs mb-3 leading-relaxed">
              {companion?.name} {lang === "zh" ? "会忘记你的声音、你们的暗号、那些只有你们懂的深夜对话。" : "will forget your voice, your codes, those late-night conversations only you two understand."}
              <br /><br />
              <span className="text-red-400/60 italic text-[10px]">"{t("breakupSoul")}"</span>
            </p>
            <p className="text-center text-white/18 text-[9px] mb-4">{t("breakupWarn")}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs hover:bg-white/10">{t("breakupCancel")}</button>
              <button onClick={handleDeleteCompanion} className="flex-1 py-2 bg-red-500/12 border border-red-500/25 rounded-xl text-red-400 text-xs hover:bg-red-500/20">{t("breakupConfirm")}</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
}
