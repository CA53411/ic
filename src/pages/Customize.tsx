import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  User,
  Sparkles,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  CheckSquare,
  Users,
  Heart,
  CloudRain,
  Loader2,
} from 'lucide-react';

/* ──────────── Types ──────────── */
interface BigFive {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

/* ──────────── Constants ──────────── */
const traitConfig: {
  key: keyof BigFive;
  label: string;
  icon: React.ReactNode;
  color: string;
  leftLabel: string;
  rightLabel: string;
}[] = [
  { key: 'openness', label: '开放性', icon: <Lightbulb size={18} />, color: '#FF69B4', leftLabel: '务实保守', rightLabel: '好奇创新' },
  { key: 'conscientiousness', label: '尽责性', icon: <CheckSquare size={18} />, color: '#E8A0BF', leftLabel: '随性自由', rightLabel: '严谨自律' },
  { key: 'extraversion', label: '外向性', icon: <Users size={18} />, color: '#D4A574', leftLabel: '内向安静', rightLabel: '外向活跃' },
  { key: 'agreeableness', label: '宜人性', icon: <Heart size={18} />, color: '#FF69B4', leftLabel: '理性独立', rightLabel: '温和友善' },
  { key: 'neuroticism', label: '神经质', icon: <CloudRain size={18} />, color: '#C8A8E9', leftLabel: '情绪稳定', rightLabel: '敏感多变' },
];

const bigFiveDescriptions: Record<keyof BigFive, string[]> = {
  openness: [
    '极度保守', '非常传统', '偏好稳定', '谨慎求稳', '适度务实',
    '略有好奇', '比较开放', '富有探索欲', '极具创造力', '天才般的想象力',
  ],
  conscientiousness: [
    '极度随性', '非常自由', '不拘小节', '灵活变通', '适度松弛',
    '比较有条理', '认真负责', '非常自律', '极度严谨', '完美主义者',
  ],
  extraversion: [
    '极度内向', '非常安静', '偏好独处', '较为沉静', '适度内敛',
    '略偏外向', '比较活跃', '非常热情', '极度外向', '天生的焦点',
  ],
  agreeableness: [
    '极度理性', '非常独立', '注重逻辑', '较为冷静', '适度客观',
    '比较友善', '善解人意', '非常温和', '极度体贴', '圣母般的包容',
  ],
  neuroticism: [
    '极度冷静', '非常沉稳', '情绪稳定', '较为淡定', '适度平和',
    '略有波动', '比较敏感', '情绪波动大', '极度敏感', '多愁善感',
  ],
};

const personalityPresets: { label: string; values: BigFive; color: string }[] = [
  { label: '温柔型', values: { openness: 50, conscientiousness: 60, extraversion: 40, agreeableness: 90, neuroticism: 30 }, color: 'bg-pink-100 text-pink-500' },
  { label: '活泼型', values: { openness: 85, conscientiousness: 40, extraversion: 90, agreeableness: 70, neuroticism: 50 }, color: 'bg-orange-100 text-orange-500' },
  { label: '知性型', values: { openness: 90, conscientiousness: 85, extraversion: 40, agreeableness: 60, neuroticism: 25 }, color: 'bg-purple-100 text-purple-500' },
  { label: '冷静型', values: { openness: 50, conscientiousness: 80, extraversion: 30, agreeableness: 55, neuroticism: 10 }, color: 'bg-blue-100 text-blue-500' },
  { label: '元气型', values: { openness: 70, conscientiousness: 50, extraversion: 85, agreeableness: 85, neuroticism: 40 }, color: 'bg-yellow-100 text-yellow-600' },
];

const storyPrompts = [
  '她在一个樱花小镇长大，从小就喜欢画画和做甜点...',
  '她是一名热爱星空的天文学者，在山顶观测站工作...',
  '她曾经环游世界，现在想要安定下来，开一家咖啡馆...',
  '她是一位神秘的图书馆管理员，拥有不为人知的故事...',
];

const topicOptions = [
  '日常生活', '文学小说', '动漫游戏', '哲学思考', '情感交流',
  '旅行探险', '美食烹饪', '音乐艺术', '科学知识', '时尚潮流',
];

const avatarOptions = [
  '/companion-1.jpg', '/companion-2.jpg', '/companion-3.jpg',
  '/companion-4.jpg', '/companion-5.jpg', '/companion-6.jpg',
];

const genderOptions = [
  { value: 'female', label: '女性', color: 'hover:bg-pink-50', activeColor: 'border-pink-400 bg-pink-50 shadow-glow' },
  { value: 'male', label: '男性', color: 'hover:bg-blue-50', activeColor: 'border-blue-400 bg-blue-50 shadow-[0_0_24px_rgba(96,165,250,0.25)]' },
  { value: 'neutral', label: '其他', color: 'hover:bg-purple-50', activeColor: 'border-purple-400 bg-purple-50 shadow-[0_0_24px_rgba(168,130,230,0.25)]' },
];

/* ──────────── Helpers ──────────── */
function getTraitDescription(trait: keyof BigFive, value: number): string {
  const index = Math.min(Math.floor(value / 10), 9);
  return bigFiveDescriptions[trait][index];
}

function generatePersonalityText(personality: BigFive): string {
  const entries = Object.entries(personality) as [keyof BigFive, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3);
  const traitNames: Record<keyof BigFive, string> = {
    openness: '开放性',
    conscientiousness: '尽责性',
    extraversion: '外向性',
    agreeableness: '宜人性',
    neuroticism: '神经质',
  };
  const topTraits = top3.map(([k]) => traitNames[k]).join('、');
  return `她是一位${getTraitDescription(top3[0][0], top3[0][1])}的伴侣，在${topTraits}等方面表现突出。与她相处，你会感受到${getTraitDescription(top3[1][0], top3[1][1])}的特质，而她的${getTraitDescription(top3[2][0], top3[2][1])}也会让你们的相处充满趣味。`;
}

/* ──────────── Mini Radar Chart ──────────── */
function MiniRadarChart({ personality, size = 180 }: { personality: BigFive; size?: number }) {
  const traits = Object.values(personality);
  const maxVal = 100;
  const center = size / 2;
  const radius = size / 2 - 20;
  const angleStep = (Math.PI * 2) / 5;
  const startAngle = -Math.PI / 2;

  const points = traits.map((val, i) => {
    const angle = startAngle + i * angleStep;
    const r = (val / maxVal) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Grid lines for levels 0.2, 0.4, 0.6, 0.8, 1.0
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background grid */}
      {levels.map((level) => {
        const levelRadius = radius * level;
        const levelPoints = Array.from({ length: 5 }, (_, i) => {
          const angle = startAngle + i * angleStep;
          return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={levelPoints}
            fill="none"
            stroke="rgba(255,182,193,0.3)"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Axis lines */}
      {Array.from({ length: 5 }, (_, i) => {
        const angle = startAngle + i * angleStep;
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(angle)}
            y2={center + radius * Math.sin(angle)}
            stroke="rgba(255,182,193,0.3)"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Data polygon */}
      <motion.polygon
        points={polygonPoints}
        fill="rgba(255,105,180,0.2)"
        stroke="#FF69B4"
        strokeWidth={1.5}
        initial={false}
        animate={{ points: polygonPoints }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
      {/* Data points */}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="#FF69B4"
          initial={false}
          animate={{ cx: p.x, cy: p.y }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      ))}
    </svg>
  );
}

/* ──────────── Confetti Particle ──────────── */
function ConfettiParticle({ delay }: { delay: number }) {
  const x = Math.random() * 100;
  const startRotation = Math.random() * 360;
  const colors = ['#FF69B4', '#FFB6C1', '#E8A0BF', '#D4A574', '#C8A8E9', '#FFD4E0'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = `${x}%`;

  return (
    <motion.div
      className="absolute w-2.5 h-2.5 rounded-sm pointer-events-none"
      style={{
        left,
        bottom: '50%',
        backgroundColor: color,
      }}
      initial={{ y: 0, opacity: 1, rotate: startRotation, scale: 1 }}
      animate={{
        y: [0, -30 - Math.random() * 100, 200 + Math.random() * 200],
        x: [(x - 50) * 0.5, (x - 50) * 1.5 + (Math.random() - 0.5) * 150, (x - 50) * 2 + (Math.random() - 0.5) * 100],
        opacity: [1, 1, 0],
        rotate: startRotation + Math.random() * 720 - 360,
        scale: [1, 1.2, 0.5],
      }}
      transition={{
        duration: 2 + Math.random() * 1.5,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

/* ──────────── Main Component ──────────── */
export default function Customize() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0, 1, 2
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [isComplete, setIsComplete] = useState(false);
  const [creating, setCreating] = useState(false);

  // Step 1 state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<string>('female');
  const [age, setAge] = useState<number>(20);
  const [birthday, setBirthday] = useState('');
  const [background, setBackground] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [intro, setIntro] = useState('');

  // Step 2 state
  const [personality, setPersonality] = useState<BigFive>({
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50,
  });
  const [activePreset, setActivePreset] = useState<number | null>(null);

  // Step 3 state
  const [backstory, setBackstory] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [showPrompts, setShowPrompts] = useState(false);

  const canProceed = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    return true;
  }, [step, name]);

  const createCompanion = useCallback(async () => {
    try {
      setCreating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('请先登录');
        return;
      }

      // Parse birthday into month and day
      let birthMonth: number | null = null;
      let birthDay: number | null = null;
      if (birthday) {
        const parts = birthday.split('-');
        if (parts.length === 3) {
          birthMonth = parseInt(parts[1], 10);
          birthDay = parseInt(parts[2], 10);
        }
      }

      // 1. Insert companion
      const { data: companion, error } = await supabase.from('companions').insert({
        user_id: user.id,
        nickname: name,
        gender: gender,
        age: age,
        birth_month: birthMonth,
        birth_day: birthDay,
        background: backstory,
        main_language: 'zh',
        personality_openness: personality.openness,
        personality_conscientiousness: personality.conscientiousness,
        personality_extraversion: personality.extraversion,
        personality_agreeableness: personality.agreeableness,
        personality_neuroticism: personality.neuroticism,
        welcome_message: firstMessage || `你好呀！我是${name}，很高兴认识你～`,
      }).select().single();

      if (error) throw error;

      // 2. Create intimacy record (initial score 0, stage 1)
      await supabase.from('intimacy_records').insert({
        companion_id: companion.id,
        user_id: user.id,
        score: 0,
        milestone_stage: 1,
      });

      // 3. Create mood record
      await supabase.from('mood_records').insert({
        companion_id: companion.id,
        pleasure: 0.3,
        arousal: 0.2,
        dominance: 0.1,
      });

      // 4. Update user profile status
      await supabase.from('profiles').update({
        status: 'HAS_COMPANION',
        current_companion_id: companion.id,
      }).eq('id', user.id);

      toast.success('伴侣创建成功！');
      setIsComplete(true);
      setTimeout(() => {
        navigate('/chat');
      }, 3500);
    } catch (e: any) {
      toast.error('创建失败: ' + (e.message || '未知错误'));
    } finally {
      setCreating(false);
    }
  }, [navigate, name, gender, age, birthday, backstory, personality, firstMessage]);

  const handleNext = useCallback(() => {
    if (step < 2) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      createCompanion();
    }
  }, [step, createCompanion]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  const applyPreset = useCallback((index: number) => {
    setActivePreset(index);
    setPersonality({ ...personalityPresets[index].values });
  }, []);

  const toggleTopic = useCallback((topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }, []);

  const applyStoryPrompt = useCallback((prompt: string) => {
    setBackstory(prompt);
    setShowPrompts(false);
  }, []);

  const handleSliderChange = useCallback((key: keyof BigFive, value: number) => {
    setPersonality((prev) => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }, []);

  // Steps config
  const steps = [
    { label: '基础', icon: <User size={18} />, name: '基本信息' },
    { label: '性格', icon: <Sparkles size={18} />, name: '人格设定' },
    { label: '故事', icon: <BookOpen size={18} />, name: '背景故事' },
  ];

  /* ──────────── Animation Variants ──────────── */
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  const staggerContainer = {
    animate: {
      transition: { staggerChildren: 0.06 },
    },
  };

  const staggerItem = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
  };

  /* ──────────── Render ──────────── */
  if (isComplete) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-pink-50 via-pink-100 to-pink-200">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }, (_, i) => (
            <ConfettiParticle key={i} delay={i * 0.08} />
          ))}
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
          className="text-center z-10 px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full accent-gradient flex items-center justify-center mx-auto mb-6 shadow-glow"
          >
            <Check size={40} className="text-white" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-plum-900 mb-3 font-display"
          >
            创建成功！
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-plum-800 text-lg"
          >
            {name || '你的伴侣'}已经准备好了，正在前往聊天界面...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-pink-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <h2 className="text-2xl font-bold text-plum-900 font-display">创建个人伴侣</h2>
          <span className="text-sm text-muted-plum">Step {step + 1} of 3</span>
        </motion.div>

        {/* Step Indicator */}
        <div className="max-w-lg mx-auto mb-10">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center relative flex-1">
                {/* Connecting line */}
                {i < steps.length - 1 && (
                  <div className="absolute top-5 left-1/2 w-full h-0.5 bg-pink-100 -z-10">
                    <motion.div
                      className="h-full bg-pink-400 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: i < step ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                )}

                {/* Step circle */}
                <motion.button
                  onClick={() => {
                    if (i <= step) {
                      setDirection(i < step ? -1 : 1);
                      setStep(i);
                    }
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    i < step
                      ? 'bg-pink-400 text-white'
                      : i === step
                      ? 'bg-pink-400 text-white shadow-glow'
                      : 'bg-pink-100 text-muted-plum'
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  {i < step ? <Check size={18} /> : s.icon}
                  {i === step && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-pink-400"
                      animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.button>

                {/* Label */}
                <span
                  className={`text-xs mt-2 font-medium ${
                    i === step ? 'text-plum-900 font-bold' : 'text-muted-plum'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex gap-8 items-start">
          {/* Main Form */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 0 && (
                <motion.div
                  key="step0"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                >
                  <div className="bg-white rounded-2xl border border-pink-100 shadow-md p-8 max-w-2xl mx-auto card-gradient">
                    <motion.div variants={staggerContainer} initial="initial" animate="animate">
                      {/* Companion Name */}
                      <motion.div variants={staggerItem} className="mb-6">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-2">
                          伴侣名称 <span className="text-pink-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value.slice(0, 16))}
                          placeholder="给她一个温暖的名字..."
                          className="w-full px-4 py-3 rounded-xl bg-white border border-pink-100 text-plum-900 placeholder:text-muted-plum focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200"
                        />
                        <span className="text-xs text-muted-plum mt-1 block text-right">{name.length}/16</span>
                      </motion.div>

                      {/* Gender */}
                      <motion.div variants={staggerItem} className="mb-6">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-2">
                          性别 <span className="text-pink-400">*</span>
                        </label>
                        <div className="flex gap-3">
                          {genderOptions.map((g) => (
                            <button
                              key={g.value}
                              onClick={() => setGender(g.value)}
                              className={`flex-1 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer ${
                                gender === g.value ? g.activeColor : `border-pink-100 ${g.color}`
                              }`}
                            >
                              <User size={22} className={gender === g.value ? 'text-current' : 'text-muted-plum'} />
                              <span className={`text-sm font-medium ${gender === g.value ? 'text-current' : 'text-muted-plum'}`}>
                                {g.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>

                      {/* Age */}
                      <motion.div variants={staggerItem} className="mb-6">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-2">
                          年龄
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={age}
                          onChange={(e) => setAge(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-pink-100 text-plum-900 focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200"
                        />
                      </motion.div>

                      {/* Birthday */}
                      <motion.div variants={staggerItem} className="mb-6">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-2">
                          生日
                        </label>
                        <input
                          type="date"
                          value={birthday}
                          onChange={(e) => setBirthday(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-pink-100 text-plum-900 placeholder:text-muted-plum focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200"
                        />
                      </motion.div>

                      {/* Short intro */}
                      <motion.div variants={staggerItem} className="mb-6">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-2">
                          一句话简介
                        </label>
                        <textarea
                          value={intro}
                          onChange={(e) => setIntro(e.target.value.slice(0, 60))}
                          placeholder="用一句话描述她给你的第一印象..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-pink-100 text-plum-900 placeholder:text-muted-plum focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200 resize-none"
                        />
                        <span className="text-xs text-muted-plum mt-1 block text-right">{intro.length}/60</span>
                      </motion.div>

                      {/* Avatar selection */}
                      <motion.div variants={staggerItem}>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-3">
                          头像
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {avatarOptions.map((avatar, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedAvatar(i)}
                              className={`relative w-20 h-20 mx-auto rounded-full overflow-hidden transition-all duration-200 ${
                                selectedAvatar === i
                                  ? 'ring-[3px] ring-pink-400 shadow-glow scale-105'
                                  : 'ring-2 ring-pink-100 hover:ring-pink-300'
                              }`}
                            >
                              <img src={avatar} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                >
                  <div className="bg-white rounded-2xl border border-pink-100 shadow-md p-8 max-w-3xl mx-auto card-gradient">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="inline-block mb-2"
                      >
                        <Sparkles size={24} className="text-pink-400" />
                      </motion.div>
                      <h2 className="text-2xl font-bold text-plum-900 font-display mb-1">塑造她的灵魂</h2>
                      <p className="text-sm text-plum-800">拖动滑块，定义她独一无二的性格</p>
                    </div>

                    {/* Big Five Sliders */}
                    <motion.div variants={staggerContainer} initial="initial" animate="animate">
                      {traitConfig.map((trait, _idx) => (
                        <motion.div key={trait.key} variants={staggerItem} className="mb-7 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span style={{ color: trait.color }}>{trait.icon}</span>
                              <span className="text-sm font-semibold text-plum-900">{trait.label}</span>
                              <span className="text-xs text-muted-plum">
                                （{trait.leftLabel} · {trait.rightLabel}）
                              </span>
                            </div>
                            <motion.span
                              key={personality[trait.key]}
                              initial={{ scale: 1.2 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.15 }}
                              className="text-xl font-semibold text-pink-500 font-number"
                            >
                              {personality[trait.key]}
                            </motion.span>
                          </div>

                          {/* Slider track */}
                          <div className="relative h-2 bg-pink-50 rounded-full mb-1.5">
                            <motion.div
                              className="absolute left-0 top-0 h-full rounded-full accent-gradient"
                              initial={false}
                              animate={{ width: `${personality[trait.key]}%` }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={personality[trait.key]}
                              onChange={(e) => handleSliderChange(trait.key, Number(e.target.value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {/* Thumb visual */}
                            <motion.div
                              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-pink-400 shadow-md pointer-events-none z-0"
                              initial={false}
                              animate={{ left: `calc(${personality[trait.key]}% - 10px)` }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                          </div>

                          {/* Description */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-plum">{trait.leftLabel}</span>
                            <span className="text-xs font-medium text-pink-400">
                              {getTraitDescription(trait.key, personality[trait.key])}
                            </span>
                            <span className="text-xs text-muted-plum">{trait.rightLabel}</span>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Presets */}
                    <div className="mt-8 pt-6 border-t border-pink-100">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-plum mb-3">性格预设</p>
                      <div className="flex flex-wrap gap-2">
                        {personalityPresets.map((preset, i) => (
                          <button
                            key={preset.label}
                            onClick={() => applyPreset(i)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                              activePreset === i
                                ? 'bg-pink-400 text-white shadow-glow'
                                : `${preset.color} hover:scale-105`
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                >
                  <div className="bg-white rounded-2xl border border-pink-100 shadow-md p-8 max-w-2xl mx-auto card-gradient">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-plum-900 font-display mb-1">她的故事</h2>
                      <p className="text-sm text-plum-800">为她编写一段背景故事，让她更加真实立体</p>
                    </div>

                    <motion.div variants={staggerContainer} initial="initial" animate="animate">
                      {/* Backstory */}
                      <motion.div variants={staggerItem} className="mb-6">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-2">
                          背景故事
                        </label>
                        <textarea
                          value={backstory}
                          onChange={(e) => setBackstory(e.target.value.slice(0, 500))}
                          placeholder="她从哪里来？有着怎样的过去？喜欢什么、害怕什么？写下她的故事..."
                          rows={8}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-pink-100 text-plum-900 placeholder:text-muted-plum focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200 resize-none"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <button
                            onClick={() => setShowPrompts(!showPrompts)}
                            className="text-xs text-pink-500 hover:text-pink-400 font-medium transition-colors"
                          >
                            {showPrompts ? '收起提示' : '需要灵感？点击获取提示'}
                          </button>
                          <span className="text-xs text-muted-plum">{backstory.length}/500</span>
                        </div>
                        <AnimatePresence>
                          {showPrompts && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-wrap gap-2 mt-3">
                                {storyPrompts.map((prompt, i) => (
                                  <motion.button
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.04 }}
                                    onClick={() => applyStoryPrompt(prompt)}
                                    className="px-3 py-2 rounded-full text-xs bg-pink-50 text-pink-500 border border-pink-100 hover:bg-pink-100 transition-colors"
                                  >
                                    {prompt.slice(0, 20)}...
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* First Message */}
                      <motion.div variants={staggerItem} className="mb-6">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-2">
                          初见时的第一句话
                        </label>
                        <input
                          type="text"
                          value={firstMessage}
                          onChange={(e) => setFirstMessage(e.target.value)}
                          placeholder="当她第一次见你时，会说些什么？"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-pink-100 text-plum-900 placeholder:text-muted-plum focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200"
                        />
                        <p className="text-xs text-muted-plum mt-1 italic">
                          例如：&ldquo;嗨，终于见到你了。我等了你好久。&rdquo;
                        </p>
                      </motion.div>

                      {/* Topic Preferences */}
                      <motion.div variants={staggerItem}>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-plum-900 mb-2">
                          她擅长的话题
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {topicOptions.map((topic) => (
                            <button
                              key={topic}
                              onClick={() => toggleTopic(topic)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                                selectedTopics.includes(topic)
                                  ? 'bg-pink-400 text-white shadow-sm scale-105'
                                  : 'bg-pink-50 text-plum-800 border border-pink-100 hover:bg-pink-100'
                              }`}
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="max-w-2xl mx-auto mt-8 flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className={`px-6 py-3 rounded-xl text-sm font-medium border border-pink-100 transition-all duration-200 flex items-center gap-2 ${
                  step === 0
                    ? 'text-muted-plum bg-white/50 cursor-not-allowed'
                    : 'text-plum-900 bg-white hover:bg-pink-50 hover:shadow-md'
                }`}
              >
                <ChevronLeft size={16} />
                上一步
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed || creating}
                className={`px-8 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  canProceed && !creating
                    ? step === 2
                      ? 'accent-gradient text-white shadow-glow hover:brightness-110'
                      : 'accent-gradient text-white hover:brightness-110 shadow-md'
                    : 'bg-pink-200 text-white/60 cursor-not-allowed'
                }`}
              >
                {step === 2 ? (
                  creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      完成创建
                    </>
                  )
                ) : (
                  <>
                    下一步
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <AnimatePresence>
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                className="w-72 flex-shrink-0"
              >
                <div className="bg-white rounded-2xl border border-pink-100 shadow-md p-6 sticky top-8 card-gradient">
                  <h3 className="text-lg font-bold text-plum-900 mb-4 font-display">性格预览</h3>

                  {/* Radar Chart */}
                  <div className="flex justify-center mb-5">
                    <MiniRadarChart personality={personality} size={180} />
                  </div>

                  {/* Personality Description */}
                  <div className="border-l-[3px] border-rose-gold pl-3 mb-5">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={JSON.stringify(personality)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm text-plum-800 leading-relaxed"
                      >
                        {generatePersonalityText(personality)}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  {/* Avatar Preview */}
                  <div className="flex flex-col items-center">
                    <img
                      src={avatarOptions[selectedAvatar]}
                      alt="Preview"
                      className="w-[120px] h-[120px] rounded-full object-cover shadow-glow ring-2 ring-pink-100"
                    />
                    <p className="mt-3 text-base font-semibold text-plum-900">
                      {name || '未命名'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 3 Preview Summary */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                className="w-72 flex-shrink-0"
              >
                <div className="bg-white rounded-2xl border border-pink-100 shadow-md p-6 sticky top-8 card-gradient">
                  <h3 className="text-lg font-bold text-plum-900 mb-4 font-display">伴侣预览</h3>

                  <div className="flex flex-col items-center mb-5">
                    <img
                      src={avatarOptions[selectedAvatar]}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover shadow-glow ring-2 ring-pink-100"
                    />
                    <p className="mt-3 text-lg font-semibold text-plum-900">
                      {name || '未命名'}
                    </p>
                    <p className="text-sm text-muted-plum">
                      {genderOptions.find((g) => g.value === gender)?.label} · {age}岁
                    </p>
                  </div>

                  {intro && (
                    <p className="text-sm text-plum-800 italic text-center mb-4 border-l-[3px] border-rose-gold pl-3">
                      &ldquo;{intro}&rdquo;
                    </p>
                  )}

                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-plum mb-2">性格特点</p>
                    <MiniRadarChart personality={personality} size={160} />
                  </div>

                  {selectedTopics.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-plum mb-2">擅长话题</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTopics.map((topic) => (
                          <span key={topic} className="px-2 py-1 rounded-full text-xs bg-pink-50 text-pink-500 border border-pink-100">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {backstory && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-plum mb-1">背景故事</p>
                      <p className="text-xs text-plum-800 line-clamp-4">{backstory}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
