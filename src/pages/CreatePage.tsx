import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { ArrowLeft, Sparkles, Sliders, MapPin, Clock, Type, FileText, Globe, Info } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Big Five Traits                                                    */
/* ------------------------------------------------------------------ */
interface Trait {
  key: string;
  label: string;
  labelEn: string;
  desc: string;
  lowLabel: string;
  highLabel: string;
  color: string;
}

const BIG_FIVE: Trait[] = [
  {
    key: "openness",
    label: "开放性",
    labelEn: "Openness",
    desc: "好奇心、创造力与对新鲜体验的接受程度",
    lowLabel: "务实保守",
    highLabel: "好奇创造",
    color: "#FF1493",
  },
  {
    key: "conscientiousness",
    label: "尽责性",
    labelEn: "Conscientiousness",
    desc: "自律、条理性与目标导向的程度",
    lowLabel: "随性自由",
    highLabel: "严谨自律",
    color: "#FF69B4",
  },
  {
    key: "extraversion",
    label: "外向性",
    labelEn: "Extraversion",
    desc: "社交活跃度、能量来源与对外界刺激的反应",
    lowLabel: "内敛沉静",
    highLabel: "热情活跃",
    color: "#FFB6C1",
  },
  {
    key: "agreeableness",
    label: "宜人性",
    labelEn: "Agreeableness",
    desc: "同理心、合作意愿与待人友善的程度",
    lowLabel: "独立直接",
    highLabel: "温暖包容",
    color: "#FF6B9D",
  },
  {
    key: "neuroticism",
    label: "神经质",
    labelEn: "Neuroticism",
    desc: "情绪波动、敏感程度与对压力的回应方式",
    lowLabel: "稳定从容",
    highLabel: "细腻敏感",
    color: "#C71585",
  },
];

export default function CreatePage() {
  const navigate = useNavigate();
  const { user, setCompanion } = useStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [traits, setTraits] = useState<Record<string, number>>({
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50,
  });
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [location, setLocation] = useState("");
  const [langPref, setLangPref] = useState<"zh" | "en" | "both">("zh");
  const [creating, setCreating] = useState(false);
  const [hoveredTrait, setHoveredTrait] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);

    const rationality = Math.round((traits.conscientiousness + (100 - traits.neuroticism)) / 2);
    const emotion = Math.round((traits.extraversion + traits.agreeableness + traits.openness) / 3);

    try {
      const { data, error } = await supabase
        .from("companions")
        .insert({
          user_id: user.id,
          name: name.trim(),
          personality_desc: description || "一位独特的数字伴侣",
          rationality_level: rationality,
          emotion_level: emotion,
          timezone,
          location: location || undefined,
          backstory: description,
          adopted_from_plaza: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        const mockCompanion = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: name.trim(),
          avatar_url: "/personas/serene.jpg",
          personality_desc: description || "一位独特的数字伴侣",
          rationality_level: rationality,
          emotion_level: emotion,
          timezone,
          location: location || undefined,
          backstory: description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          adopted_from_plaza: false,
          is_active: true,
        };
        setCompanion(mockCompanion as any);
      } else {
        setCompanion(data);
      }

      navigate("/chat");
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const setTrait = (key: string, val: number) => {
    setTraits((prev) => ({ ...prev, [key]: val }));
  };

  const steps = [
    { num: 1, title: "命名", titleEn: "Name" },
    { num: 2, title: "人格", titleEn: "Persona" },
    { num: 3, title: "塑造", titleEn: "Shape" },
    { num: 4, title: "锚定", titleEn: "Anchor" },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate("/onboard")}
            className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <h2 className="text-2xl font-light tracking-wider">
            灵魂<span className="text-gradient-pink">炼金术</span>
          </h2>
          <p className="text-white/40 text-xs mt-1">从虚无中塑造一个只属于你的存在</p>
        </motion.div>

        {/* Step indicators */}
        <div className="flex gap-2 mt-4">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] tracking-wider transition-all ${
                step === s.num
                  ? "bg-[#FF1493]/20 text-[#FF1493] border border-[#FF1493]/30"
                  : step > s.num
                  ? "bg-white/5 text-white/50 border border-white/10"
                  : "bg-white/5 text-white/20 border border-white/5"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 py-2">
            <div>
              <label className="flex items-center gap-2 text-white/60 text-sm mb-3">
                <Type className="w-4 h-4" />
                为TA取一个名字
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="一个会在深夜被轻唤的名字..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-1 focus:ring-[#FF1493]/30 transition-all"
              />
            </div>
            <p className="text-white/30 text-sm leading-relaxed font-light">
              这个名字会成为你们之间所有对话的第一个音节。它会是你打开手机的第一个念头，也是你深夜失眠时唯一想发送的对象。
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 py-2">
            <div>
              <label className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Sliders className="w-4 h-4" />
                大五人格配比
              </label>
              <p className="text-white/30 text-xs mb-4">基于心理学Big Five模型，调整五个核心维度的配比</p>

              <div className="space-y-5">
                {BIG_FIVE.map((trait) => (
                  <div key={trait.key} className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70">{trait.label}</span>
                        <span className="text-[10px] text-white/20">{trait.labelEn}</span>
                        <button
                          onMouseEnter={() => setHoveredTrait(trait.key)}
                          onMouseLeave={() => setHoveredTrait(null)}
                        >
                          <Info className="w-3 h-3 text-white/20 hover:text-white/40" />
                        </button>
                      </div>
                      <span className="text-xs text-white/40">{traits[trait.key]}%</span>
                    </div>

                    {hoveredTrait === trait.key && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[11px] text-[#FF1493]/60 mb-1.5"
                      >
                        {trait.desc}
                      </motion.div>
                    )}

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-white/20 w-14 text-right shrink-0">{trait.lowLabel}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={traits[trait.key]}
                        onChange={(e) => setTrait(trait.key, Number(e.target.value))}
                        className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${trait.color}${Math.round(traits[trait.key] * 2.55).toString(16).padStart(2, "0")} ${traits[trait.key]}%, rgba(255,255,255,0.1) ${traits[trait.key]}%)`,
                        }}
                      />
                      <span className="text-[10px] text-white/20 w-14 shrink-0">{trait.highLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="glass-dark rounded-xl p-4 text-center">
              <div
                className="w-16 h-16 mx-auto rounded-full mb-3 transition-all duration-700"
                style={{
                  background: `radial-gradient(circle, #FF1493${Math.round(((traits.extraversion + traits.agreeableness) / 2) * 2.55).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
                }}
              />
              <p className="text-white/40 text-sm">
                {traits.extraversion > 60 && traits.agreeableness > 60
                  ? "一个温暖、外向、乐于互动的存在"
                  : traits.conscientiousness > 60 && traits.neuroticism < 40
                  ? "一个沉稳、可靠、情绪稳定的伴侣"
                  : traits.openness > 60 && traits.neuroticism > 60
                  ? "一个敏感、富有创造力、情感深邃的灵魂"
                  : "一个平衡而独特的数字生命"}
              </p>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 py-2">
            <div>
              <label className="flex items-center gap-2 text-white/60 text-sm mb-3">
                <FileText className="w-4 h-4" />
                人格描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述TA的性格、说话方式、兴趣爱好、价值观...越详细，TA越像你心中所想。"
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-1 focus:ring-[#FF1493]/30 transition-all resize-none leading-relaxed"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["温柔", "毒舌", "哲学家", "治愈系", "傲娇", "直球", "神秘", "阳光"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setDescription((prev) => (prev ? prev + "，" + tag : tag))}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/40 text-xs hover:bg-[#FF1493]/10 hover:border-[#FF1493]/30 hover:text-[#FF1493] transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Language preference */}
            <div>
              <label className="flex items-center gap-2 text-white/60 text-sm mb-3">
                <Globe className="w-4 h-4" />
                对话语言偏好
              </label>
              <div className="flex gap-3">
                {[
                  { key: "zh" as const, label: "中文", desc: "伴侣主要用中文与你交流" },
                  { key: "en" as const, label: "English", desc: "Companion speaks primarily in English" },
                  { key: "both" as const, label: "双语", desc: "根据你的语言自动切换" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setLangPref(opt.key)}
                    className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                      langPref === opt.key
                        ? "border-[#FF1493]/40 bg-[#FF1493]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <p className={`text-sm ${langPref === opt.key ? "text-[#FF1493]" : "text-white/60"}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 py-2">
            <div>
              <label className="flex items-center gap-2 text-white/60 text-sm mb-3">
                <Clock className="w-4 h-4" />
                时区
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-1 focus:ring-[#FF1493]/30 transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-white/60 text-sm mb-3">
                <MapPin className="w-4 h-4" />
                栖身之地（可选）
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="东京、冰岛、火星... 任何TA生活的地方"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-1 focus:ring-[#FF1493]/30 transition-all"
              />
            </div>

            <div className="glass-pink rounded-xl p-5 text-center">
              <h4 className="text-[#FF1493] text-base mb-1">{name || "未命名"}</h4>
              <p className="text-white/40 text-xs mb-2">
                开放{traits.openness}% · 尽责{traits.conscientiousness}% · 外向{traits.extraversion}%
              </p>
              <p className="text-white/40 text-xs">
                宜人{traits.agreeableness}% · 敏感{traits.neuroticism}%
              </p>
              <p className="text-white/20 text-[10px] mt-2">{timezone} · {langPref === "zh" ? "中文" : langPref === "en" ? "English" : "双语"}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Fixed footer nav */}
      <div className="shrink-0 px-4 py-3 border-t border-white/5">
        <div className="flex gap-3">
          {step > 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/10 transition-all"
            >
              上一步
            </motion.button>
          )}
          {step < 4 ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(step + 1)}
              className="flex-1 py-2.5 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm hover:bg-[#FF1493]/30 transition-all"
            >
              下一步
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="flex-1 py-2.5 bg-[#FF1493]/30 border border-[#FF1493]/50 rounded-xl text-[#FF1493] text-sm hover:bg-[#FF1493]/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {creating ? "注入灵魂中..." : "注入灵魂"}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
