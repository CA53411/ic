import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import { ArrowLeft, Sparkles, MapPin, Clock, Type, FileText, Globe, Info } from "lucide-react";

const BIG_FIVE = [
  { key: "openness", label: "开放性", labelEn: "Openness", desc: "好奇心、创造力与对新鲜体验的接受程度", lowLabel: "务实保守", highLabel: "好奇创造", color: "#FF1493" },
  { key: "conscientiousness", label: "尽责性", labelEn: "Conscientiousness", desc: "自律、条理性与目标导向的程度", lowLabel: "随性自由", highLabel: "严谨自律", color: "#FF69B4" },
  { key: "extraversion", label: "外向性", labelEn: "Extraversion", desc: "社交活跃度、能量来源与对外界刺激的反应", lowLabel: "内敛沉静", highLabel: "热情活跃", color: "#FFB6C1" },
  { key: "agreeableness", label: "宜人性", labelEn: "Agreeableness", desc: "同理心、合作意愿与待人友善的程度", lowLabel: "独立直接", highLabel: "温暖包容", color: "#FF6B9D" },
  { key: "neuroticism", label: "神经质", labelEn: "Neuroticism", desc: "情绪波动、敏感程度与对压力的回应方式", lowLabel: "稳定从容", highLabel: "细腻敏感", color: "#C71585" },
];

export default function CreatePage() {
  const navigate = useNavigate();
  const { user, setCompanion } = useStore();
  const { lang, setLang, t } = useLang();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [traits, setTraits] = useState<Record<string, number>>({ openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 });
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [location, setLocation] = useState("");
  const [compLang, setCompLang] = useState<"zh" | "en" | "both">("zh");
  const [creating, setCreating] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    const rationality = Math.round((traits.conscientiousness + (100 - traits.neuroticism)) / 2);
    const emotion = Math.round((traits.extraversion + traits.agreeableness + traits.openness) / 3);

    try {
      const { data, error } = await supabase.from("companions").insert({
        user_id: user.id, name: name.trim(), personality_desc: description || "A unique digital companion",
        rationality_level: rationality, emotion_level: emotion, big_five: traits,
        timezone, location: location || undefined, backstory: description, adopted_from_plaza: false, is_active: true,
      }).select().single();

      if (error || !data) {
        const mock = { id: crypto.randomUUID(), user_id: user.id, name: name.trim(), avatar_url: "/personas/serene.jpg",
          personality_desc: description || "A unique digital companion", rationality_level: rationality, emotion_level: emotion,
          big_five: traits, timezone, location: location || undefined, backstory: description, adopted_from_plaza: false,
          is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        setCompanion(mock as any);
      } else {
        setCompanion(data);
      }
      navigate("/chat");
    } catch (err) { console.error(err); } finally { setCreating(false); }
  };

  const setTrait = (key: string, val: number) => setTraits((p) => ({ ...p, [key]: val }));
  const steps = [
    { num: 1, title: t("stepName") }, { num: 2, title: t("stepPersona") },
    { num: 3, title: t("stepShape") }, { num: 4, title: t("stepAnchor") },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate("/onboard")} className="text-white/40 hover:text-white/80 flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" />{t("back")}
          </button>
          <div className="flex items-center gap-1 text-xs">
            <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
            <span className="text-white/10">/</span>
            <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
          </div>
        </div>
        <h2 className="text-lg font-light tracking-wider">{t("createTitle")}</h2>
        <p className="text-white/30 text-[10px]">{t("createSubtitle")}</p>
        <div className="flex gap-2 mt-3">
          {steps.map((s) => (
            <button key={s.num} onClick={() => setStep(s.num)}
              className={`flex-1 py-1 rounded-lg text-[10px] tracking-wider transition-all ${
                step === s.num ? "bg-[#FF1493]/20 text-[#FF1493] border border-[#FF1493]/30" : step > s.num ? "bg-white/5 text-white/40 border border-white/10" : "bg-white/5 text-white/15 border border-white/5"
              }`}>{s.title}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 py-1">
            <div>
              <label className="flex items-center gap-1.5 text-white/50 text-xs mb-2"><Type className="w-3.5 h-3.5" />{t("nameLabel")}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#FF1493]/40 transition-all" />
            </div>
            <p className="text-white/25 text-xs leading-relaxed">{t("nameHint")}</p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 py-1">
            <div>
              <label className="flex items-center gap-1.5 text-white/50 text-xs mb-1">{t("bigFiveLabel")}</label>
              <p className="text-white/20 text-[10px] mb-3">{t("bigFiveDesc")}</p>
              <div className="space-y-4">
                {BIG_FIVE.map((trait) => (
                  <div key={trait.key} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white/60">{lang === "zh" ? trait.label : trait.labelEn}</span>
                        <button onMouseEnter={() => setHovered(trait.key)} onMouseLeave={() => setHovered(null)}><Info className="w-3 h-3 text-white/20" /></button>
                      </div>
                      <span className="text-[10px] text-white/30">{traits[trait.key]}%</span>
                    </div>
                    {hovered === trait.key && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-[#FF1493]/50 mb-1">{trait.desc}</motion.div>}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/15 w-12 text-right shrink-0">{lang === "zh" ? trait.lowLabel : "Low"}</span>
                      <input type="range" min="0" max="100" value={traits[trait.key]}
                        onChange={(e) => setTrait(trait.key, Number(e.target.value))}
                        className="flex-1 h-1.5 bg-white/8 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(to right, ${trait.color}66 ${traits[trait.key]}%, rgba(255,255,255,0.06) ${traits[trait.key]}%)` }} />
                      <span className="text-[9px] text-white/15 w-12 shrink-0">{lang === "zh" ? trait.highLabel : "High"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-dark rounded-xl p-3 text-center">
              <div className="w-12 h-12 mx-auto rounded-full mb-2 transition-all duration-700"
                style={{ background: `radial-gradient(circle, #FF1493${Math.round(((traits.extraversion + traits.agreeableness) / 2) * 2.55).toString(16).padStart(2, "0")} 0%, transparent 70%)` }} />
              <p className="text-white/30 text-xs">
                {traits.extraversion > 60 && traits.agreeableness > 60 ? (lang === "zh" ? "温暖外向，乐于互动" : "Warm & outgoing")
                  : traits.conscientiousness > 60 && traits.neuroticism < 40 ? (lang === "zh" ? "沉稳可靠，情绪稳定" : "Reliable & stable")
                  : traits.openness > 60 && traits.neuroticism > 60 ? (lang === "zh" ? "敏感创造力，情感深邃" : "Creative & sensitive")
                  : (lang === "zh" ? "平衡而独特的数字生命" : "Balanced & unique")}
              </p>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 py-1">
            <div>
              <label className="flex items-center gap-1.5 text-white/50 text-xs mb-2"><FileText className="w-3.5 h-3.5" />{t("descLabel")}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descPlaceholder")} rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#FF1493]/40 transition-all resize-none leading-relaxed" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["温柔", "毒舌", "哲学家", "治愈系", "傲娇", "直球", "神秘", "阳光"].map((tag) => (
                <button key={tag} onClick={() => setDescription((p) => (p ? p + "，" + tag : tag))}
                  className="px-2.5 py-1 bg-white/5 border border-white/8 rounded-full text-white/30 text-[10px] hover:bg-[#FF1493]/8 hover:text-[#FF1493] transition-all">{tag}</button>
              ))}
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-white/50 text-xs mb-2"><Globe className="w-3.5 h-3.5" />{t("langLabel")}</label>
              <div className="flex gap-2">
                {[
                  { key: "zh" as const, label: t("langZh"), desc: t("langZhDesc") },
                  { key: "en" as const, label: t("langEn"), desc: t("langEnDesc") },
                  { key: "both" as const, label: t("langBoth"), desc: t("langBothDesc") },
                ].map((opt) => (
                  <button key={opt.key} onClick={() => setCompLang(opt.key)}
                    className={`flex-1 p-2.5 rounded-xl border text-left transition-all ${compLang === opt.key ? "border-[#FF1493]/30 bg-[#FF1493]/8" : "border-white/8 bg-white/4"}`}>
                    <p className={`text-xs ${compLang === opt.key ? "text-[#FF1493]" : "text-white/50"}`}>{opt.label}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 py-1">
            <div>
              <label className="flex items-center gap-1.5 text-white/50 text-xs mb-2"><Clock className="w-3.5 h-3.5" />{t("timezoneLabel")}</label>
              <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF1493]/40 transition-all" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-white/50 text-xs mb-2"><MapPin className="w-3.5 h-3.5" />{t("locationLabel")}</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#FF1493]/40 transition-all" />
            </div>
            <div className="glass-pink rounded-xl p-4 text-center">
              <h4 className="text-[#FF1493] text-sm mb-1">{name || "..."}</h4>
              <p className="text-white/35 text-[10px]">O{traits.openness} C{traits.conscientiousness} E{traits.extraversion} A{traits.agreeableness} N{traits.neuroticism}</p>
              <p className="text-white/15 text-[9px] mt-1">{timezone} · {compLang === "zh" ? "中文" : compLang === "en" ? "English" : "双语"}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-white/5">
        <div className="flex gap-2">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs hover:bg-white/10 transition-all">{t("prev")}</button>
          )}
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 py-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-xs hover:bg-[#FF1493]/30 transition-all">{t("next")}</button>
          ) : (
            <button onClick={handleCreate} disabled={creating || !name.trim()}
              className="flex-1 py-2 bg-[#FF1493]/30 border border-[#FF1493]/50 rounded-xl text-[#FF1493] text-xs hover:bg-[#FF1493]/40 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />{creating ? "..." : t("injectSoul")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
