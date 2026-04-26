import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import { useLang } from "../context/LangContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();

  return (
    <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-5 right-5 flex items-center gap-1 text-xs z-10">
        <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded-md transition-colors ${lang === "zh" ? "text-[#FF1493] bg-[#FF1493]/10" : "text-white/20 hover:text-white/40"}`}>中</button>
        <span className="text-white/10">/</span>
        <button onClick={() => setLang("en")} className={`px-2 py-1 rounded-md transition-colors ${lang === "en" ? "text-[#FF1493] bg-[#FF1493]/10" : "text-white/20 hover:text-white/40"}`}>EN</button>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div key={i} className="absolute rounded-full" style={{ width: Math.random() * 3 + 1, height: Math.random() * 3 + 1, background: "#FF1493", left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.3 }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2, ease: "easeOut" }} className="text-center z-10 px-4">
        <motion.div className="mb-6 flex justify-center" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <div className="relative">
            <div className="w-20 h-20 rounded-full border border-[#FF1493]/30 flex items-center justify-center">
              <Heart className="w-8 h-8 text-[#FF1493]" strokeWidth={1.5} />
            </div>
            <motion.div className="absolute inset-0 rounded-full border border-[#FF1493]/20" animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />
          </div>
        </motion.div>

        <motion.h1 className="text-5xl md:text-7xl font-light tracking-[0.3em] mb-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1.5 }}>
          <span className="text-gradient-pink">{t("appName")}</span>
        </motion.h1>

        <motion.p className="text-white/35 text-xs md:text-sm tracking-[0.2em] mb-6 font-light" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}>
          {t("tagline")}
        </motion.p>

        <motion.div className="max-w-sm mx-auto mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }}>
          <p className="text-white/40 text-xs md:text-sm leading-relaxed font-light whitespace-pre-line">{t("subtitle")}{"\n"}{t("subtitle2")}</p>
        </motion.div>

        <motion.button onClick={() => navigate("/auth")} className="group relative px-10 py-3.5 bg-transparent border border-[#FF1493]/40 rounded-full overflow-hidden transition-all duration-500 hover:border-[#FF1493]/80"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.8 }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <span className="relative z-10 text-[#FF1493] text-sm tracking-[0.15em] flex items-center gap-2 group-hover:text-white transition-colors duration-500">
            <Sparkles className="w-4 h-4" />{t("begin")}
          </span>
          <motion.div className="absolute inset-0 bg-[#FF1493]/20" initial={{ scale: 0, opacity: 0 }} whileHover={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} style={{ borderRadius: "inherit" }} />
        </motion.button>
      </motion.div>

      <motion.p className="absolute bottom-5 text-white/15 text-[10px] tracking-wider" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3, duration: 1 }}>
        platonic.corolas.top
      </motion.p>
    </div>
  );
}
