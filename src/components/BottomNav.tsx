import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useLang } from "../context/LangContext";
import { Heart, Brain, Sparkles, Settings } from "lucide-react";

const tabs = [
  { path: "/chat", icon: Heart, labelKey: "chatTitle" },
  { path: "/memory", icon: Brain, labelKey: "memory" },
  { path: "/bond", icon: Sparkles, labelKey: "bond" },
  { path: "/settings", icon: Settings, labelKey: "settings" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const current = location.pathname;

  return (
    <div className="shrink-0 glass-dark border-t border-white/5 px-2 py-1.5 z-30">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const active = current === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors"
            >
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-[#FF1493]/8 rounded-xl border border-[#FF1493]/15"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon
                className={`w-[18px] h-[18px] relative z-10 transition-colors ${
                  active ? "text-[#FF1493]" : "text-white/25"
                }`}
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={`text-[9px] relative z-10 transition-colors ${
                  active ? "text-[#FF1493]" : "text-white/25"
                }`}
              >
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
