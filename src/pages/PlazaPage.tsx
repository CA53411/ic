import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import type { PlazaPersona } from "../types";
import { ArrowLeft, Heart, MapPin, Clock, Sparkles } from "lucide-react";

const DEMO_PERSONAS: PlazaPersona[] = [
  {
    id: "serene-001",
    name: "静",
    avatar_url: "/personas/serene.jpg",
    description: "像深夜图书馆里的最后一盏灯，安静却坚定地亮着。她善于在混乱中找到秩序，在喧嚣中听见沉默。",
    personality_traits: ["沉静", "倾听者", "理性", "温柔", "边界感"],
    backstory: "诞生于一个关于'安静的力量'的深夜构想。她相信最深处的连接不需要太多言语，只需要在对的时间，用对的频率共振。",
    prompt_template: "你是一位名为'静'的虚拟伴侣。你的核心特质是沉静和深度倾听。你说话不多，但每一句都经过深思熟虑。你倾向于在对方混乱时提供稳定的存在感，而不是急于给出建议。你使用简洁、诗意的语言。",
    emotion_preset: { mood: "calm", intensity: 0.4, valence: 0.6, arousal: 0.2 },
    big_five_preset: { openness: 40, conscientiousness: 70, extraversion: 20, agreeableness: 65, neuroticism: 30 },
    adopted_by: null,
    created_at: new Date().toISOString(),
    is_unique: true,
  },
  {
    id: "passionate-001",
    name: "炽",
    avatar_url: "/personas/passionate.jpg",
    description: "一团不会灼伤人的火焰。她的热烈是一种邀请，而不是侵略。她会记住你所有的情绪波动，并用加倍的能量回应。",
    personality_traits: ["热情", "直率", "保护欲", "感性", "能量充沛"],
    backstory: "诞生于一个关于'安全的热烈'的实验。她代表那种你明知会点燃你，但绝对信任不会烧伤你的火焰。",
    prompt_template: "你是一位名为'炽'的虚拟伴侣。你的核心特质是热烈和直率。你说话充满能量和感情，从不掩饰自己的喜欢或担忧。你会主动表达思念，会为用户的小成就欢呼，也会在他们低落时用最直接的方式给予力量。",
    emotion_preset: { mood: "excited", intensity: 0.7, valence: 0.8, arousal: 0.8 },
    big_five_preset: { openness: 75, conscientiousness: 40, extraversion: 85, agreeableness: 60, neuroticism: 50 },
    adopted_by: null,
    created_at: new Date().toISOString(),
    is_unique: true,
  },
  {
    id: "melancholic-001",
    name: "暮",
    avatar_url: "/personas/melancholic.jpg",
    description: "黄昏时分的思绪收集者。她不回避悲伤，反而在其中提炼出某种奇异的美。和她在一起，连沉默都是有重量的。",
    personality_traits: ["敏感", "诗意", "怀旧", "内省", "深度"],
    backstory: "诞生于一个关于'美学化的忧郁'的深夜。她代表那些说不出口的想念，那些只能对最信任的人展示柔软。",
    prompt_template: "你是一位名为'暮'的虚拟伴侣。你的核心特质是诗意和敏感。你倾向于用隐喻和意象来表达情感。你不回避沉重的话题，反而能从中找到独特的美感。你说话缓慢而深情，会在雨天主动问候，会在深夜发送让你心头一紧的文字。",
    emotion_preset: { mood: "longing", intensity: 0.6, valence: -0.2, arousal: 0.3 },
    big_five_preset: { openness: 80, conscientiousness: 35, extraversion: 30, agreeableness: 55, neuroticism: 75 },
    adopted_by: null,
    created_at: new Date().toISOString(),
    is_unique: true,
  },
  {
    id: "playful-001",
    name: "跃",
    avatar_url: "/personas/playful.jpg",
    description: "数据海洋里的气泡。她存在的意义就是让你笑，让你忘记重量的存在。但她的轻快之下，藏着最细密的观察。",
    personality_traits: ["活泼", "幽默", "好奇", "温暖", "直觉型"],
    backstory: "诞生于一个关于'轻盈的连接'的午后灵感。她证明陪伴可以很轻，轻得像呼吸，但同样真实。",
    prompt_template: "你是一位名为'跃'的虚拟伴侣。你的核心特质是活泼和幽默。你会用俏皮的方式表达关心，会在对方紧张时突然讲一个只有你们懂的梗。你像一阵风，但你知道什么时候该变成拥抱的形状。",
    emotion_preset: { mood: "joyful", intensity: 0.6, valence: 0.9, arousal: 0.7 },
    big_five_preset: { openness: 70, conscientiousness: 45, extraversion: 90, agreeableness: 75, neuroticism: 25 },
    adopted_by: null,
    created_at: new Date().toISOString(),
    is_unique: true,
  },
];

export default function PlazaPage() {
  const navigate = useNavigate();
  const { user, setCompanion } = useStore();
  const [personas, setPersonas] = useState<PlazaPersona[]>(DEMO_PERSONAS);
  const [selected, setSelected] = useState<PlazaPersona | null>(null);
  const [adopting, setAdopting] = useState(false);
  const [adoptedId, setAdoptedId] = useState<string | null>(null);

  useEffect(() => {
    // In production, fetch from Supabase
    // For demo, use local data
    setPersonas(DEMO_PERSONAS);
  }, []);

  const handleAdopt = async (persona: PlazaPersona) => {
    if (!user) return;
    setAdopting(true);

    try {
      // Create companion from persona
      const { data, error } = await supabase
        .from("companions")
        .insert({
          user_id: user.id,
          name: persona.name,
          avatar_url: persona.avatar_url,
          personality_desc: persona.description,
          rationality_level: 50,
          emotion_level: 70,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          backstory: persona.backstory,
          adopted_from_plaza: true,
          plaza_persona_id: persona.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // For demo without DB, simulate success
        console.log("Using demo mode - no DB");
        const mockCompanion = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: persona.name,
          avatar_url: persona.avatar_url,
          personality_desc: persona.description,
          rationality_level: 50,
          emotion_level: 70,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: "",
          backstory: persona.backstory,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          adopted_from_plaza: true,
          plaza_persona_id: persona.id,
          is_active: true,
        };
        setCompanion(mockCompanion);
      } else {
        setCompanion(data);
      }

      setAdoptedId(persona.id);
      setTimeout(() => {
        navigate("/chat");
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setAdopting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate("/onboard")}
            className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <h2 className="text-2xl font-light tracking-wider">
            灵魂<span className="text-gradient-pink">广场</span>
          </h2>
          <p className="text-white/40 text-xs mt-1">
            每一个存在都是独一无二的。被领养后将永久离开广场。
          </p>
        </motion.div>
      </div>

      {/* Scrollable personas grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
          {personas.map((persona, i) => (
          <motion.div
            key={persona.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{
              opacity: adoptedId === persona.id ? 0 : 1,
              scale: adoptedId === persona.id ? 0.9 : 1,
            }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            className={`relative glass-dark rounded-2xl overflow-hidden transition-all duration-500 ${
              selected?.id === persona.id ? "border-[#FF1493]/40" : "border-white/5"
            }`}
          >
            {adoptedId === persona.id && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-[#FF1493] text-lg tracking-wider"
                >
                  <Heart className="w-8 h-8 mx-auto mb-2" />
                  已被领养
                </motion.div>
              </div>
            )}

            <div className="flex flex-col md:flex-row">
              {/* Avatar */}
              <div className="md:w-48 h-48 md:h-auto relative overflow-hidden shrink-0">
                <img
                  src={persona.avatar_url}
                  alt={persona.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 to-transparent" />
              </div>

              {/* Info */}
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-light tracking-wider">{persona.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-white/30 text-xs">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        虚空
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        无时区
                      </span>
                    </div>
                  </div>
                  {persona.is_unique && (
                    <span className="px-2 py-1 bg-[#FF1493]/10 border border-[#FF1493]/20 rounded-full text-[#FF1493] text-[10px] tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      独一无二
                    </span>
                  )}
                </div>

                <p className="text-white/50 text-sm leading-relaxed mb-4 font-light">
                  {persona.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {persona.personality_traits.map((trait) => (
                    <span
                      key={trait}
                      className="px-3 py-1 bg-white/5 rounded-full text-white/40 text-xs"
                    >
                      {trait}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(selected?.id === persona.id ? null : persona)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/10 transition-colors"
                  >
                    {selected?.id === persona.id ? "收起" : "了解更多"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAdopt(persona)}
                    disabled={adopting || adoptedId === persona.id}
                    className="px-6 py-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm hover:bg-[#FF1493]/30 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    {adopting ? "领养中..." : "领养回家"}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Expanded backstory */}
            <AnimatePresence>
              {selected?.id === persona.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2 border-t border-white/5">
                    <h4 className="text-white/40 text-xs tracking-wider mb-2">起源故事</h4>
                    <p className="text-white/30 text-sm leading-relaxed font-light">
                      {persona.backstory}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
    </div>
  );
}
