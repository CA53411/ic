import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLang } from "../context/LangContext";
import { Users, Sparkles, ArrowRight } from "lucide-react";

export default function OnboardPage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();

  const paths = [
    { id: "plaza", icon: Users, title: t("plazaPath"), subtitle: t("plazaDesc"), desc: t("plazaDetail"), action: t("goPlaza"), color: "#FF69B4" },
    { id: "create", icon: Sparkles, title: t("createPath"), subtitle: t("createDesc"), desc: t("createDetail"), action: t("createNow"), color: "#FF1493" },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden px-4 py-5">
      <div className="flex items-center justify-end mb-3 shrink-0">
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
          <span className="text-white/10">/</span>
          <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4 shrink-0">
        <h2 className="text-xl font-light tracking-wider">{t("onboardingTitle")}</h2>
        <p className="text-white/30 text-xs mt-1">{t("onboardingDesc")}</p>
      </motion.div>

      <div className="flex-1 flex flex-col justify-center gap-3 max-w-md mx-auto w-full">
        {paths.map((path, i) => (
          <motion.button
            key={path.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.12 }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/${path.id}`)}
            className="group relative glass-dark rounded-2xl p-5 text-left border border-white/5 hover:border-[#FF1493]/20 transition-all"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-2xl" style={{ background: path.color }} />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 border border-white/10" style={{ background: `${path.color}12` }}>
                <path.icon className="w-4 h-4" style={{ color: path.color }} />
              </div>
              <h3 className="text-base font-light mb-0.5">{path.title}</h3>
              <p className="text-white/40 text-[10px] mb-2 tracking-wider">{path.subtitle}</p>
              <p className="text-white/25 text-xs leading-relaxed mb-4">{path.desc}</p>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: path.color }}>
                <span className="tracking-wider">{path.action}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
