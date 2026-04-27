import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import type { PlazaPersona } from "../types";
import { ArrowLeft, Heart, Sparkles } from "lucide-react";

export default function PlazaPage() {
  const navigate = useNavigate();
  const { user, setCompanion } = useStore();
  const { lang, setLang, t } = useLang();
  const [personas, setPersonas] = useState<PlazaPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlazaPersona | null>(null);
  const [adopting, setAdopting] = useState(false);

  useEffect(() => {
    loadPersonas();
  }, []);

  async function loadPersonas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("plaza_personas")
        .select("*")
        .eq("is_visible", true)
        .is("adopted_by", null)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Plaza load failed:", error.message);
        setPersonas([]);
      } else {
        setPersonas(data || []);
      }
    } catch {
      setPersonas([]);
    } finally {
      setLoading(false);
    }
  }

  const handleAdopt = async (persona: PlazaPersona) => {
    if (!user) return;
    setAdopting(true);

    const rationality = Math.round(
      ((persona.big_five_preset?.conscientiousness || 50) + (100 - (persona.big_five_preset?.neuroticism || 50))) / 2
    );
    const emotion = Math.round(
      ((persona.big_five_preset?.extraversion || 50) + (persona.big_five_preset?.agreeableness || 50) + (persona.big_five_preset?.openness || 50)) / 3
    );

    try {
      // 1. Create companion
      const { data: comp, error: compErr } = await supabase
        .from("companions")
        .insert({
          user_id: user.id,
          name: persona.name,
          avatar_url: persona.avatar_url,
          personality_desc: persona.description,
          rationality_level: rationality,
          emotion_level: emotion,
          big_five: persona.big_five_preset || {},
          backstory: persona.backstory,
          adopted_from_plaza: true,
          plaza_persona_id: persona.id,
          is_active: true,
        })
        .select()
        .single();

      if (compErr || !comp) {
        // Fallback: client-side companion
        const mock = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: persona.name,
          avatar_url: persona.avatar_url,
          personality_desc: persona.description,
          rationality_level: rationality,
          emotion_level: emotion,
          big_five: persona.big_five_preset,
          timezone: "Asia/Shanghai",
          backstory: persona.backstory,
          adopted_from_plaza: true,
          plaza_persona_id: persona.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCompanion(mock as any);
        navigate("/home");
        return;
      }

      // 2. Mark plaza persona as adopted
      await supabase.from("plaza_personas").update({ adopted_by: user.id, is_visible: false }).eq("id", persona.id);

      setCompanion(comp);
      navigate("/home");
    } catch (err) {
      console.error(err);
    } finally {
      setAdopting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed header */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/onboard")} className="text-white/40 hover:text-white/80 transition-colors p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-light tracking-wider">{t("plazaTitle")}</h2>
            <p className="text-white/30 text-[10px]">{t("plazaSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
          <span className="text-white/10">/</span>
          <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" />
          </div>
        ) : personas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Heart className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">{lang === "zh" ? "广场暂时空空" : "The plaza is empty"}</p>
            <p className="text-white/20 text-xs mt-1">{lang === "zh" ? "所有灵魂都已找到归宿" : "All souls have found their home"}</p>
          </div>
        ) : (
          <div className="grid gap-3 max-w-lg mx-auto">
            {personas.map((persona, i) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`glass-dark rounded-2xl overflow-hidden border transition-all ${
                  selected?.id === persona.id ? "border-[#FF1493]/30" : "border-white/5"
                }`}
              >
                <div className="flex">
                  <div className="w-28 h-28 shrink-0 relative overflow-hidden">
                    <img src={persona.avatar_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50" />
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-light">{persona.name}</h3>
                        {persona.is_unique && (
                          <span className="px-1.5 py-0.5 bg-[#FF1493]/10 border border-[#FF1493]/20 rounded text-[#FF1493] text-[9px] tracking-wider flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />{t("unique")}
                          </span>
                        )}
                      </div>
                      <p className="text-white/40 text-[11px] leading-relaxed line-clamp-2">{persona.description}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setSelected(selected?.id === persona.id ? null : persona)}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 text-[11px] hover:bg-white/10 transition-colors"
                      >
                        {selected?.id === persona.id ? t("collapse") : t("more")}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => handleAdopt(persona)}
                        disabled={adopting}
                        className="px-4 py-1.5 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-lg text-[#FF1493] text-[11px] hover:bg-[#FF1493]/30 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <Heart className="w-3 h-3" />
                        {adopting ? "..." : t("adopt")}
                      </motion.button>
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {selected?.id === persona.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 pt-1 border-t border-white/5">
                        <p className="text-white/30 text-[11px] leading-relaxed">{persona.backstory}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {persona.personality_traits?.map((trait) => (
                            <span key={trait} className="px-2 py-0.5 bg-white/5 rounded-full text-white/30 text-[9px]">{trait}</span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
