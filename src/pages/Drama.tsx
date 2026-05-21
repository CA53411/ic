import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Star,
  Lock,
  Users,
  Sparkles,
  Check,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ─── Types ─── */
interface DramaItem {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  rating: number;
  ratingCount: string;
  genre: string;
  tags: string[];
  isUnlocked: boolean;
  unlockCondition: string;
  difficulty: '简单' | '中等' | '困难';
}

interface MyStorySession {
  id: string;
  dramaId: string;
  title: string;
  coverImage: string;
  currentChapter: number;
  totalChapters: number;
  status: 'ongoing' | 'completed';
  lastPlayed: string;
  affection: number;
}

/* ─── Mock Data ─── */
const dramaData: DramaItem[] = [
  {
    id: '1',
    title: '樱花树下的约定',
    description: '春天的一个傍晚，你和她在盛开的樱花树下相遇。风轻轻吹过，花瓣飘落在她的发间...',
    coverImage: '/drama-cover-1.jpg',
    rating: 4.9,
    ratingCount: '2.3k',
    genre: '浪漫',
    tags: ['浪漫', '春日'],
    isUnlocked: true,
    unlockCondition: '免费',
    difficulty: '简单',
  },
  {
    id: '2',
    title: '雨夜咖啡馆',
    description: '一个下雨的夜晚，你们躲进了街角温馨的咖啡馆。窗外的雨滴和屋内的暖光交织...',
    coverImage: '/drama-cover-2.jpg',
    rating: 4.7,
    ratingCount: '1.8k',
    genre: '日常',
    tags: ['日常', '温馨'],
    isUnlocked: true,
    unlockCondition: '已解锁',
    difficulty: '简单',
  },
  {
    id: '3',
    title: '星空下的告白',
    description: '湖畔的夏夜，繁星点点。你们并肩坐在草地上，萤火虫在身旁飞舞...',
    coverImage: '/drama-cover-3.jpg',
    rating: 4.8,
    ratingCount: '3.1k',
    genre: '浪漫',
    tags: ['浪漫', '夜晚'],
    isUnlocked: false,
    unlockCondition: '需80好感度',
    difficulty: '中等',
  },
  {
    id: '4',
    title: '花园茶会',
    description: '维多利亚风格的花园中，一场优雅的茶会正在进行。玫瑰盛开，茶香四溢...',
    coverImage: '/drama-cover-4.jpg',
    rating: 4.5,
    ratingCount: '950',
    genre: '日常',
    tags: ['优雅', '古典'],
    isUnlocked: false,
    unlockCondition: '需60电量',
    difficulty: '中等',
  },
  {
    id: '5',
    title: '迷雾庄园',
    description: '一座古老的庄园笼罩在神秘的迷雾中。你们需要携手解开隐藏百年的秘密...',
    coverImage: '/drama-cover-1.jpg',
    rating: 4.6,
    ratingCount: '1.2k',
    genre: '悬疑',
    tags: ['悬疑', '冒险'],
    isUnlocked: false,
    unlockCondition: '需暗生情愫阶段',
    difficulty: '困难',
  },
  {
    id: '6',
    title: '梦境奇旅',
    description: '在奇幻的梦境世界中，你们化身为冒险者。独角兽、水晶城堡、彩虹桥...',
    coverImage: '/drama-cover-3.jpg',
    rating: 4.8,
    ratingCount: '1.5k',
    genre: '奇幻',
    tags: ['奇幻', '冒险'],
    isUnlocked: true,
    unlockCondition: '免费',
    difficulty: '中等',
  },
];

const myStorySessions: MyStorySession[] = [
  {
    id: 's1',
    dramaId: '1',
    title: '樱花树下的约定',
    coverImage: '/drama-cover-1.jpg',
    currentChapter: 3,
    totalChapters: 8,
    status: 'ongoing',
    lastPlayed: '2天前',
    affection: 45,
  },
  {
    id: 's2',
    dramaId: '2',
    title: '雨夜咖啡馆',
    coverImage: '/drama-cover-2.jpg',
    currentChapter: 5,
    totalChapters: 5,
    status: 'completed',
    lastPlayed: '1周前',
    affection: 60,
  },
  {
    id: 's3',
    dramaId: '6',
    title: '梦境奇旅',
    coverImage: '/drama-cover-3.jpg',
    currentChapter: 2,
    totalChapters: 10,
    status: 'ongoing',
    lastPlayed: '3天前',
    affection: 30,
  },
];

const filterTabs = ['全部', '已解锁', '热门', '浪漫', '悬疑', '日常', '奇幻'];

const difficultyColors: Record<string, string> = {
  '简单': 'bg-green-100 text-green-700',
  '中等': 'bg-amber-100 text-amber-700',
  '困难': 'bg-red-100 text-red-700',
};

/* ─── Component ─── */
export default function Drama() {
  const [activeView, setActiveView] = useState<'plaza' | 'my'>('plaza');
  const [activeFilter, setActiveFilter] = useState('全部');

  /* Filtered dramas */
  const filteredDramas = useMemo(() => {
    if (activeFilter === '全部') return dramaData;
    if (activeFilter === '已解锁') return dramaData.filter((d) => d.isUnlocked);
    if (activeFilter === '热门') return [...dramaData].sort((a, b) => b.ratingCount.localeCompare(a.ratingCount));
    return dramaData.filter((d) => d.genre === activeFilter);
  }, [activeFilter]);

  /* Unlocked count */
  const unlockedCount = dramaData.filter((d) => d.isUnlocked).length;

  /* Handle enter drama */
  const handleEnterDrama = (title: string) => {
    toast('剧情空间即将开启...', {
      description: `正在进入「${title}」的剧情世界`,
      icon: <Sparkles size={16} className="text-pink-400" />,
    });
  };

  /* Handle locked click */
  const handleLockedClick = (condition: string) => {
    toast('剧情尚未解锁', {
      description: `解锁条件：${condition}`,
    });
  };

  /* Animation variants */
  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.4 },
    }),
  };

  return (
    <div className="min-h-[100dvh] bg-pink-50">
      {/* ── Top Bar ── */}
      <div className="px-8 pt-6 pb-4">
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-pink-400" />
            <h2 className="font-body text-[28px] font-bold text-[#2D1B2E]">
              剧情空间
            </h2>
          </div>

          {/* Right: Unlocked badge */}
          <motion.span
            className="px-3 py-1 rounded-full text-[12px] font-semibold tracking-wider text-pink-500 bg-pink-50 border border-pink-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            已解锁 {unlockedCount}/{dramaData.length}
          </motion.span>
        </motion.div>

        {/* View Toggle */}
        <motion.div
          className="flex items-center gap-2 mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => setActiveView('plaza')}
            className={cn(
              'px-5 py-2 rounded-full text-[14px] font-medium transition-all duration-200',
              activeView === 'plaza'
                ? 'accent-gradient text-white shadow-md'
                : 'bg-white text-[#6B5B6E] border border-pink-100 hover:bg-pink-50'
            )}
          >
            剧情广场
          </button>
          <button
            onClick={() => setActiveView('my')}
            className={cn(
              'px-5 py-2 rounded-full text-[14px] font-medium transition-all duration-200',
              activeView === 'my'
                ? 'accent-gradient text-white shadow-md'
                : 'bg-white text-[#6B5B6E] border border-pink-100 hover:bg-pink-50'
            )}
          >
            我的剧情
          </button>
        </motion.div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 pb-8">
        <AnimatePresence mode="wait">
          {/* ═══ Story Plaza ═══ */}
          {activeView === 'plaza' && (
            <motion.div
              key="plaza"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Featured Banner */}
              <motion.div
                className="relative w-full h-[240px] rounded-3xl overflow-hidden mb-6 group cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                onClick={() => handleEnterDrama('樱花树下的约定')}
              >
                <img
                  src="/drama-cover-1.jpg"
                  alt="Featured"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.03]"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 30%, rgba(26,16,37,0.85) 100%)',
                  }}
                />
                <div className="absolute right-0 top-0 h-full w-[60%] flex flex-col justify-center px-8">
                  <span className="inline-flex px-3 py-1 rounded-full text-[12px] font-semibold text-white accent-gradient w-fit mb-3">
                    推荐剧情
                  </span>
                  <h1 className="font-display text-[36px] text-white mb-2 leading-tight">
                    樱花树下的约定
                  </h1>
                  <p className="text-[15px] text-white/80 leading-relaxed mb-4 line-clamp-2">
                    春天的一个傍晚，你和她在盛开的樱花树下相遇。风轻轻吹过，花瓣飘落在她的发间...
                  </p>
                  <div className="flex items-center gap-4 text-[13px] text-white/70 mb-4">
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-[#D4AF37] fill-[#D4AF37]" />
                      4.9
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      2.3k 体验
                    </span>
                    <span className="flex items-center gap-1">
                      <Lock size={14} />
                      免费解锁
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnterDrama('樱花树下的约定');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-white text-pink-500 font-semibold text-[14px]
                      hover:bg-pink-50 transition-all duration-150 w-fit shadow-md active:scale-95"
                  >
                    开始体验
                  </button>
                </div>
              </motion.div>

              {/* Filter Tabs */}
              <motion.div
                className="flex items-center gap-2 mb-6 flex-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {filterTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200',
                      activeFilter === tab
                        ? 'accent-gradient text-white shadow-sm'
                        : 'bg-white text-[#6B5B6E] border border-pink-100 hover:bg-pink-50'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </motion.div>

              {/* Drama Card Grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFilter}
                  className="grid grid-cols-3 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {filteredDramas.map((drama, idx) => (
                    <motion.div
                      key={drama.id}
                      custom={idx}
                      variants={cardVariants}
                      initial="hidden"
                      animate="show"
                      className={cn(
                        'group rounded-2xl overflow-hidden bg-white border border-pink-100 transition-all duration-200',
                        'hover:shadow-lg hover:-translate-y-1.5',
                        !drama.isUnlocked && 'grayscale'
                      )}
                    >
                      {/* Cover Image */}
                      <div
                        className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                        onClick={() =>
                          drama.isUnlocked
                            ? handleEnterDrama(drama.title)
                            : handleLockedClick(drama.unlockCondition)
                        }
                      >
                        <img
                          src={drama.coverImage}
                          alt={drama.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
                        />
                        {/* Bottom gradient */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(transparent 50%, rgba(26,16,37,0.8) 100%)',
                          }}
                        />

                        {/* Difficulty badge */}
                        <span
                          className={cn(
                            'absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                            difficultyColors[drama.difficulty]
                          )}
                        >
                          {drama.difficulty}
                        </span>

                        {/* Genre tag */}
                        <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-[#2D1B2E]">
                          {drama.genre}
                        </span>

                        {/* Lock overlay */}
                        {!drama.isUnlocked && (
                          <div className="absolute inset-0 bg-[rgba(26,16,37,0.55)] flex flex-col items-center justify-center transition-all duration-200 group-hover:bg-[rgba(26,16,37,0.45)]">
                            <Lock size={32} className="text-white mb-2" />
                            <span className="text-[12px] text-white/80">{drama.unlockCondition}</span>
                            <span className="text-[11px] text-white/50 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              点击解锁
                            </span>
                          </div>
                        )}

                        {/* Info overlay at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="font-body text-[16px] font-semibold text-white leading-snug mb-1 line-clamp-2">
                            {drama.title}
                          </h4>
                          <div className="flex items-center gap-2 text-white/70">
                            <Star size={12} className="text-[#D4AF37] fill-[#D4AF37]" />
                            <span className="text-[12px]">{drama.rating}</span>
                            <span className="text-[11px] text-white/50">{drama.ratingCount}人</span>
                          </div>
                        </div>
                      </div>

                      {/* Info Area */}
                      <div className="p-4">
                        <p className="text-[12px] text-[#A093A5] line-clamp-2 mb-3 leading-relaxed">
                          {drama.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5">
                            {drama.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full text-[11px] bg-pink-50 text-pink-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          {drama.isUnlocked ? (
                            <button
                              onClick={() => handleEnterDrama(drama.title)}
                              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white
                                accent-gradient hover:brightness-110 transition-all duration-150
                                shadow-sm active:scale-95"
                            >
                              进入剧情
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#A093A5]">{drama.unlockCondition}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ My Stories ═══ */}
          {activeView === 'my' && (
            <motion.div
              key="my"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-pink-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={18} className="text-pink-400" />
                    <span className="text-[13px] text-[#6B5B6E]">总体验剧情</span>
                  </div>
                  <span className="font-number text-[32px] font-bold text-[#2D1B2E]">
                    {myStorySessions.length}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-pink-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={18} className="text-green-500" />
                    <span className="text-[13px] text-[#6B5B6E]">已完成</span>
                  </div>
                  <span className="font-number text-[32px] font-bold text-[#2D1B2E]">
                    {myStorySessions.filter((s) => s.status === 'completed').length}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-pink-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Play size={18} className="text-amber-500" />
                    <span className="text-[13px] text-[#6B5B6E]">进行中</span>
                  </div>
                  <span className="font-number text-[32px] font-bold text-[#2D1B2E]">
                    {myStorySessions.filter((s) => s.status === 'ongoing').length}
                  </span>
                </div>
              </div>

              {/* Session list */}
              <div className="space-y-4">
                {myStorySessions.map((session, idx) => {
                  const progress = (session.currentChapter / session.totalChapters) * 100;
                  return (
                    <motion.div
                      key={session.id}
                      className="bg-white rounded-2xl border border-pink-100 p-5 flex gap-5
                        hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.4 }}
                    >
                      {/* Cover thumbnail */}
                      <div className="w-[100px] h-[130px] rounded-xl overflow-hidden shrink-0">
                        <img
                          src={session.coverImage}
                          alt={session.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-body text-[18px] font-semibold text-[#2D1B2E]">
                              {session.title}
                            </h3>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                session.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              )}
                            >
                              {session.status === 'completed' ? '已完成' : '进行中'}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#A093A5]">
                            上次游玩：{session.lastPlayed} · 好感度：{session.affection}
                          </p>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] text-[#6B5B6E]">
                              进度 {session.currentChapter}/{session.totalChapters} 章
                            </span>
                            <span className="text-[12px] text-[#A093A5]">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-pink-50 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full accent-gradient"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.1 }}
                            />
                          </div>
                        </div>

                        {/* Action */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEnterDrama(session.title)}
                            className="px-5 py-2 rounded-xl text-[13px] font-semibold text-white
                              accent-gradient hover:brightness-110 transition-all duration-150
                              shadow-sm active:scale-95 flex items-center gap-1.5"
                          >
                            {session.status === 'completed' ? (
                              <>
                                <Sparkles size={14} />
                                重新体验
                              </>
                            ) : (
                              <>
                                <Play size={14} />
                                继续剧情
                              </>
                            )}
                          </button>
                          {session.status === 'completed' && (
                            <span className="flex items-center gap-1 text-[12px] text-green-600">
                              <Check size={14} />
                              已获得 +50 好感度
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
