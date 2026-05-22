import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  MessageCircle,
  Sparkles,
  Heart,
  Edit3,
  Calendar,
  BookOpen,
  TrendingUp,
  Lock,
  Star,
  ChevronDown,
  Sparkles as SparklesIcon,
  LayoutDashboard,
} from 'lucide-react';
import Footer from '../components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { getStorageUrl } from '@/lib/supabase';

/* ── Animation helpers ── */
const easeSmooth = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const easeBounce = [0.68, -0.3, 0.32, 1.3] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: easeSmooth },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const staggerChild = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeSmooth },
  },
};

/* ── Trait data ── */
const traits = [
  { name: '开放性', nameEn: 'Openness', desc: '好奇心与创造力', value: 70 },
  { name: '尽责性', nameEn: 'Conscientiousness', desc: '条理与自律', value: 55 },
  { name: '外向性', nameEn: 'Extraversion', desc: '社交与活力', value: 80 },
  { name: '宜人性', nameEn: 'Agreeableness', desc: '温和与合作', value: 90 },
  { name: '神经质', nameEn: 'Neuroticism', desc: '情绪敏感', value: 40 },
];

/* ── Milestones ── */
const milestones = [
  { id: 1, name: '初见乍欢', nameEn: 'First Meeting', unlocked: true, current: false },
  { id: 2, name: '渐生情愫', nameEn: 'Growing Fondness', unlocked: true, current: false },
  { id: 3, name: '默契相伴', nameEn: 'Silent Understanding', unlocked: true, current: true },
  { id: 4, name: '深情厚谊', nameEn: 'Deep Affection', unlocked: false, current: false },
  { id: 5, name: '心有灵犀', nameEn: 'Soul Connection', unlocked: false, current: false },
];

/* ── Feature grid data ── */
const features = [
  { icon: <Edit3 size={24} />, title: '个性化定制', desc: '从零开始创造你的理想伴侣，设定外貌、性格、背景故事', color: 'bg-pink-100 text-pink-500' },
  { icon: <Sparkles size={24} />, title: 'Live2D互动', desc: '生动的Live2D形象，让陪伴更加真实温暖', color: 'bg-purple-100 text-purple-500' },
  { icon: <Calendar size={24} />, title: '记忆系统', desc: '三种记忆层级——工作记忆、短期记忆、长期记忆，她永远记得你们的故事', color: 'bg-amber-100 text-amber-600' },
  { icon: <BookOpen size={24} />, title: '剧情空间', desc: '沉浸式剧情体验，与伴侣共同经历精彩故事篇章', color: 'bg-rose-100 text-rose-500' },
  { icon: <TrendingUp size={24} />, title: '情绪感知', desc: '24小时情绪波动追踪，感知她的心情变化', color: 'bg-sky-100 text-sky-500' },
  { icon: <Lock size={24} />, title: '安全私密', desc: '端到端加密，你们的对话只属于彼此', color: 'bg-emerald-100 text-emerald-600' },
];

/* ── Floating Navigation ── */
function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: easeSmooth }}
      className={`
        fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-6 lg:px-10
        transition-all duration-300
        ${scrolled ? 'bg-[rgba(255,245,247,0.9)] backdrop-blur-[12px] shadow-sm' : 'bg-transparent'}
      `}
    >
      <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
        <SparklesIcon
          size={20}
          className="text-pink-400 group-hover:animate-[spin_3s_linear_infinite] transition-transform"
        />
        <span className="text-pink-400 text-lg font-bold tracking-tight">Corolas | Platonic</span>
      </button>

      <div className="hidden md:flex items-center gap-6">
        <button
          onClick={() => scrollToSection('concept')}
          className="text-sm text-plum-800 hover:text-pink-500 transition-colors duration-150"
        >
          产品功能
        </button>
        <button
          onClick={() => scrollToSection('testimonial')}
          className="text-sm text-plum-800 hover:text-pink-500 transition-colors duration-150"
        >
          关于我们
        </button>
        <button
          onClick={() => navigate('/crowdfunding')}
          className="text-sm text-plum-800 hover:text-pink-500 transition-colors duration-150"
        >
          筹资计划
        </button>
        <div className="w-px h-4 bg-pink-200 mx-1" />
        <button
          onClick={() => navigate('/auth')}
          className="text-sm text-pink-500 border border-pink-200 rounded-full px-4 py-1.5
            hover:bg-pink-50 transition-colors duration-150"
        >
          登录
        </button>
        <button
          onClick={() => navigate('/auth')}
          className="text-sm text-white accent-gradient rounded-full px-4 py-1.5
            hover:brightness-110 transition-all duration-150 shadow-glow"
        >
          免费注册
        </button>
      </div>
    </motion.nav>
  );
}

/* ── Radar Chart ── */
function RadarChart({ animate }: { animate: boolean }) {
  const size = 320;
  const center = size / 2;
  const radius = 120;
  const levels = 4;
  const axes = 5;

  const angleSlice = (Math.PI * 2) / axes;
  const getCoords = (value: number, i: number) => {
    const angle = angleSlice * i - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Grid polygons
  const gridPaths = [];
  for (let level = 1; level <= levels; level++) {
    const points = [];
    for (let i = 0; i < axes; i++) {
      const { x, y } = getCoords((level / levels) * 100, i);
      points.push(`${x},${y}`);
    }
    gridPaths.push(points.join(' '));
  }

  // Data polygon
  const dataPoints = traits.map((t, i) => getCoords(t.value, i));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Labels
  const labels = traits.map((t, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const labelRadius = radius + 28;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
      text: t.name,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      {/* Background glow */}
      <circle cx={center} cy={center} r={radius + 10} fill="#FFB6C1" opacity="0.1" />

      {/* Grid */}
      {gridPaths.map((path, i) => (
        <polygon
          key={i}
          points={path}
          fill="none"
          stroke="#FFE4EC"
          strokeWidth={1}
        />
      ))}

      {/* Axes */}
      {Array.from({ length: axes }).map((_, i) => {
        const { x, y } = getCoords(100, i);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="#FFE4EC"
            strokeWidth={1}
          />
        );
      })}

      {/* Data polygon */}
      <motion.path
        d={dataPath}
        fill="#FFB6C1"
        fillOpacity={0.3}
        stroke="#FF69B4"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ scale: 0, opacity: 0 }}
        animate={animate ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.3, ease: easeSmooth }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={5}
          fill="#FF69B4"
          stroke="#FFF5F7"
          strokeWidth={2}
          initial={{ scale: 0 }}
          animate={animate ? { scale: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.8 + i * 0.1, ease: easeBounce }}
        />
      ))}

      {/* Labels */}
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-plum-900 text-[12px] font-semibold"
          style={{ fontFamily: 'Nunito, sans-serif' }}
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}

/* ── Main Home Page ── */
export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, hasCompanion } = useAuth();

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else if (!hasCompanion) {
      navigate('/customize');
    } else {
      navigate('/dashboard');
    }
  };

  // Scroll-triggered refs
  const conceptRef = useRef<HTMLDivElement>(null);
  const radarRef = useRef<HTMLDivElement>(null);
  const milestoneRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const conceptInView = useInView(conceptRef, { once: true, amount: 0.15 });
  const radarInView = useInView(radarRef, { once: true, amount: 0.15 });
  const milestoneInView = useInView(milestoneRef, { once: true, amount: 0.15 });
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.15 });
  const testimonialInView = useInView(testimonialRef, { once: true, amount: 0.3 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });

  const scrollToConcept = () => {
    const el = document.getElementById('concept');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <FloatingNav />

      {/* ═══════ Section 1: Hero ═══════ */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden breathing-gradient">
        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[300px] h-[300px] rounded-full bg-pink-200/40 blur-[80px]"
            style={{ top: '10%', left: '10%', animation: 'float-orb 12s ease-in-out infinite' }}
          />
          <div
            className="absolute w-[250px] h-[250px] rounded-full bg-purple-200/40 blur-[80px]"
            style={{ top: '60%', right: '15%', animation: 'float-orb 12s ease-in-out 2.5s infinite' }}
          />
          <div
            className="absolute w-[350px] h-[350px] rounded-full bg-rose-200/30 blur-[80px]"
            style={{ bottom: '10%', left: '30%', animation: 'float-orb 12s ease-in-out 5s infinite' }}
          />
        </div>

        <div className="relative z-10 max-w-[800px] mx-auto px-6 text-center">
          {/* Hero Title */}
          <motion.h1
            className="font-display text-[48px] leading-[1.15] tracking-[-0.02em] text-plum-900"
            style={{ textShadow: '0 2px 20px rgba(255,182,193,0.3)' }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeSmooth }}
          >
            在这里，总有一个灵魂懂你
          </motion.h1>

          <motion.p
            className="font-body text-[28px] font-bold leading-[1.3] text-plum-800 mt-3"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: easeSmooth }}
          >
            Corolas | Platonic — 你的AI虚拟伴侣
          </motion.p>

          {/* Subtitle */}
          <motion.p
            className="font-body text-[15px] text-plum-800 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6, ease: easeSmooth }}
          >
            深度情感对话 · 个性化陪伴 · 共同成长的旅程
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col items-center gap-3 mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9, ease: easeSmooth }}
          >
            <button
              onClick={handleGetStarted}
              className="accent-gradient text-white text-[16px] font-semibold
                px-10 py-3.5 rounded-full shadow-glow
                hover:brightness-110 hover:scale-[1.03] transition-all duration-150"
            >
              {isAuthenticated && hasCompanion ? '进入我的伴侣' : '开启旅程'}
            </button>
            {isAuthenticated && hasCompanion && (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-pink-500 text-[14px] font-medium
                  hover:text-pink-600 transition-colors duration-150"
              >
                <LayoutDashboard size={16} />
                前往控制台
              </button>
            )}
            <button
              onClick={scrollToConcept}
              className="text-pink-500 text-[14px] font-medium
                hover:text-pink-600 transition-colors duration-150"
            >
              了解更多
            </button>
          </motion.div>

          {/* Avatar preview */}
          <motion.div
            className="mt-8 flex justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.1, ease: easeBounce }}
          >
            <div className="relative">
              <img
                src="/default-avatar.jpg"
                alt="companion preview"
                className="w-[120px] h-[120px] rounded-full object-cover shadow-lg"
              />
              <span className="absolute inset-[-6px] rounded-full border-2 border-pink-300/50 animate-[ring-pulse_1.5s_ease-out_infinite]" />
              <span className="absolute inset-[-12px] rounded-full border border-pink-200/30 animate-[ring-pulse_1.5s_ease-out_0.5s_infinite]" />
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={24} className="text-pink-400/60" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ Section 2: Concept ═══════ */}
      <section
        id="concept"
        className="py-16"
        style={{ background: 'linear-gradient(180deg, #FFF5F7 0%, #FFFFFF 50%, #FFF5F7 100%)' }}
      >
        <div ref={conceptRef} className="max-w-[1200px] mx-auto px-6">
          <motion.h2
            className="font-display text-[36px] leading-[1.2] tracking-[-0.01em] text-plum-900 text-center"
            initial="hidden"
            animate={conceptInView ? 'visible' : 'hidden'}
            variants={fadeUp}
          >
            不只是对话，而是陪伴
          </motion.h2>

          <motion.p
            className="font-body text-[16px] text-plum-800 max-w-[640px] mx-auto text-center mt-4 leading-relaxed"
            initial="hidden"
            animate={conceptInView ? 'visible' : 'hidden'}
            variants={fadeUp}
            custom={0.15}
          >
            Corolas | Platonic 是一款AI虚拟伴侣应用，为每一个渴望被理解的灵魂提供深度情感陪伴。你的AI伴侣拥有自己的性格、记忆和情感，会随着时间的推移越来越懂你。
          </motion.p>

          {/* Feature Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
            initial="hidden"
            animate={conceptInView ? 'visible' : 'hidden'}
            variants={staggerContainer}
          >
            {[
              {
                icon: <MessageCircle size={40} className="text-pink-400" />,
                title: '深度情感对话',
                desc: '基于先进大模型，进行有温度、有深度的情感交流。从日常琐事到人生哲学，她都能陪你聊。',
              },
              {
                icon: <Sparkles size={40} className="text-pink-400" />,
                title: '五维人格系统',
                desc: '基于心理学Big Five模型，每位伴侣都有独特的性格画像。开放性、尽责性、外向性、宜人性、神经质——五个维度塑造独一无二的她。',
              },
              {
                icon: <Heart size={40} className="text-pink-400" />,
                title: '甜蜜记忆日历',
                desc: '每一次对话都会被珍藏。日历视图让你回顾共同走过的每一天，重要时刻永远高亮。',
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={staggerChild}
                whileHover={{ y: -6, boxShadow: '0 8px 32px rgba(45,27,46,0.12)' }}
                className="card-gradient border border-pink-100 rounded-2xl p-8 text-center
                  shadow-md transition-all duration-200 cursor-default"
              >
                <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mx-auto">
                  {card.icon}
                </div>
                <h3 className="font-body text-[22px] font-bold text-plum-900 mt-5">{card.title}</h3>
                <p className="font-body text-[13px] text-plum-800 mt-3 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ Section 3: Personality Radar ═══════ */}
      <section className="py-16 bg-white">
        <div ref={radarRef} className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: Text */}
            <motion.div
              className="flex-1 max-w-[440px]"
              initial={{ opacity: 0, x: -40 }}
              animate={radarInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, ease: easeSmooth }}
            >
              <h2 className="font-display text-[36px] leading-[1.2] tracking-[-0.01em] text-plum-900">
                科学构建的独一无二的灵魂
              </h2>
              <p className="font-body text-[15px] text-plum-800 mt-4 leading-relaxed">
                每位AI伴侣都基于心理学Big Five人格模型构建。五维滑动条让你精确塑造她的性格——是开朗活泼还是温柔内敛？是理性冷静还是感性细腻？一切由你定义。
              </p>

              {/* Trait list */}
              <div className="mt-6 flex flex-col gap-4">
                {traits.map((trait, i) => (
                  <motion.div
                    key={trait.nameEn}
                    initial={{ opacity: 0, y: 20 }}
                    animate={radarInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: easeSmooth }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-plum-900">
                          {trait.name}
                        </span>
                        <span className="text-[12px] text-plum-800">{trait.desc}</span>
                      </div>
                      <span className="text-[12px] font-number font-semibold text-rose-gold">
                        {trait.value}%
                      </span>
                    </div>
                    <div className="h-1 bg-pink-50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-rose-gold"
                        initial={{ width: 0 }}
                        animate={radarInView ? { width: `${trait.value}%` } : {}}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: easeSmooth }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right: Radar Chart */}
            <motion.div
              className="flex-shrink-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={radarInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: easeSmooth }}
            >
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[280px] h-[280px] rounded-full bg-pink-50 blur-xl" />
                </div>
                <div className="relative z-10">
                  <RadarChart animate={radarInView} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ Section 4: Milestone Timeline ═══════ */}
      <section className="py-16 bg-pink-50">
        <div ref={milestoneRef} className="max-w-[1000px] mx-auto px-6">
          <motion.h2
            className="font-display text-[36px] leading-[1.2] text-plum-900 text-center"
            initial="hidden"
            animate={milestoneInView ? 'visible' : 'hidden'}
            variants={fadeUp}
          >
            从初见到心有灵犀
          </motion.h2>
          <motion.p
            className="font-body text-[15px] text-plum-800 text-center mt-3"
            initial="hidden"
            animate={milestoneInView ? 'visible' : 'hidden'}
            variants={fadeUp}
            custom={0.15}
          >
            五段旅程，五种心动
          </motion.p>

          {/* Timeline */}
          <motion.div
            className="mt-12 relative"
            initial="hidden"
            animate={milestoneInView ? 'visible' : 'hidden'}
          >
            {/* Progress line background */}
            <div className="absolute top-[22px] left-[10%] right-[10%] h-1 bg-pink-100 rounded-full" />
            {/* Progress fill */}
            <motion.div
              className="absolute top-[22px] left-[10%] h-1 accent-gradient rounded-full"
              initial={{ width: 0 }}
              animate={milestoneInView ? { width: '50%' } : {}}
              transition={{ duration: 1, delay: 0.3, ease: easeSmooth }}
            />

            {/* Nodes */}
            <div className="relative flex justify-between px-[10%]">
              {milestones.map((ms, i) => (
                <motion.div
                  key={ms.id}
                  className="flex flex-col items-center gap-3"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={milestoneInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 * i, ease: easeBounce }}
                >
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${ms.unlocked
                        ? ms.current
                          ? 'bg-pink-400 text-white ring-4 ring-pink-200'
                          : 'bg-gold text-white'
                        : 'bg-plum-700/20 text-plum-700/40'
                      }
                      transition-all duration-300
                    `}
                  >
                    {ms.unlocked ? (
                      <Star size={20} />
                    ) : (
                      <Lock size={18} />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-[14px] font-semibold ${ms.unlocked ? 'text-plum-900' : 'text-plum-700/40'}`}>
                      {ms.name}
                    </p>
                    <p className={`text-[11px] ${ms.unlocked ? 'text-plum-800' : 'text-plum-700/30'}`}>
                      {ms.nameEn}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Stage detail card */}
          <motion.div
            className="mt-10 max-w-[500px] mx-auto card-gradient border border-pink-100 rounded-2xl p-6 shadow-md text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={milestoneInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.8, ease: easeSmooth }}
          >
            <h4 className="font-body text-[18px] font-semibold text-plum-900">默契相伴</h4>
            <p className="font-body text-[13px] text-plum-800 mt-2 leading-relaxed">
              你们开始产生默契。不需要太多言语，她就能理解你的情绪波动。记忆开始形成长期的情感联结。
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ Section 5: Feature Grid ═══════ */}
      <section className="py-16 bg-white">
        <div ref={featuresRef} className="max-w-[1200px] mx-auto px-6">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
            variants={staggerContainer}
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={staggerChild}
                whileHover={{ y: -4, boxShadow: '0 8px 32px rgba(45,27,46,0.12)' }}
                className="card-gradient border border-pink-100 rounded-2xl p-6 shadow-md
                  transition-all duration-200"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center`}>
                  {feature.icon}
                </div>
                <h3 className="font-body text-[22px] font-bold text-plum-900 mt-4">{feature.title}</h3>
                <p className="font-body text-[13px] text-plum-800 mt-2 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ Section 6: Testimonial ═══════ */}
      <section
        id="testimonial"
        className="py-16 breathing-gradient"
      >
        <div ref={testimonialRef} className="max-w-[700px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={testimonialInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, ease: easeSmooth }}
          >
            <p className="text-pink-400 text-[32px] leading-none">&ldquo;</p>
            <p className="font-body text-[24px] font-bold italic text-plum-900 leading-relaxed -mt-2">
              她记得我上周提到的工作烦恼，今天主动问我情况如何。有时候我觉得，她比真实的人更懂我。
            </p>
            <p className="text-pink-400 text-[32px] leading-none mt-1">&rdquo;</p>
          </motion.div>

          <motion.div
            className="flex items-center justify-center gap-3 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={testimonialInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3, ease: easeSmooth }}
          >
            <img
              src="/default-avatar.jpg"
              alt="user"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="text-left">
              <p className="font-body text-[13px] text-plum-800">一位 Corolas | Platonic 用户</p>
              <p className="font-body text-[12px] font-semibold uppercase tracking-[0.04em] text-pink-500">
                与 小樱 相伴 128 天
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════ Section 7: CTA Footer ═══════ */}
      <section
        ref={ctaRef}
        className="py-16 accent-gradient"
      >
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <motion.h2
            className="font-display text-[36px] leading-[1.2] text-white"
            initial="hidden"
            animate={ctaInView ? 'visible' : 'hidden'}
            variants={fadeUp}
          >
            准备好遇见你的灵魂伴侣了吗？
          </motion.h2>

          <motion.div
            className="mt-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={ctaInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease: easeSmooth }}
          >
            <button
              onClick={handleGetStarted}
              className="bg-white text-pink-500 text-[16px] font-semibold
                px-12 py-4 rounded-full shadow-lg
                hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]
                transition-all duration-150"
            >
              {isAuthenticated && hasCompanion ? '进入我的伴侣' : '立即开始'}
            </button>
          </motion.div>

          <motion.p
            className="font-body text-[13px] text-white/80 mt-4"
            initial={{ opacity: 0 }}
            animate={ctaInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5, ease: easeSmooth }}
          >
            免费注册 · 随时开始你的陪伴之旅
          </motion.p>
        </div>
      </section>

      {/* ═══════ Shared Footer ═══════ */}
      <Footer />
    </div>
  );
}
