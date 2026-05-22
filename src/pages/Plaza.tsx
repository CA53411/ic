import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  Heart,
  MessageCircle,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Users,
  LogIn,
  UserPlus,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase, getStorageUrl } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/* ─── Types ─── */
interface PlazaCompanion {
  id: string | number;
  nickname: string;
  avatar: string;
  storageAvatar: string;
  description: string;
  tags: string[];
  likes: string;
  chats: string;
  personalityType: string;
  gender: 'female' | 'male';
  bigFive: { trait: string; value: number }[];
  quote: string;
}

/* ─── Mock Data (fallback) ─── */
const mockCompanions: PlazaCompanion[] = [
  {
    id: 1,
    nickname: '小樱',
    avatar: '/companion-1.jpg',
    storageAvatar: getStorageUrl('companions/1.jpg'),
    description: '开朗活泼的邻家女孩，喜欢樱花和甜点，总能带给你阳光般的笑容。',
    tags: ['开朗', '甜食控', '户外'],
    likes: '12.5k',
    chats: '8.2k',
    personalityType: '活泼型',
    gender: 'female',
    bigFive: [
      { trait: '开放性', value: 85 },
      { trait: '尽责性', value: 60 },
      { trait: '外向性', value: 90 },
      { trait: '宜人性', value: 88 },
      { trait: '神经质', value: 35 },
    ],
    quote: '今天也要元气满满哦！',
  },
  {
    id: 2,
    nickname: '凌霜',
    avatar: '/companion-2.jpg',
    storageAvatar: getStorageUrl('companions/2.jpg'),
    description: '冷静理性的职场精英，热爱文学与哲学，适合深度对话与心灵交流。',
    tags: ['知性', '冷静', '文学'],
    likes: '9.8k',
    chats: '6.5k',
    personalityType: '知性型',
    gender: 'female',
    bigFive: [
      { trait: '开放性', value: 80 },
      { trait: '尽责性', value: 95 },
      { trait: '外向性', value: 40 },
      { trait: '宜人性', value: 60 },
      { trait: '神经质', value: 25 },
    ],
    quote: '书中自有黄金屋，话语间自有真情在。',
  },
  {
    id: 3,
    nickname: '银月',
    avatar: '/companion-3.jpg',
    storageAvatar: getStorageUrl('companions/3.jpg'),
    description: '害羞内敛的图书管理员，拥有丰富的知识和温柔无比的内心。',
    tags: ['害羞', '知性', '温柔'],
    likes: '8.3k',
    chats: '7.1k',
    personalityType: '温柔型',
    gender: 'female',
    bigFive: [
      { trait: '开放性', value: 75 },
      { trait: '尽责性', value: 85 },
      { trait: '外向性', value: 25 },
      { trait: '宜人性', value: 95 },
      { trait: '神经质', value: 45 },
    ],
    quote: '在书海中，我找到了与你对话的方式。',
  },
  {
    id: 4,
    nickname: '炎夏',
    avatar: '/companion-4.jpg',
    storageAvatar: getStorageUrl('companions/4.jpg'),
    description: '元气满满的运动少女，活力四射，和她在一起永远不会无聊。',
    tags: ['活泼', '运动', '直率'],
    likes: '11.2k',
    chats: '9.3k',
    personalityType: '活泼型',
    gender: 'female',
    bigFive: [
      { trait: '开放性', value: 70 },
      { trait: '尽责性', value: 50 },
      { trait: '外向性', value: 95 },
      { trait: '宜人性', value: 75 },
      { trait: '神经质', value: 30 },
    ],
    quote: '走！一起去冒险吧！',
  },
  {
    id: 5,
    nickname: '紫鸢',
    avatar: '/companion-5.jpg',
    storageAvatar: getStorageUrl('companions/5.jpg'),
    description: '神秘优雅的古典美人，喜欢茶道与花艺，话少但每一句都有深意。',
    tags: ['神秘', '优雅', '艺术'],
    likes: '7.6k',
    chats: '5.4k',
    personalityType: '神秘型',
    gender: 'female',
    bigFive: [
      { trait: '开放性', value: 90 },
      { trait: '尽责性', value: 70 },
      { trait: '外向性', value: 35 },
      { trait: '宜人性', value: 65 },
      { trait: '神经质', value: 55 },
    ],
    quote: '静水流深，言语之外的意境更动人。',
  },
  {
    id: 6,
    nickname: '晴空',
    avatar: '/companion-6.jpg',
    storageAvatar: getStorageUrl('companions/6.jpg'),
    description: '天真烂漫的花店女孩，对世界充满好奇，像小太阳一样温暖每个人。',
    tags: ['天真', '温暖', '好奇'],
    likes: '10.1k',
    chats: '7.8k',
    personalityType: '温柔型',
    gender: 'female',
    bigFive: [
      { trait: '开放性', value: 88 },
      { trait: '尽责性', value: 65 },
      { trait: '外向性', value: 80 },
      { trait: '宜人性', value: 92 },
      { trait: '神经质', value: 20 },
    ],
    quote: '每一朵花都有它的语言，让我说给你听。',
  },
];

function getPersonalityTags(c: Record<string, unknown>): string[] {
  const tags: string[] = [];
  const agreeableness = (c.personality_agreeableness as number) || 0;
  const extraversion = (c.personality_extraversion as number) || 0;
  const openness = (c.personality_openness as number) || 0;
  const neuroticism = (c.personality_neuroticism as number) || 0;
  const conscientiousness = (c.personality_conscientiousness as number) || 0;

  if (agreeableness > 60) tags.push('温柔');
  if (extraversion > 60) tags.push('活泼');
  if (openness > 60) tags.push('知性');
  if (neuroticism > 60) tags.push('敏感');
  if (conscientiousness > 60) tags.push('认真');
  if (tags.length === 0) tags.push('均衡');
  return tags;
}

function getPersonalityType(c: Record<string, unknown>): string {
  const extraversion = (c.personality_extraversion as number) || 50;
  const openness = (c.personality_openness as number) || 50;
  const neuroticism = (c.personality_neuroticism as number) || 50;
  const agreeableness = (c.personality_agreeableness as number) || 50;

  if (neuroticism > 60 && openness > 60) return '神秘型';
  if (extraversion > 60 && openness > 60) return '知性型';
  if (extraversion > 60) return '活泼型';
  if (agreeableness > 60) return '温柔型';
  if (openness > 60) return '知性型';
  return '温柔型';
}

const filterTabs = ['全部', '温柔型', '活泼型', '知性型', '神秘型'];

/* ─── Animation Variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalPanelVariants = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.68, -0.3, 0.32, 1.3] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

/* ─── Companion Image Component ─── */
function CompanionImage({ companion, className }: { companion: PlazaCompanion; className?: string }) {
  const [src, setSrc] = useState(companion.storageAvatar);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(companion.storageAvatar);
    setFailed(false);
  }, [companion.storageAvatar]);

  const handleError = () => {
    if (!failed) {
      setSrc(companion.avatar);
      setFailed(true);
    }
  };

  return (
    <img
      src={src}
      alt={companion.nickname}
      className={className}
      onError={handleError}
    />
  );
}

/* ─── Companion Card ─── */
function CompanionCard({
  companion,
  index,
  onClick,
}: {
  companion: PlazaCompanion;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      key={companion.id}
      variants={cardVariants}
      custom={index}
      layout
      className="group card-gradient rounded-2xl border border-pink-100 shadow-md overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1.5"
      onClick={onClick}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image Area - Top 65% */}
      <div className="relative h-[220px] overflow-hidden">
        <CompanionImage
          companion={companion}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(26,16,37,0.7)] via-transparent to-transparent" />

        {/* Online indicator */}
        <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[rgba(26,16,37,0.55)] backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button className="px-5 py-2 rounded-full border border-white/80 text-white text-[13px] font-body font-medium hover:bg-white/20 transition-colors">
            查看详情
          </button>
          <p className="text-white/80 text-[12px] font-body italic mt-2 px-6 text-center leading-relaxed">
            &ldquo;{companion.quote}&rdquo;
          </p>
        </div>

        {/* Name overlay at bottom of image */}
        <div className="absolute bottom-3 left-4 right-4">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-[20px] font-body font-bold">{companion.nickname}</h3>
            <CheckCircle size={16} className="text-pink-400 fill-pink-400" />
          </div>
        </div>
      </div>

      {/* Content Area - Bottom 35% */}
      <div className="p-4">
        {/* Bio - 2 lines max */}
        <p className="text-[13px] text-[#6B5B6E] font-body leading-relaxed line-clamp-2 mb-3">
          {companion.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {companion.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-500 text-[11px] font-body font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-[12px] text-[#A093A5] font-body">
          <div className="flex items-center gap-1">
            <Heart size={14} className="text-pink-300" />
            <span>{companion.likes} 喜爱</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle size={14} className="text-pink-300" />
            <span>{companion.chats} 对话</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Detail Modal ─── */
function DetailModal({
  companion,
  onClose,
}: {
  companion: PlazaCompanion;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(26,16,37,0.5)] backdrop-blur-[4px]"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <motion.div
        className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-lg overflow-hidden z-10"
        variants={modalPanelVariants}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <X size={18} className="text-[#6B5B6E]" />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Left Column - Image */}
          <div className="sm:w-[40%] relative h-[200px] sm:h-auto">
            <CompanionImage
              companion={companion}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(26,16,37,0.5)] to-transparent sm:bg-gradient-to-r" />
          </div>

          {/* Right Column - Info */}
          <div className="sm:w-[60%] p-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <h2 className="font-display text-[36px] text-[#2D1B2E] leading-tight mb-1">
                {companion.nickname}
              </h2>
              <span className="inline-block px-3 py-0.5 rounded-full bg-pink-50 text-pink-500 text-[12px] font-body font-semibold mb-3">
                {companion.personalityType}
              </span>
            </motion.div>

            <motion.p
              className="text-[14px] text-[#6B5B6E] font-body leading-relaxed mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.3 }}
            >
              {companion.description}
              <br />
              <span className="text-[#A093A5] italic mt-1 block">&ldquo;{companion.quote}&rdquo;</span>
            </motion.p>

            {/* Personality Tags */}
            <motion.div
              className="flex flex-wrap gap-1.5 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              {companion.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-pink-50 text-pink-500 text-[12px] font-body font-medium"
                >
                  {tag}
                </span>
              ))}
            </motion.div>

            {/* Big Five Mini Bars */}
            <motion.div
              className="space-y-2 mb-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.3 }}
            >
              <p className="text-[12px] text-[#A093A5] font-body font-semibold mb-2">人格维度</p>
              {companion.bigFive.map((item, i) => (
                <div key={item.trait} className="flex items-center gap-2">
                  <span className="text-[11px] text-[#6B5B6E] font-body w-12 shrink-0">{item.trait}</span>
                  <div className="flex-1 h-1 bg-pink-50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#E8A0BF]"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 0.5, delay: 0.45 + i * 0.08, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                    />
                  </div>
                  <span className="text-[10px] text-[#A093A5] font-number w-7 text-right">{item.value}</span>
                </div>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              className="flex items-center gap-4 mb-5 text-[12px] text-[#A093A5] font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex items-center gap-1">
                <Heart size={14} className="text-pink-400" />
                <span>{companion.likes} 喜爱</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle size={14} className="text-pink-400" />
                <span>{companion.chats} 对话</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles size={14} className="text-pink-400" />
                <span>在线</span>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.3 }}
            >
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/chat')}
                  className="w-full py-3 rounded-xl accent-gradient text-white font-body font-semibold text-[14px] hover:brightness-110 transition-all duration-150 flex items-center justify-center gap-2"
                >
                  认识这个伴侣
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full py-3 rounded-xl accent-gradient text-white font-body font-semibold text-[14px] hover:brightness-110 transition-all duration-150 flex items-center justify-center gap-2"
                >
                  <LogIn size={16} />
                  登录以领养
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-pink-100 text-[#6B5B6E] font-body text-[14px] hover:bg-pink-50 transition-colors duration-150"
              >
                再看看
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Auth Banner ─── */
function AuthBanner() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="mb-6 rounded-xl bg-pink-50 border border-pink-200 p-4 flex items-center gap-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Info size={20} className="text-pink-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-[13px] text-[#6B5B6E] font-body">
          请登录以领养伴侣。
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/auth')}
          className="px-4 py-2 rounded-xl text-[13px] font-body font-medium text-pink-500 border border-pink-200 hover:bg-pink-100 transition-all duration-150 flex items-center gap-1.5"
        >
          <LogIn size={14} />
          登录
        </button>
        <button
          onClick={() => navigate('/auth')}
          className="px-4 py-2 rounded-xl text-[13px] font-body font-medium text-white accent-gradient hover:brightness-110 transition-all duration-150 flex items-center gap-1.5"
        >
          <UserPlus size={14} />
          创建账户
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Main Plaza Page ─── */
export default function Plaza() {
  const [activeFilter, setActiveFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanion, setSelectedCompanion] = useState<PlazaCompanion | null>(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [companions, setCompanions] = useState<PlazaCompanion[]>(mockCompanions);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Load companions from Supabase
  useEffect(() => {
    loadPlazaCompanions();
  }, []);

  async function loadPlazaCompanions() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('companions').select('*');
      if (error || !data || data.length === 0) {
        // Fallback to mock data already set in state
        setLoading(false);
        return;
      }
      const mapped: PlazaCompanion[] = data.map((c: Record<string, unknown>) => ({
        id: c.id as string | number,
        nickname: (c.nickname as string) || '未知伴侣',
        avatar: `/companion-${Math.floor(Math.random() * 6) + 1}.jpg`,
        storageAvatar: getStorageUrl(`companions/${c.id}.jpg`),
        description: (c.background as string) || '一个温暖的灵魂',
        tags: getPersonalityTags(c),
        likes: `${(Math.floor(Math.random() * 15) + 5)}k`,
        chats: `${(Math.floor(Math.random() * 10) + 3)}k`,
        personalityType: getPersonalityType(c),
        gender: (c.gender as 'female' | 'male') || 'female',
        bigFive: [
          { trait: '开放性', value: (c.bf_openness as number) || 50 },
          { trait: '尽责性', value: (c.bf_conscientiousness as number) || 50 },
          { trait: '外向性', value: (c.bf_extraversion as number) || 50 },
          { trait: '宜人性', value: (c.bf_agreeableness as number) || 50 },
          { trait: '神经质', value: (c.bf_neuroticism as number) || 50 },
        ],
        quote: '很高兴认识你～',
      }));
      setCompanions(mapped);
    } catch (e) {
      console.error('Plaza load error:', e);
      // Fallback to mock data already in state
    } finally {
      setLoading(false);
    }
  }

  // Filter companions
  const filteredCompanions = useMemo(() => {
    let result = companions;

    if (activeFilter !== '全部') {
      result = result.filter((c) => c.personalityType === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.nickname.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [activeFilter, searchQuery, companions]);

  // Close modal on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCompanion(null);
        setShowFilterDrawer(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="min-h-[100dvh] p-6">
      <div className="max-w-[1100px] mx-auto">
        {/* ─── Section 0: Auth Banner (when not logged in) ─── */}
        {!isAuthenticated && <AuthBanner />}

        {/* ─── Section 1: Top Bar ─── */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Left: Title */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Users size={24} className="text-pink-400" />
              <h2 className="font-body text-[28px] font-bold text-[#2D1B2E]">伴侣广场</h2>
            </div>
            <p className="text-[13px] text-[#6B5B6E] font-body">选择一个灵魂，开始你的旅程</p>
          </motion.div>

          {/* Right: Search + Filter */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A093A5]" />
              <input
                type="text"
                placeholder="搜索伴侣名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[220px] pl-9 pr-4 py-2.5 rounded-xl border border-pink-100 bg-white text-[13px] font-body text-[#2D1B2E] placeholder:text-[#A093A5] focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterDrawer(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-pink-100 bg-white text-[13px] font-body text-[#6B5B6E] hover:bg-pink-50 transition-colors duration-150"
            >
              <SlidersHorizontal size={16} />
              <span>筛选</span>
            </button>

            {/* Sort Dropdown */}
            <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-pink-100 bg-white text-[13px] font-body text-[#6B5B6E] hover:bg-pink-50 transition-colors duration-150">
              <span>推荐</span>
              <ChevronDown size={14} />
            </button>
          </motion.div>
        </motion.div>

        {/* ─── Section 2: Filter Tabs ─── */}
        <motion.div
          className="mb-6 -mx-6 px-6 overflow-x-auto scrollbar-hide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="flex items-center gap-2 min-w-max">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={cn(
                  'px-5 py-2 rounded-full text-[13px] font-body font-medium transition-all duration-150 whitespace-nowrap',
                  activeFilter === tab
                    ? 'accent-gradient text-white shadow-md'
                    : 'bg-white text-[#6B5B6E] border border-pink-100 hover:bg-pink-50'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── Section 3: Companion Grid ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[#A093A5] font-body text-[14px]">加载中...</div>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`${activeFilter}-${searchQuery}`}
          >
            <AnimatePresence mode="popLayout">
              {filteredCompanions.map((companion, index) => (
                <CompanionCard
                  key={companion.id}
                  companion={companion}
                  index={index}
                  onClick={() => setSelectedCompanion(companion)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && filteredCompanions.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Search size={48} className="text-pink-200 mb-4" />
            <p className="text-[#6B5B6E] font-body text-[16px] mb-2">没有找到符合条件的伴侣</p>
            <p className="text-[#A093A5] font-body text-[13px]">试试其他筛选条件吧</p>
          </motion.div>
        )}

        {/* ─── Section 4: Load More ─── */}
        {!loading && filteredCompanions.length > 0 && (
          <motion.div
            className="flex flex-col items-center mt-10 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-pink-200 bg-pink-50 text-pink-500 text-[13px] font-body font-medium hover:bg-pink-100 transition-colors duration-150">
              <ChevronDown size={16} />
              加载更多
            </button>
            <p className="text-[12px] text-[#A093A5] font-body mt-3">已展示全部伴侣</p>
          </motion.div>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      <AnimatePresence>
        {selectedCompanion && (
          <DetailModal
            companion={selectedCompanion}
            onClose={() => setSelectedCompanion(null)}
          />
        )}
      </AnimatePresence>

      {/* ─── Filter Drawer ─── */}
      <AnimatePresence>
        {showFilterDrawer && (
          <motion.div
            className="fixed inset-0 z-[100]"
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className="absolute inset-0 bg-[rgba(26,16,37,0.4)] backdrop-blur-[4px]"
              onClick={() => setShowFilterDrawer(false)}
            />
            <motion.div
              className="absolute right-0 top-0 h-full w-[360px] max-w-[90vw] bg-white shadow-xl z-10 flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-pink-50">
                <h3 className="font-body text-[22px] font-bold text-[#2D1B2E]">筛选伴侣</h3>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="w-8 h-8 rounded-full hover:bg-pink-50 flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-[#6B5B6E]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Personality Type */}
                <div>
                  <p className="text-[13px] font-body font-semibold text-[#2D1B2E] mb-3">性格类型</p>
                  <div className="space-y-2">
                    {['温柔型', '活泼型', '知性型', '神秘型'].map((type) => (
                      <label key={type} className="flex items-center gap-3 cursor-pointer group">
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-150',
                            activeFilter === type
                              ? 'bg-pink-400 border-pink-400'
                              : 'border-pink-200 group-hover:border-pink-300'
                          )}
                          onClick={() => setActiveFilter(activeFilter === type ? '全部' : type)}
                        >
                          {activeFilter === type && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-[13px] text-[#6B5B6E] font-body">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Voice */}
                <div>
                  <p className="text-[13px] font-body font-semibold text-[#2D1B2E] mb-3">声线偏好</p>
                  <div className="flex flex-wrap gap-2">
                    {['甜美', '成熟', '清亮', '低沉'].map((voice) => (
                      <button
                        key={voice}
                        className="px-4 py-2 rounded-full border border-pink-100 text-[12px] font-body text-[#6B5B6E] hover:bg-pink-50 transition-colors"
                      >
                        {voice}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <p className="text-[13px] font-body font-semibold text-[#2D1B2E] mb-3">话题偏好</p>
                  <div className="flex flex-wrap gap-2">
                    {['日常', '文学', '游戏', '哲学', '情感', '旅行'].map((topic) => (
                      <button
                        key={topic}
                        className="px-4 py-2 rounded-full border border-pink-100 text-[12px] font-body text-[#6B5B6E] hover:bg-pink-50 transition-colors"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-pink-50 flex gap-3">
                <button
                  onClick={() => {
                    setActiveFilter('全部');
                    setShowFilterDrawer(false);
                  }}
                  className="flex-1 py-3 rounded-xl border border-pink-100 text-[#6B5B6E] text-[13px] font-body font-medium hover:bg-pink-50 transition-colors"
                >
                  重置
                </button>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="flex-1 py-3 rounded-xl accent-gradient text-white text-[13px] font-body font-medium hover:brightness-110 transition-all"
                >
                  应用
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
