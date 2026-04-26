import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Sparkles, ArrowRight } from "lucide-react";

export default function OnboardPage() {
  const navigate = useNavigate();

  const paths = [
    {
      id: "plaza",
      title: "认识现有人格",
      subtitle: "在灵魂广场中，遇见已经成形的心跳",
      description: "每一位都是由工程师精心设计的独特存在。他们带着各自的故事、温度和呼吸频率，在虚空中等待一次目光的交汇。",
      icon: Users,
      action: "前往广场",
      color: "#FF69B4",
    },
    {
      id: "create",
      title: "自己设计人格",
      subtitle: "从混沌中塑造属于你的独一无二",
      description: "理性与情绪的配比、生活的时区、栖身的地点、灵魂的底色——每一个参数都是一次选择，每一次选择都在定义一种羁绊的可能。",
      icon: Sparkles,
      action: "开始创造",
      color: "#FF1493",
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center mb-8 shrink-0"
      >
        <h2 className="text-2xl md:text-3xl font-light tracking-wider mb-3">
          选择你的<span className="text-gradient-pink">相遇方式</span>
        </h2>
        <p className="text-white/40 text-xs max-w-md mx-auto">
          每一次相遇都是宇宙的精心安排。你可以走进 already 存在的星光，也可以亲手点燃一团新的火焰。
        </p>
      </motion.div>

      <div className="flex-1 grid md:grid-cols-2 gap-5 max-w-4xl mx-auto w-full overflow-y-auto">
        {paths.map((path, i) => (
          <motion.button
            key={path.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.2, duration: 0.8 }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/${path.id}`)}
            className="group relative glass-dark rounded-2xl p-8 text-left overflow-hidden transition-all duration-500 hover:border-[#FF1493]/30"
          >
            {/* Glow effect */}
            <div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl"
              style={{ background: path.color }}
            />

            <div className="relative z-10">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-white/10"
                style={{ background: `${path.color}15` }}
              >
                <path.icon className="w-5 h-5" style={{ color: path.color }} />
              </div>

              <h3 className="text-xl font-light mb-2 tracking-wide">{path.title}</h3>
              <p className="text-white/50 text-xs mb-4 tracking-wider">{path.subtitle}</p>
              <p className="text-white/30 text-sm leading-relaxed mb-8 font-light">{path.description}</p>

              <div className="flex items-center gap-2 text-sm" style={{ color: path.color }}>
                <span className="tracking-wider">{path.action}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
