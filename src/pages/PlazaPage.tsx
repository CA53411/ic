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
  const [adoptingId, setAdoptingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
        setError(error.message);
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
    setAdoptingId(persona.id);

    const rationality = Math.round(
      ((persona.big_five_preset?.conscientiousness || 50) + (100 - (persona.big_five_preset?.neuroticism || 50))) / 2
    );
    const emotion = Math.round(
      ((persona.big_five_preset?.extraversion || 50) + (persona.big_five_preset?.agreeableness || 50) + (persona.big_five_preset?.openness || 50)) / 3
    );

    try {
      // 1. Mark plaza persona as adopted FIRST (this is the critical step)
      const { error: adoptErr } = await supabase
        .from("plaza_personas")
        .update({ adopted_by: user.id, is_visible: false })
        .eq("id", persona.id);

      if (adoptErr) {
        setError(adoptErr.message);
        setAdoptingId(null);
        return;
      }

      // 2. Remove from local state immediately so UI updates
      setPersonas((prev) => prev.filter((p) => p.id !== persona.id));

      // 3. Create companion
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
        .maybeSingle();

      if (compErr || !comp) {
        // Fallback: create client-side companion
        const mock = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: persona.name,
          avatar_url: persona.avatar_url,
          personality_desc: persona.description,
          rationality_level: rationality,
          emotion_level: emotion,
          big_five: persona.big_five_preset,
          backstory: persona.backstory,
          adopted_from_plaza: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCompanion(mock as any);
      } else {
        setCompanion(comp);
      }

      // 4. Navigate to home
      navigate("/home");
    } catch (err: any) {
      setError(err?.message || "Adoption failed");
      setAdoptingId(null);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate("/onboard")} className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />{t("back")}
          </button>
          <div className="flex items-center gap-1 text-[10px]">
            <button onClick={() => setLang("zh")} className={`px-1.5 py-0.5 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
            <span className="text-white/10">/</span>
            <button onClick={() => setLang("en")} className={`px-1.5 py-0.5 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
          </div>
        </div>
        <h1 className="text-2xl font-extralight tracking-[0.2em]">{t("plazaTitle")}</h1>
        <p className="text-white/25 text-[10px] mt-0.5">{t("plazaSubtitle")}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-[10px]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" />
          </div>
        ) : personas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#FF1493]/5 border border-[#FF1493]/10 flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-[#FF1493]/20" />
            </div>
            <p className="text-white/25 text-sm font-light">{lang === "zh" ? "广场空空如也" : "The plaza is empty"}</p>
            <p className="text-white/15 text-[10px] mt-1 font-light">{lang === "zh" ? "所有灵魂都已找到归宿" : "All souls have found their home"}</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-md mx-auto">
            {personas.map((persona, i) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass-dark rounded-2xl border border-white/[0.04] overflow-hidden hover:border-[#FF1493]/15 transition-all duration-500"
              >
                <div className="flex">
                  {/* Avatar side */}
                  <div className="w-28 h-28 shrink-0 relative overflow-hidden">
                    <img src={persona.avatar_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/60" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-light tracking-wide">{persona.name}</h3>
                        {persona.is_unique && (
                          <span className="px-1.5 py-0.5 bg-[#FF1493]/8 border border-[#FF1493]/15 rounded text-[#FF1493]/70 text-[8px] tracking-wider flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />{t("unique")}
                          </span>
                        )}
                      </div>
                      <p className="text-white/35 text-[10px] leading-relaxed line-clamp-2">{persona.description}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setSelected(selected?.id === persona.id ? null : persona)}
                        className="px-2.5 py-1 bg-white/[0.03] border border-white/8 rounded-lg text-white/30 text-[10px] hover:bg-white/[0.06] transition-colors"
                      >
                        {selected?.id === persona.id ? t("collapse") : t("more")}
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleAdopt(persona)}
                        disabled={adoptingId === persona.id}
                        className="px-3.5 py-1 bg-[#FF1493]/12 border border-[#FF1493]/25 rounded-lg text-[#FF1493] text-[10px] hover:bg-[#FF1493]/20 transition-all disabled:opacity-40 flex items-center gap-1"
                      >
                        <Heart className="w-2.5 h-2.5" />
                        {adoptingId === persona.id ? "..." : t("adopt")}
                      </motion.button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {selected?.id === persona.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.03]">
                        <p className="text-white/25 text-[10px] leading-relaxed font-light">{persona.backstory}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {persona.personality_traits?.map((trait) => (
                            <span key={trait} className="px-2 py-0.5 bg-white/[0.03] rounded-full text-white/25 text-[8px]">{trait}</span>
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
