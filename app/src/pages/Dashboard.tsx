import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Zap,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Users,
  MessageCircle,
  BookOpen,
  Star,
  Check,
  RefreshCw,
  AlertCircle,
  LogIn,
  Battery,
  PawPrint,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nContext';

/* ─── Types ─── */
interface TraitData {
  name: string;
  nameEn: string;
  value: number;
  description: string;
}

interface Stage {
  num: number;
  name: string;
  nameEn: string;
  description: string;
}

interface Companion {
  id: string;
  user_id: string;
  nickname: string | null;
  background: string | null;
  avatar_url: string | null;
  bf_openness: number | null;
  bf_conscientiousness: number | null;
  bf_extraversion: number | null;
  bf_agreeableness: number | null;
  bf_neuroticism: number | null;
}

interface IntimacyRecord {
  companion_id: string;
  user_id: string;
  score: number;
  milestone_stage: number;
}

interface EnergyAccount {
  id: string;
  balance: number;
}

interface EnergyTransaction {
  id: string;
  txn_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

interface MoodRecord {
  id: string;
  companion_id: string;
  pleasure: number | null;
  arousal: number | null;
  dominance: number | null;
  occ_label: string | null;
  intensity: number;
  created_at: string;
  emotion_label?: string | null;
}

// Emotion label → numeric value mapping for mood chart
const EMOTION_VALUES: Record<string, number> = {
  '开心': 85, '愉悦': 80, '高兴': 82, '快乐': 83, '兴奋': 90, '狂喜': 95,
  '温柔': 72, '温暖': 70, '安心': 68, '舒适': 65, '安宁': 62,
  '好奇': 67, '期待': 70, '感兴趣': 68,
  '感动': 78, '欣慰': 75, '感激': 76,
  '平静': 60, '淡定': 58, '放松': 62,
  '焦虑': 35, '担心': 32, '紧张': 30,
  '难过': 25, '伤心': 22, '失落': 28, '沮丧': 20,
  '生气': 18, '愤怒': 15, '烦躁': 22,
  '疲惫': 35, '累': 38, '困倦': 40,
  '害羞': 55, '尴尬': 45, '腼腆': 52,
  '惊讶': 65, '意外': 63,
};

function emotionToValue(label: string | null | undefined): number {
  if (!label) return 60;
  return EMOTION_VALUES[label] ?? 60;
}

interface MilestoneDefinition {
  id: number;
  name: string;
  description: string;
  min_score: number;
  max_score: number;
  unlocked_features: string[] | null;
}

interface StmMessage {
  id: string;
  companion_id: string;
  user_id: string;
  speaker: string;
  content: string;
  emotion_label: string | null;
  created_at: string;
}

interface LtmMemory {
  id: string;
  companion_id: string;
  memory_type: string;
  source_stm_ids: string[] | null;
  created_at: string;
}

interface AnteriorMemory {
  id: string;
  companion_id: string;
  content: string;
  trigger_type: string;
  priority: number;
  status: string;
  planned_at: string;
  created_at: string;
}

/* ─── Animation Variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

/* ─── Skeleton Loader ─── */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card-gradient rounded-2xl border border-pink-100 p-7 shadow-md animate-pulse', className)}>
      <div className="h-5 bg-pink-100 rounded w-1/3 mb-4" />
      <div className="h-4 bg-pink-50 rounded w-2/3 mb-3" />
      <div className="h-32 bg-pink-50/50 rounded-xl" />
    </div>
  );
}

function SkeletonEnergy() {
  return (
    <div className="card-gradient rounded-2xl border border-pink-100 p-6 shadow-md animate-pulse">
      <div className="h-5 bg-pink-100 rounded w-1/3 mb-4" />
      <div className="h-10 bg-pink-100 rounded w-1/2 mb-2" />
      <div className="h-4 bg-pink-50 rounded w-2/3 mb-4" />
      <div className="h-2 bg-pink-50 rounded-full mb-3" />
      <div className="h-8 bg-pink-100 rounded-xl w-24" />
    </div>
  );
}

/* ─── Error State ─── */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <AlertCircle size={48} className="text-pink-300 mb-4" />
      <p className="text-[15px] text-[#6B5B6E] font-body mb-4 text-center">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl accent-gradient text-white text-[13px] font-body font-semibold hover:brightness-110 transition-all duration-150"
      >
        <RefreshCw size={14} />
        重试
      </button>
    </div>
  );
}

/* ─── Login Prompt ─── */
function LoginPrompt() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <LogIn size={48} className="text-pink-300 mb-4" />
      <p className="text-[18px] text-[#2D1B2E] font-body font-semibold mb-2">{t('common.pleaseLogin')}</p>
      <p className="text-[13px] text-[#A093A5] font-body mb-6 text-center">
        登录后可以查看你的伴侣数据、好感度、电量等信息
      </p>
      <button
        onClick={() => navigate('/auth')}
        className="flex items-center gap-2 px-6 py-3 rounded-xl accent-gradient text-white text-[14px] font-body font-semibold hover:brightness-110 transition-all duration-150"
      >
        <LogIn size={16} />
        去登录
      </button>
    </div>
  );
}

/* ─── Empty Companion State ─── */
function EmptyCompanionState() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Sparkles size={48} className="text-pink-300 mb-4" />
      <p className="text-[18px] text-[#2D1B2E] font-body font-semibold mb-2">{t('dashboard.noCompanion')}</p>
      <p className="text-[13px] text-[#A093A5] font-body mb-6 text-center">
        {t('dashboard.noCompanionDesc')}
      </p>
      <button
        onClick={() => navigate('/customize')}
        className="flex items-center gap-2 px-6 py-3 rounded-xl accent-gradient text-white text-[14px] font-body font-semibold hover:brightness-110 transition-all duration-150"
      >
        <Sparkles size={16} />
        创建伴侣
      </button>
    </div>
  );
}

/* ─── Big Five Radar Chart ─── */
function BigFiveRadar({ companion, isLoading }: { companion?: Companion | null; isLoading: boolean }) {
  const [hoveredTrait, setHoveredTrait] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  const traitData: TraitData[] = useMemo(() => {
    if (companion) {
      return [
        { name: '开放性', nameEn: 'Openness', value: companion.bf_openness ?? 50, description: '富有想象力，喜欢尝试新事物' },
        { name: '尽责性', nameEn: 'Conscientiousness', value: companion.bf_conscientiousness ?? 50, description: '自律、有条理、追求成就' },
        { name: '外向性', nameEn: 'Extraversion', value: companion.bf_extraversion ?? 50, description: '社交活跃，精力充沛' },
        { name: '宜人性', nameEn: 'Agreeableness', value: companion.bf_agreeableness ?? 50, description: '友善、合作、富有同情心' },
        { name: '神经质', nameEn: 'Neuroticism', value: companion.bf_neuroticism ?? 50, description: '情绪稳定，抗压能力强' },
      ];
    }
    return [
      { name: '开放性', nameEn: 'Openness', value: 50, description: '富有想象力，喜欢尝试新事物' },
      { name: '尽责性', nameEn: 'Conscientiousness', value: 50, description: '自律、有条理、追求成就' },
      { name: '外向性', nameEn: 'Extraversion', value: 50, description: '社交活跃，精力充沛' },
      { name: '宜人性', nameEn: 'Agreeableness', value: 50, description: '友善、合作、富有同情心' },
      { name: '神经质', nameEn: 'Neuroticism', value: 50, description: '情绪稳定，抗压能力强' },
    ];
  }, [companion]);

  const companionName = companion?.nickname || '伴侣';
  const avatarUrl = companion?.avatar_url || '/default-avatar.jpg';

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const size = 300;
  const center = size / 2;
  const radius = 110;
  const levels = 5;

  const getPoint = useCallback((index: number, value: number, maxVal: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    const r = (value / maxVal) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  }, [center, radius]);

  const gridPolygons = useMemo(() => {
    const polygons: string[] = [];
    for (let level = 1; level <= levels; level++) {
      const points: string[] = [];
      for (let i = 0; i < 5; i++) {
        const p = getPoint(i, level * 20, 100);
        points.push(`${p.x},${p.y}`);
      }
      polygons.push(points.join(' '));
    }
    return polygons;
  }, [getPoint]);

  const dataPoints = traitData.map((trait, i) =>
    getPoint(i, animated ? trait.value : 0, 100)
  );

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const labelPositions = traitData.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const labelRadius = radius + 32;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  });

  const scorePositions = traitData.map((trait, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const scoreRadius = ((animated ? trait.value : 0) / 100) * radius + 16;
    return {
      x: center + scoreRadius * Math.cos(angle),
      y: center + scoreRadius * Math.sin(angle),
    };
  });

  if (isLoading) return <SkeletonCard />;

  return (
    <motion.div
      className="card-gradient rounded-2xl border border-pink-100 p-7 shadow-md"
      variants={cardVariants}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-pink-400" />
          <h3 className="font-body text-[22px] font-bold text-[#2D1B2E]">人格画像</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-pink-500 font-body">{companionName}</span>
          <img src={avatarUrl} alt={companionName} className="w-6 h-6 rounded-full object-cover" />
        </div>
      </div>
      <p className="text-[12px] text-[#A093A5] font-body mb-5">基于 Big Five 人格模型</p>

      {/* Radar Chart */}
      <div className="flex justify-center relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Grid pentagons */}
          {gridPolygons.map((points, idx) => (
            <motion.polygon
              key={idx}
              points={points}
              fill="none"
              stroke="#FFE4EC"
              strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            />
          ))}
          {/* Axis lines */}
          {traitData.map((_, i) => {
            const end = getPoint(i, 100, 100);
            return (
              <motion.line
                key={i}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="#FFE4EC"
                strokeWidth={1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />
            );
          })}
          {/* Data polygon */}
          <motion.polygon
            points={dataPolygon}
            fill="rgba(255,182,193,0.25)"
            stroke="#FF69B4"
            strokeWidth={2.5}
            strokeLinejoin="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: animated ? 1 : 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
          />
          {/* Data points */}
          {dataPoints.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={6}
              fill="#FF69B4"
              stroke="white"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: animated ? 1 : 0 }}
              transition={{
                duration: 0.3,
                delay: 0.8 + i * 0.1,
                ease: [0.68, -0.3, 0.32, 1.3] as [number, number, number, number],
              }}
              onMouseEnter={() => setHoveredTrait(i)}
              onMouseLeave={() => setHoveredTrait(null)}
              className="cursor-pointer"
            />
          ))}
          {/* Center dot */}
          <circle cx={center} cy={center} r={3} fill="#FF9EB5" />
          {/* Labels */}
          {traitData.map((trait, i) => (
            <text
              key={i}
              x={labelPositions[i].x}
              y={labelPositions[i].y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[12px] font-body fill-[#6B5B6E]"
            >
              {trait.name}
            </text>
          ))}
          {/* Score numbers */}
          {traitData.map((trait, i) => (
            <motion.text
              key={`score-${i}`}
              x={scorePositions[i].x}
              y={scorePositions[i].y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[13px] font-number font-semibold fill-[#E850A0]"
              initial={{ opacity: 0 }}
              animate={{ opacity: animated ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 1 + i * 0.08 }}
            >
              {animated ? trait.value : 0}
            </motion.text>
          ))}
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredTrait !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 pointer-events-none z-10 border border-pink-100"
            >
              <p className="text-sm font-body font-semibold text-[#2D1B2E]">
                {traitData[hoveredTrait].name} ({traitData[hoveredTrait].nameEn})
              </p>
              <p className="text-xs text-[#E850A0] font-number font-semibold mt-0.5">
                {traitData[hoveredTrait].value}/100
              </p>
              <p className="text-xs text-[#6B5B6E] font-body mt-1">
                {traitData[hoveredTrait].description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-4">
        {traitData.map((trait, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-pink-200 to-pink-400" />
            <span className="text-[12px] text-[#6B5B6E] font-body">{trait.name}</span>
          </div>
        ))}
      </div>

      {/* Personality Summary */}
      <div className="mt-4 pl-3 border-l-[3px] border-[#E8A0BF]">
        <p className="text-[13px] text-[#6B5B6E] font-body italic leading-relaxed">
          {companionName}是一位{getPersonalitySummary(traitData)}的伴侣。
        </p>
      </div>
    </motion.div>
  );
}

function getPersonalitySummary(traits: TraitData[]): string {
  const highTraits = traits.filter(t => t.value >= 60);
  if (highTraits.length === 0) return '性格温和，充满魅力';
  const names = highTraits.map(t => t.name);
  const map: Record<string, string> = {
    '开放性': '富有想象力',
    '尽责性': '自律认真',
    '外向性': '开朗外向',
    '宜人性': '友善体贴',
    '神经质': '情绪细腻',
  };
  return names.map(n => map[n] || n).join('、');
}

/* ─── Milestone Progress Card ─── */
function MilestoneProgress({ intimacy, stages, isLoading }: { intimacy?: IntimacyRecord | null; stages: Stage[]; isLoading: boolean }) {
  const [animated, setAnimated] = useState(false);
  const { t } = useI18n();

  const currentStageNum = intimacy?.milestone_stage ?? 0;
  const currentProgress = Math.min(intimacy?.score ?? 0, 100);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const currentStage = stages.find((s) => s.num === currentStageNum) || stages[0];

  if (isLoading) return <SkeletonCard className="flex flex-col" />;

  return (
    <motion.div
      className="card-gradient rounded-2xl border border-pink-100 p-7 shadow-md flex flex-col"
      variants={cardVariants}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-[#E8A0BF]" />
          <h3 className="font-body text-[22px] font-bold text-[#2D1B2E]">{t('dashboard.milestones')}</h3>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D4A574] text-[12px] font-body font-semibold">
          {t('dashboard.stage')} {currentStageNum}/{stages.length}
        </span>
      </div>

      {/* Current Stage */}
      <div className="mb-4">
        <h2 className="font-body text-[28px] font-bold text-[#2D1B2E]">{currentStage?.name || '未知'}</h2>
        <p className="text-[13px] text-[#A093A5] font-body italic">{currentStage?.nameEn || ''}</p>
        <p className="text-[13px] text-[#6B5B6E] font-body mt-2 leading-relaxed">
          {currentStage?.description || '开始你们的旅程吧'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <p className="text-[13px] text-[#6B5B6E] font-body mb-2">
          {currentProgress}% — 距离下一阶段还需 {Math.max(0, 100 - currentProgress)} 点好感度
        </p>
        <div className="h-3 bg-pink-50 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full accent-gradient"
            initial={{ width: 0 }}
            animate={{ width: animated ? `${currentProgress}%` : 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number], delay: 0.3 }}
          />
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="relative flex-1">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-pink-100" />

        <div className="flex flex-col gap-3">
          {stages.map((stage, i) => {
            const isCompleted = stage.num < currentStageNum;
            const isCurrent = stage.num === currentStageNum;
            const isFuture = stage.num > currentStageNum;

            return (
              <motion.div
                key={stage.num}
                className="flex items-center gap-3 relative z-10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: 0.6 + i * 0.08,
                  ease: [0.68, -0.3, 0.32, 1.3] as [number, number, number, number],
                }}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-number',
                    isCompleted && 'bg-[#D4A574] text-white',
                    isCurrent && 'bg-pink-400 text-white relative',
                    isFuture && 'bg-pink-100 text-[#A093A5]'
                  )}
                >
                  {isCompleted ? (
                    <Check size={14} />
                  ) : (
                    stage.num
                  )}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full animate-ring-pulse bg-pink-400/30" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[13px] font-body',
                    isCompleted && 'text-[#D4A574] font-medium',
                    isCurrent && 'text-pink-500 font-semibold',
                    isFuture && 'text-[#A093A5]'
                  )}
                >
                  {stage.name}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent Milestone */}
      <div className="mt-4 pt-3 border-t border-pink-50 flex items-center gap-1.5">
        <Star size={14} className="text-[#D4A574]" />
        <span className="text-[12px] font-body text-[#D4A574] font-semibold">
          {t('dashboard.currentStage')}：{currentStage?.name || '未开始'}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Energy Balance Card ─── */
function EnergyCard({ energy, transactions, isLoading }: { energy?: number; transactions: EnergyTransaction[]; isLoading: boolean }) {
  const [count, setCount] = useState(0);
  const [animated, setAnimated] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  const target = energy ?? 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!animated) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.floor(eased * target);
      setCount(start);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [animated, target]);

  if (isLoading) return <SkeletonEnergy />;

  return (
    <motion.div
      className="card-gradient rounded-2xl border border-pink-100 p-6 shadow-md"
      variants={cardVariants}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[#D4A574]" />
          <h3 className="font-body text-[22px] font-bold text-[#2D1B2E]">{t('dashboard.energy')}</h3>
        </div>
        <div className="group relative">
          <div className="w-5 h-5 rounded-full border border-pink-200 flex items-center justify-center cursor-help">
            <span className="text-[11px] text-[#A093A5]">?</span>
          </div>
          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-lg border border-pink-100 p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
            <p className="text-[12px] text-[#6B5B6E] font-body">{t('dashboard.energyTooltip')}</p>
          </div>
        </div>
      </div>

      {/* Balance Display */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[42px] font-number font-bold text-[#2D1B2E] leading-none tracking-tight">
          {count.toLocaleString()}
        </span>
        <Zap size={24} className="text-[#D4A574]" />
      </div>
      <p className="text-[13px] text-[#A093A5] font-body mb-4">{t('dashboard.energyRemaining')}</p>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-[12px] text-[#A093A5] font-body">{t('dashboard.recentTx')}</p>
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-pink-50 last:border-b-0">
              <span className="text-[12px] text-[#6B5B6E] font-body truncate flex-1">{tx.description || tx.txn_type}</span>
              <span className={cn(
                'text-[12px] font-number font-semibold ml-2',
                tx.amount < 0 ? 'text-red-400' : 'text-green-500'
              )}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recharge Button */}
      <motion.button
        onClick={() => navigate('/payment')}
        className="mt-2 px-5 py-2 rounded-xl accent-gradient text-white text-[13px] font-body font-semibold hover:brightness-110 transition-all duration-150"
        initial={{ opacity: 0 }}
        animate={{ opacity: animated ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 1.5 }}
      >
        {t('dashboard.rechargeNow')}
      </motion.button>
    </motion.div>
  );
}

/* ─── Mood Sparkline ─── */
function MoodSparkline({
  mood,
  messages,
  isLoading,
}: {
  mood?: MoodRecord | null;
  messages: StmMessage[];
  isLoading: boolean;
}) {
  const [animated, setAnimated] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 700);
    return () => clearTimeout(timer);
  }, []);

  // Build real emotion data from stm_messages.emotion_label
  const { dataPoints, currentMoodLabel } = useMemo(() => {
    // Filter companion messages with emotion labels in last 24h
    const now = Date.now();
    const oneDay = 86400000;
    const companionMsgs = messages
      .filter(
        (m) =>
          m.speaker === 'companion' &&
          m.emotion_label &&
          now - new Date(m.created_at).getTime() < oneDay
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );

    if (companionMsgs.length === 0) {
      // Fallback: use mood record intensity if available
      if (mood?.intensity) {
        const base = mood.intensity;
        const pts: { x: number; y: number; label: string; time: string }[] =
          [];
        for (let i = 0; i <= 6; i++) {
          const hour = i * 4;
          pts.push({
            x: hour / 24,
            y: base,
            label: mood.occ_label || '平静',
            time: `${String(hour).padStart(2, '0')}:00`,
          });
        }
        return {
          dataPoints: pts,
          currentMoodLabel: mood.occ_label || '平静',
        };
      }
      // No data at all
      return {
        dataPoints: [
          { x: 0, y: 60, label: '平静', time: '00:00' },
          { x: 1, y: 60, label: '平静', time: '24:00' },
        ],
        currentMoodLabel: '平静',
      };
    }

    // Map messages to chart points (normalized x = hour/24)
    const pts = companionMsgs.map((m) => {
      const d = new Date(m.created_at);
      const hour = d.getHours() + d.getMinutes() / 60;
      return {
        x: hour / 24,
        y: emotionToValue(m.emotion_label),
        label: m.emotion_label!,
        time: `${String(d.getHours()).padStart(2, '0')}:${String(
          d.getMinutes()
        ).padStart(2, '0')}`,
      };
    });

    return {
      dataPoints: pts,
      currentMoodLabel: pts[pts.length - 1]?.label || '平静',
    };
  }, [messages, mood]);

  const moodLabels = ['悲伤', '平静', '开心', '兴奋', '狂喜'];
  const timeLabels = ['00:00', '06:00', '12:00', '18:00', '24:00'];

  const width = 340;
  const height = 140;
  const padding = { left: 40, right: 10, top: 10, bottom: 24 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Convert normalized points to SVG coordinates
  const points = dataPoints.map((p) => ({
    x: padding.left + p.x * chartWidth,
    y: padding.top + chartHeight - (p.y / 100) * chartHeight,
    label: p.label,
    time: p.time,
  }));

  // Smooth curve using cubic bezier
  const linePath =
    points.length > 0
      ? points.reduce((path, p, i) => {
          if (i === 0) return `M ${p.x} ${p.y}`;
          const prev = points[i - 1];
          const cpx1 = prev.x + (p.x - prev.x) / 3;
          const cpx2 = prev.x + (2 * (p.x - prev.x)) / 3;
          return `${path} C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`;
        }, '')
      : '';

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${
          padding.top + chartHeight
        } L ${padding.left} ${padding.top + chartHeight} Z`
      : '';

  const currentHour = new Date().getHours();

  if (isLoading) return <SkeletonCard />;

  return (
    <motion.div
      className="card-gradient rounded-2xl border border-pink-100 p-6 shadow-md"
      variants={cardVariants}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-pink-400" />
          <h3 className="font-body text-[22px] font-bold text-[#2D1B2E]">情绪波动</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[13px] text-[#6B5B6E] font-body">{currentMoodLabel}</span>
        </div>
      </div>

      {/* Sparkline */}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={padding.top + chartHeight * t}
            x2={width - padding.right}
            y2={padding.top + chartHeight * t}
            stroke="#FFF5F7"
            strokeWidth={1}
          />
        ))}
        {/* Y-axis labels */}
        {moodLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 6}
            y={padding.top + chartHeight * (1 - i / 4) + 4}
            textAnchor="end"
            className="text-[10px] font-body fill-[#A093A5]"
          >
            {label}
          </text>
        ))}
        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="rgba(255,182,193,0.2)"
          initial={{ opacity: 0 }}
          animate={{ opacity: animated ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 1.5 }}
        />
        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#FF69B4"
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: animated ? 1 : 0 }}
          transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
        />
        {/* Data points */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#FF69B4"
            initial={{ scale: 0 }}
            animate={{ scale: animated ? 1 : 0 }}
            transition={{ duration: 0.2, delay: 1.2 + i * 0.03 }}
          />
        ))}
        {/* Current time marker */}
        {(() => {
          const cx = padding.left + (currentHour / 23) * chartWidth;
          return (
            <motion.line
              x1={cx}
              y1={padding.top}
              x2={cx}
              y2={padding.top + chartHeight}
              stroke="#E8A0BF"
              strokeWidth={1}
              strokeDasharray="4 2"
              initial={{ opacity: 0 }}
              animate={{ opacity: animated ? 1 : 0 }}
              transition={{ duration: 0.3, delay: 1.8 }}
            />
          );
        })()}
        {/* X-axis labels */}
        {timeLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left + (i / 4) * chartWidth}
            y={height - 4}
            textAnchor="middle"
            className="text-[10px] font-body fill-[#A093A5]"
          >
            {label}
          </text>
        ))}
      </svg>

      {/* Mood Summary */}
      <div className="mt-3 flex items-center justify-between text-[12px] font-body text-[#6B5B6E]">
        <span>{t('dashboard.moodNow')}：{currentMoodLabel}</span>
        <div className="flex gap-3">
          <span className="text-[#A093A5]">强度：{mood?.intensity || 50}/100</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Quick Action Buttons ─── */
function QuickActions({ currentStageNum, isLoading }: { currentStageNum?: number; isLoading: boolean }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const stage = currentStageNum ?? 0;
  const showAdvancedDrama = stage >= 3;

  const actions = [
    {
      label: '开始对话',
      icon: <MessageCircle size={28} />,
      desc: '与你的伴侣开始一段温暖对话',
      gradient: true,
      onClick: () => navigate('/chat'),
    },
    {
      label: t('dashboard.goPlaza'),
      icon: <Users size={28} />,
      desc: '发现更多有趣的灵魂伴侣',
      gradient: false,
      onClick: () => navigate('/plaza'),
    },
    {
      label: '甜蜜记忆',
      icon: <Heart size={28} />,
      desc: '回顾你们的美好回忆',
      gradient: false,
      onClick: () => navigate('/memory'),
    },
    ...(showAdvancedDrama
      ? [
          {
            label: '高级剧情',
            icon: <BookOpen size={28} />,
            desc: '解锁专属的深度剧情体验',
            gradient: false,
            onClick: () => navigate('/drama'),
          },
        ]
      : []),
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-5">
        <div className="h-24 bg-pink-50 rounded-2xl animate-pulse" />
        <div className="h-24 bg-pink-50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-5"
      variants={cardVariants}
    >
      {actions.map((action, i) => (
        <motion.button
          key={action.label}
          onClick={action.onClick}
          className={cn(
            'flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-200 group',
            action.gradient
              ? 'accent-gradient text-white border-transparent shadow-md hover:shadow-glow hover:brightness-110'
              : 'card-gradient border-pink-100 shadow-md hover:shadow-lg hover:-translate-y-0.5'
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.8 + i * 0.1,
            ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
          }}
        >
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
              action.gradient
                ? 'bg-white/20 text-white'
                : 'bg-pink-50 text-pink-400'
            )}
          >
            {action.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'text-[18px] font-body font-semibold mb-0.5',
                action.gradient ? 'text-white' : 'text-[#2D1B2E]'
              )}
            >
              {action.label}
            </h4>
            <p
              className={cn(
                'text-[13px] font-body leading-relaxed',
                action.gradient ? 'text-white/80' : 'text-[#6B5B6E]'
              )}
            >
              {action.desc}
            </p>
          </div>
          <ChevronRight
            size={24}
            className={cn(
              'shrink-0 transition-transform duration-200 group-hover:translate-x-1',
              action.gradient ? 'text-white' : 'text-pink-400'
            )}
          />
        </motion.button>
      ))}
    </motion.div>
  );
}

/* ─── Preview Panel ─── */
function PreviewPanel({ companion }: { companion?: Companion | null }) {
  const [currentTime, setCurrentTime] = useState('');
  const { t } = useI18n();
  const companionName = companion?.nickname || '伴侣';
  const avatarUrl = companion?.avatar_url || '/companion-1.jpg';

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="w-[375px] min-h-[100dvh] bg-pink-50 border-l border-pink-100 p-5 flex flex-col gap-4 overflow-y-auto"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
    >
      {/* Live2D Preview */}
      <motion.div
        className="flex-1 min-h-0"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="w-full h-full min-h-[420px] rounded-[32px] border-[10px] border-[#1A1025] bg-white shadow-lg overflow-hidden relative flex flex-col">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-2 text-[11px] text-[#A093A5] font-body">
            <span>{currentTime}</span>
            <div className="flex items-center gap-1">
              <Battery size={14} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative breathing-gradient flex flex-col items-center justify-center p-4">
            {/* Floating sparkles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-pink-300"
                  style={{
                    left: `${20 + i * 20}%`,
                    top: `${15 + (i % 2) * 30}%`,
                  }}
                  animate={{
                    y: [0, -15, 0],
                    x: [0, 8, -4, 0],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 4 + i,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            {/* Avatar */}
            <motion.div
              className="relative mb-4"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src={avatarUrl}
                alt={companionName}
                className="w-40 h-40 object-cover rounded-2xl shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-white" />
            </motion.div>

            {/* Name */}
            <div className="flex items-center gap-1.5 mb-1">
              <h4 className="font-body text-[18px] font-semibold text-[#2D1B2E]">{companionName}</h4>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Heart size={14} className="text-pink-400 fill-pink-400" />
              </motion.div>
            </div>
            <p className="text-[12px] text-[#A093A5] font-body">{t('common.online')}</p>

            {/* Placeholder text */}
            <div className="mt-4 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl">
              <p className="text-[11px] text-[#6B5B6E] font-body text-center">{t('dashboard.comingsoon')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pet Preview */}
      <motion.div
        className="h-[280px] shrink-0"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <div className="w-full h-full rounded-[32px] border-[10px] border-[#1A1025] bg-white shadow-lg overflow-hidden relative flex flex-col">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-2 text-[11px] text-[#A093A5] font-body">
            <span>{currentTime}</span>
            <div className="flex items-center gap-1">
              <Battery size={14} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-gradient-to-br from-orange-50 to-pink-50 flex flex-col items-center justify-center p-4 relative">
            {/* Pet placeholder */}
            <motion.div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center mb-3 relative"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PawPrint size={40} className="text-white" />
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-white"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <h4 className="font-body text-[18px] font-semibold text-[#2D1B2E] mb-3">小咪</h4>

            {/* Status bars */}
            <div className="w-full max-w-[200px] space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-body w-6">饱食</span>
                <div className="flex-1 h-1 bg-white/60 rounded-full overflow-hidden">
                  <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-orange-300 to-orange-400" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-body w-6">精力</span>
                <div className="flex-1 h-1 bg-white/60 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-pink-300 to-pink-400" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-body w-6">心情</span>
                <div className="flex-1 h-1 bg-white/60 rounded-full overflow-hidden">
                  <div className="h-full w-[90%] rounded-full bg-gradient-to-r from-green-300 to-green-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Dashboard Page ─── */
export default function Dashboard() {
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [intimacy, setIntimacy] = useState<IntimacyRecord | null>(null);
  const [energy, setEnergy] = useState<number>(0);
  const [mood, setMood] = useState<MoodRecord | null>(null);
  const [transactions, setTransactions] = useState<EnergyTransaction[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [recentMessages, setRecentMessages] = useState<StmMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompanion, setHasCompanion] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // 1. Get companion
      const { data: comp, error: compError } = await supabase
        .from('companions')
        .select('id, user_id, nickname, background, avatar_url, bf_openness, bf_conscientiousness, bf_extraversion, bf_agreeableness, bf_neuroticism')
        .eq('user_id', user.id)
        .single();

      if (compError || !comp) {
        setHasCompanion(false);
        setIsLoading(false);
        return;
      }

      setCompanion(comp as Companion);
      setHasCompanion(true);

      // 2. Load all data in parallel
      const companionId = comp.id;
      const [intimacyRes, energyRes, moodRes, txRes, stagesRes, messagesRes, ltmRes, anteriorRes] = await Promise.all([
        // Intimacy (use maybeSingle to avoid error when no record)
        supabase
          .from('intimacy_records')
          .select('*')
          .eq('companion_id', companionId)
          .maybeSingle(),
        // Energy (linked via user_id)
        supabase
          .from('energy_accounts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        // Latest mood (last 24h)
        supabase
          .from('stm_messages')
          .select('emotion_label, created_at')
          .eq('companion_id', companionId)
          .eq('speaker', 'companion')
          .not('emotion_label', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1),
        // Energy transactions (linked via user_id)
        supabase
          .from('energy_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        // Milestone definitions (ordered by id, which is the stage number)
        supabase
          .from('milestone_definitions')
          .select('*')
          .order('id', { ascending: true }),
        // Recent STM messages
        supabase
          .from('stm_messages')
          .select('id, speaker, content, emotion_label, created_at')
          .eq('companion_id', companionId)
          .order('created_at', { ascending: false })
          .limit(50),
        // LTM memories count
        supabase
          .from('ltm_memories')
          .select('*', { count: 'exact', head: true })
          .eq('companion_id', companionId),
        // Anterior memories (pending, sorted by priority)
        supabase
          .from('anterior_memories')
          .select('*')
          .eq('companion_id', companionId)
          .eq('status', 'pending')
          .order('priority', { ascending: false })
          .limit(5),
      ]);

      if (intimacyRes.data) setIntimacy(intimacyRes.data as IntimacyRecord);
      if (energyRes.data) setEnergy((energyRes.data as EnergyAccount).balance);
      // moodRes.data is stm_messages array with emotion_label
      if (moodRes.data && Array.isArray(moodRes.data) && moodRes.data.length > 0) {
        const msg = moodRes.data[0];
        setMood({
          id: '', companion_id: companionId, pleasure: null, arousal: null, dominance: null,
          occ_label: msg.emotion_label || '平静', intensity: 50,
          created_at: msg.created_at || new Date().toISOString(),
        } as MoodRecord);
      } else {
        setMood(null);
      }
      if (txRes.data) setTransactions(txRes.data as EnergyTransaction[]);

      // Save recent messages for emotion chart
      if (messagesRes.data) {
        setRecentMessages(messagesRes.data as StmMessage[]);
      }
      if (ltmRes.count) {
        console.log('[Dashboard] LTM memories count:', ltmRes.count);
      }
      if (anteriorRes.data) {
        console.log('[Dashboard] Pending anterior memories:', (anteriorRes.data as AnteriorMemory[]).length);
      }

      if (stagesRes.data) {
        setStages((stagesRes.data as MilestoneDefinition[]).map(s => ({
          num: s.id,
          name: s.name,
          nameEn: s.name,
          description: s.description,
        })));
      } else {
        setStages([]);
      }
    } catch (e: any) {
      console.error('Dashboard load error:', e);
      setError(e?.message || '加载数据失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }

  // Determine what to show
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="flex min-h-[100dvh]">
        <div className="flex-1 p-6 overflow-y-auto">
          <LoginPrompt />
        </div>
        <div className="hidden xl:flex">
          <PreviewPanel companion={null} />
        </div>
      </div>
    );
  }

  if (isAuthenticated && !hasCompanion && !isLoading) {
    return (
      <div className="flex min-h-[100dvh]">
        <div className="flex-1 p-6 overflow-y-auto">
          <EmptyCompanionState />
        </div>
        <div className="hidden xl:flex">
          <PreviewPanel companion={null} />
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="flex min-h-[100dvh]">
        <div className="flex-1 p-6 overflow-y-auto">
          <ErrorState message={error} onRetry={loadDashboardData} />
        </div>
        <div className="hidden xl:flex">
          <PreviewPanel companion={companion || null} />
        </div>
      </div>
    );
  }

  const currentStageNum = intimacy?.milestone_stage ?? 0;

  return (
    <div className="flex min-h-[100dvh]">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-[900px] mx-auto space-y-5"
        >
          {/* Top Bar */}
          <motion.div
            className="flex items-center justify-between h-14"
            variants={cardVariants}
          >
            <motion.h2
              className="font-body text-[28px] font-bold text-[#2D1B2E]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {t('dashboard.consoleTitle')}
            </motion.h2>
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <button className="relative p-2 rounded-xl hover:bg-pink-100 transition-colors duration-150">
                <Bell size={20} className="text-[#6B5B6E]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-pink-100 transition-colors duration-150">
                <img
                  src="/default-avatar.jpg"
                  alt="User"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <ChevronDown size={16} className="text-[#A093A5]" />
              </button>
            </motion.div>
          </motion.div>

          {/* Grid: 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left column */}
            <div className="space-y-5">
              <BigFiveRadar companion={companion} isLoading={isLoading} />
              <EnergyCard energy={energy} transactions={transactions} isLoading={isLoading} />
            </div>

            {/* Right column */}
            <div className="space-y-5">
              <MilestoneProgress intimacy={intimacy} stages={stages} isLoading={isLoading} />
              <MoodSparkline mood={mood} messages={recentMessages} isLoading={isLoading} />
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActions currentStageNum={currentStageNum} isLoading={isLoading} />

          {/* Bottom spacing */}
          <div className="h-4" />
        </motion.div>
      </div>

      {/* Preview Panel - Desktop only */}
      <div className="hidden xl:flex">
        <PreviewPanel companion={companion} />
      </div>
    </div>
  );
}
