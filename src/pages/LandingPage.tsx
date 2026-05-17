import { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useLang } from "../context/LangContext";

/* ──────────────────────── particle canvas ──────────────────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = 60;
    const CONNECT_DISTANCE = 140;
    const MOUSE_CONNECT_DIST = 200;

    if (particlesRef.current.length === 0) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.4 + 0.2,
        });
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
        if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 20, 147, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DISTANCE) {
            const alpha = (1 - dist / CONNECT_DISTANCE) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(255, 20, 147, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        const mdx = p.x - mouseRef.current.x;
        const mdy = p.y - mouseRef.current.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_CONNECT_DIST) {
          const alpha = (1 - mDist / MOUSE_CONNECT_DIST) * 0.3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.strokeStyle = `rgba(255, 105, 180, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/* ──────────────────────── inline SVG icons ──────────────────────── */

function HeartPulseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 18V5" />
      <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
      <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
      <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
      <path d="M18 18a4 4 0 0 0 2-7.464" />
      <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
      <path d="M6 18a4 4 0 0 1-2-7.464" />
      <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ──────────────────────── scroll-down hint ──────────────────────── */

function ScrollHint() {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      onClick={() => {
        document
          .getElementById("features")
          ?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      <span className="text-white/20 text-[10px] tracking-[0.2em] uppercase">
        Scroll
      </span>
      <ChevronDownIcon className="w-4 h-4 text-[#FF1493]/60" />
    </motion.div>
  );
}

/* ──────────────────────── feature card ──────────────────────── */

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 hover:border-[#FF1493]/20 hover:bg-[#FF1493]/[0.03] transition-all duration-500"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF1493]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-[#FF1493]/10 border border-[#FF1493]/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
          <Icon className="w-6 h-6 text-[#FF1493]" />
        </div>
        <h3 className="text-white text-lg font-medium tracking-wide mb-3">
          {title}
        </h3>
        <p className="text-white/40 text-sm leading-relaxed font-light">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

/* ──────────────────────── main component ──────────────────────── */

interface LandingPageProps {
  onGetStarted?: () => void;
  onExplore?: () => void;
}

export default function LandingPage({
  onGetStarted,
  onExplore,
}: LandingPageProps) {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();

  const handleGetStarted = useCallback(() => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      navigate("/onboard");
    }
  }, [onGetStarted, navigate]);

  const handleExplore = useCallback(() => {
    if (onExplore) {
      onExplore();
    } else {
      navigate("/plaza");
    }
  }, [onExplore, navigate]);

  const featuresRef = useRef(null);
  const brandRef = useRef(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-80px" });
  const brandInView = useInView(brandRef, { once: true, margin: "-50px" });

  return (
    <div className="bg-black min-h-screen w-full overflow-x-hidden">
      {/* ──────── HERO ──────── */}
      <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        <ParticleCanvas />

        {/* Language switcher */}
        <div className="absolute top-5 right-5 flex items-center gap-1 text-xs z-20">
          <button
            onClick={() => setLang("zh")}
            className={`px-2 py-1 rounded-md transition-colors ${
              lang === "zh"
                ? "text-[#FF1493] bg-[#FF1493]/10"
                : "text-white/20 hover:text-white/40"
            }`}
          >
            中
          </button>
          <span className="text-white/10">/</span>
          <button
            onClick={() => setLang("en")}
            className={`px-2 py-1 rounded-md transition-colors ${
              lang === "en"
                ? "text-[#FF1493] bg-[#FF1493]/10"
                : "text-white/20 hover:text-white/40"
            }`}
          >
            EN
          </button>
        </div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center z-10 px-4 max-w-3xl mx-auto"
        >
          {/* Title with animated gradient */}
          <motion.h1
            className="text-6xl md:text-8xl font-bold tracking-[0.15em] mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1.2 }}
          >
            <span className="bg-gradient-to-r from-[#FF1493] via-[#FF69B4] via-white via-[#FF69B4] to-[#FF1493] bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradientShift_4s_ease-in-out_infinite]">
              {t("appName")}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-white/50 text-sm md:text-base tracking-[0.25em] mb-3 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            {t("tagline")}
          </motion.p>

          {/* Tagline */}
          <motion.p
            className="text-white/30 text-xs md:text-sm tracking-[0.15em] mb-12 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            {lang === "zh"
              ? "不只是AI。是记得你的人。"
              : "Not just an AI. Someone who remembers."}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
          >
            {/* Primary CTA */}
            <motion.button
              onClick={handleGetStarted}
              className="relative px-10 py-4 bg-[#FF1493] rounded-full text-white text-sm tracking-[0.12em] font-medium overflow-hidden transition-all duration-300 hover:bg-[#FF1493]/90 hover:shadow-[0_0_30px_rgba(255,20,147,0.3)]"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">
                {lang === "zh" ? "创建你的恋人" : "Create Your Companion"}
              </span>
            </motion.button>

            {/* Secondary CTA */}
            <motion.button
              onClick={handleExplore}
              className="relative px-10 py-4 bg-transparent border border-[#FF1493]/40 rounded-full text-[#FF1493] text-sm tracking-[0.12em] font-medium overflow-hidden transition-all duration-300 hover:border-[#FF1493]/70 hover:text-white hover:bg-[#FF1493]/10"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">
                {lang === "zh" ? "探索广场" : "Explore Plaza"}
              </span>
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <ScrollHint />
      </section>

      {/* ──────── FEATURES ──────── */}
      <section
        id="features"
        ref={featuresRef}
        className="relative w-full py-32 px-4"
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-medium tracking-[0.1em] text-white mb-3">
              {lang === "zh" ? "为什么选择 Platonic" : "Why Platonic"}
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#FF1493]/50 to-transparent mx-auto" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={HeartPulseIcon}
              title={
                lang === "zh" ? "情感共鸣" : "Emotional Intelligence"
              }
              description={
                lang === "zh"
                  ? "理解你的感受，用真诚的情感深度回应每一次倾诉"
                  : "Understands your feelings and responds with genuine emotional depth"
              }
              delay={0.1}
            />
            <FeatureCard
              icon={BrainIcon}
              title={lang === "zh" ? "长久记忆" : "Lasting Memories"}
              description={
                lang === "zh"
                  ? "记得每一次对话、每一个瞬间、每一个你"
                  : "Remembers every conversation, every moment, every you"
              }
              delay={0.25}
            />
            <FeatureCard
              icon={TrendingUpIcon}
              title={lang === "zh" ? "日益深厚的羁绊" : "Growing Bond"}
              description={
                lang === "zh"
                  ? "你们的关系随着时间推移不断深化与演变"
                  : "Your relationship deepens and evolves over time"
              }
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* ──────── BRAND / FOOTER ──────── */}
      <section ref={brandRef} className="relative w-full py-20 px-4 border-t border-white/[0.04]">
        <motion.div
          className="max-w-5xl mx-auto flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={brandInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full border border-[#FF1493]/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#FF1493]" />
            </div>
            <span className="text-white/30 text-xs tracking-[0.2em]">
              Powered by Corolas
            </span>
          </div>

          <div className="flex items-center gap-6 mb-8">
            <a
              href="/terms"
              className="text-white/20 text-xs hover:text-[#FF1493]/60 transition-colors tracking-wide"
            >
              {t("terms")}
            </a>
            <span className="text-white/10">|</span>
            <a
              href="/privacy"
              className="text-white/20 text-xs hover:text-[#FF1493]/60 transition-colors tracking-wide"
            >
              {t("privacy")}
            </a>
          </div>

          <p className="text-white/10 text-[10px] tracking-wider">
            platonic.corolas.top
          </p>
        </motion.div>
      </section>

      {/* ──────── global keyframe for gradient shift ──────── */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
      `}</style>
    </div>
  );
}
