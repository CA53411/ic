import { useState, useEffect, useRef, useMemo } from 'react';
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
  LayoutDashboard,
} from 'lucide-react';
import Footer from '../components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/I18nContext';
import type { Language } from '@/i18n/translations';
import { cn } from '@/lib/utils';

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

/* ── Floating Navigation ── */
function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();

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
        <img
          src="/platonic.png"
          alt="Logo"
          className="w-6 h-6 rounded-md object-cover ring-1 ring-pink-400/40 group-hover:animate-[spin_3s_linear_infinite] transition-transform"
        />
        <span className="text-pink-400 text-lg font-bold tracking-tight">Corolas | Platonic</span>
      </button>

      <div className="hidden md:flex items-center gap-6">
        <button
          onClick={() => scrollToSection('concept')}
          className="text-sm text-plum-800 hover:text-pink-500 transition-colors duration-150"
        >
          {t('nav.features')}
        </button>
        <button
          onClick={() => scrollToSection('testimonial')}
          className="text-sm text-plum-800 hover:text-pink-500 transition-colors duration-150"
        >
          {t('nav.about')}
        </button>
        <button
          onClick={() => navigate('/crowdfunding')}
          className="text-sm text-plum-800 hover:text-pink-500 transition-colors duration-150"
        >
          {t('nav.crowdfunding')}
        </button>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-pink-50 rounded-full p-0.5 border border-pink-100">
          {(['en', 'zh', 'ja', 'ko'] as Language[]).map((code) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={cn(
                'px-2 py-1 rounded-full text-[11px] font-semibold font-body transition-all duration-150',
                lang === code
                  ? 'bg-white text-pink-500 shadow-sm'
                  : 'text-[#A093A5] hover:text-[#6B5B6E]'
              )}
            >
              {code === 'en' ? 'EN' : code === 'zh' ? '中' : code === 'ja' ? '日' : '韩'}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-pink-200 mx-1" />
        <button
          onClick={() => navigate('/auth')}
          className="text-sm text-pink-500 border border-pink-200 rounded-full px-4 py-1.5
            hover:bg-pink-50 transition-colors duration-150"
        >
          {t('common.login')}
        </button>
        <button
          onClick={() => navigate('/auth')}
          className="text-sm text-white accent-gradient rounded-full px-4 py-1.5
            hover:brightness-110 transition-all duration-150 shadow-glow"
        >
          {t('common.register')}
        </button>
      </div>
    </motion.nav>
  );
}

/* ── Radar Chart ── */
function RadarChart({ animate, traits }: { animate: boolean; traits: { name: string; value: number }[] }) {
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
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated, hasCompanion } = useAuth();

  const traits = useMemo(() => [
    { name: t('home.radarOpenness'), desc: t('home.radarOpennessDesc'), value: 70 },
    { name: t('home.radarConscientiousness'), desc: t('home.radarConscientiousnessDesc'), value: 55 },
    { name: t('home.radarExtraversion'), desc: t('home.radarExtraversionDesc'), value: 80 },
    { name: t('home.radarAgreeableness'), desc: t('home.radarAgreeablenessDesc'), value: 90 },
    { name: t('home.radarNeuroticism'), desc: t('home.radarNeuroticismDesc'), value: 40 },
  ], [t, lang]);

  const milestones = useMemo(() => [
    { id: 1, name: t('home.milestoneStage1'), unlocked: true, current: false },
    { id: 2, name: t('home.milestoneStage2'), unlocked: true, current: false },
    { id: 3, name: t('home.milestoneStage3'), unlocked: true, current: true },
    { id: 4, name: t('home.milestoneStage4'), unlocked: false, current: false },
    { id: 5, name: t('home.milestoneStage5'), unlocked: false, current: false },
  ], [t, lang]);

  const features = useMemo(() => [
    { icon: <Edit3 size={24} />, title: t('home.gridCustomizeTitle'), desc: t('home.gridCustomizeDesc'), color: 'bg-pink-100 text-pink-500' },
    { icon: <Sparkles size={24} />, title: t('home.gridLive2dTitle'), desc: t('home.gridLive2dDesc'), color: 'bg-purple-100 text-purple-500' },
    { icon: <Calendar size={24} />, title: t('home.gridMemoryTitle'), desc: t('home.gridMemoryDesc'), color: 'bg-amber-100 text-amber-600' },
    { icon: <BookOpen size={24} />, title: t('home.gridDramaTitle'), desc: t('home.gridDramaDesc'), color: 'bg-rose-100 text-rose-500' },
    { icon: <TrendingUp size={24} />, title: t('home.gridMoodTitle'), desc: t('home.gridMoodDesc'), color: 'bg-sky-100 text-sky-500' },
    { icon: <Lock size={24} />, title: t('home.gridPrivacyTitle'), desc: t('home.gridPrivacyDesc'), color: 'bg-emerald-100 text-emerald-600' },
  ], [t, lang]);

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
    <div className="min-h-screen bg-pink-50 text-plum-900 home-light-only">
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
            {t('home.heroTitle')}
          </motion.h1>

          <motion.p
            className="font-body text-[28px] font-bold leading-[1.3] text-plum-800 mt-3"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: easeSmooth }}
          >
            {t('home.heroSubtitle')}
          </motion.p>

          {/* Subtitle */}
          <motion.p
            className="font-body text-[15px] text-plum-800 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6, ease: easeSmooth }}
          >
            {t('home.heroDesc')}
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
              {isAuthenticated && hasCompanion ? t('home.ctaEnter') : t('home.ctaStart')}
            </button>
            {isAuthenticated && hasCompanion && (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-pink-500 text-[14px] font-medium
                  hover:text-pink-600 transition-colors duration-150"
              >
                <LayoutDashboard size={16} />
                {t('home.ctaDashboard')}
              </button>
            )}
            <button
              onClick={scrollToConcept}
              className="text-pink-500 text-[14px] font-medium
                hover:text-pink-600 transition-colors duration-150"
            >
              {t('home.ctaLearnMore')}
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
            {t('home.conceptTitle')}
          </motion.h2>

          <motion.p
            className="font-body text-[16px] text-plum-800 max-w-[640px] mx-auto text-center mt-4 leading-relaxed"
            initial="hidden"
            animate={conceptInView ? 'visible' : 'hidden'}
            variants={fadeUp}
            custom={0.15}
          >
            {t('home.conceptDesc')}
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
                title: t('home.featureChatTitle'),
                desc: t('home.featureChatDesc'),
              },
              {
                icon: <Sparkles size={40} className="text-pink-400" />,
                title: t('home.featurePersonalityTitle'),
                desc: t('home.featurePersonalityDesc'),
              },
              {
                icon: <Heart size={40} className="text-pink-400" />,
                title: t('home.featureMemoryTitle'),
                desc: t('home.featureMemoryDesc'),
              },
            ].map((card, i) => (
              <motion.div
                key={`${lang}-${i}`}
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
                {t('home.radarTitle')}
              </h2>
              <p className="font-body text-[15px] text-plum-800 mt-4 leading-relaxed">
                {t('home.radarDesc')}
              </p>

              {/* Trait list */}
              <div className="mt-6 flex flex-col gap-4">
                {traits.map((trait, i) => (
                  <motion.div
                    key={trait.name}
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
                  <RadarChart animate={radarInView} traits={traits} />
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
            {t('home.milestoneTitle')}
          </motion.h2>
          <motion.p
            className="font-body text-[15px] text-plum-800 text-center mt-3"
            initial="hidden"
            animate={milestoneInView ? 'visible' : 'hidden'}
            variants={fadeUp}
            custom={0.15}
          >
            {t('home.milestoneSubtitle')}
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
            <h4 className="font-body text-[18px] font-semibold text-plum-900">{t('home.milestoneCurrentStage')}</h4>
            <p className="font-body text-[13px] text-plum-800 mt-2 leading-relaxed">
              {t('home.milestoneCurrentDesc')}
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
                key={`${lang}-${i}`}
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
              {t('home.testimonialQuote')}
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
              <p className="font-body text-[13px] text-plum-800">{t('home.testimonialUser')}</p>
              <p className="font-body text-[12px] font-semibold uppercase tracking-[0.04em] text-pink-500">
                {t('home.testimonialCompanion')}
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
            {t('home.ctaTitle')}
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
              {isAuthenticated && hasCompanion ? t('home.ctaButtonEnter') : t('home.ctaButtonStart')}
            </button>
          </motion.div>

          <motion.p
            className="font-body text-[13px] text-white/80 mt-4"
            initial={{ opacity: 0 }}
            animate={ctaInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5, ease: easeSmooth }}
          >
            {t('home.ctaSub')}
          </motion.p>
        </div>
      </section>

      {/* ═══════ Shared Footer ═══════ */}
      <Footer />
    </div>
  );
}