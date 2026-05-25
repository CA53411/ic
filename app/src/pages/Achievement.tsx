import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Lock,
  Star,
  Zap,
  Target,
  Heart,
  MessageCircle,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/I18nContext';

/* ─── Types ─── */
interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  total: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
}

/* ─── Icon map ─── */
const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  target: Target,
  heart: Heart,
  message: MessageCircle,
  calendar: Calendar,
  book: BookOpen,
};

/* ─── Achievement Card ─── */
function AchievementCard({
  achievement,
  index,
}: {
  achievement: AchievementItem;
  index: number;
}) {
  const { t } = useI18n();
  const Icon = iconMap[achievement.icon] || Trophy;
  const progressPercent = Math.min(
    (achievement.current / achievement.total) * 100,
    100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className={cn(
        'rounded-2xl border p-5 transition-all duration-200',
        achievement.unlocked
          ? 'bg-white border-pink-100 hover:shadow-lg hover:-translate-y-1'
          : 'bg-pink-50/50 border-pink-50 opacity-70'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            achievement.unlocked
              ? 'bg-pink-100 text-pink-500'
              : 'bg-pink-50 text-pink-300'
          )}
        >
          {achievement.unlocked ? (
            <Icon size={24} />
          ) : (
            <Lock size={20} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-body text-[15px] font-semibold text-[#2D1B2E]">
              {achievement.title}
            </h3>
            {achievement.unlocked && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-600">
                {t('achievement.unlocked')}
              </span>
            )}
            {!achievement.unlocked && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-100 text-pink-400">
                {t('achievement.locked')}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#6B5B6E] mb-3 leading-relaxed">
            {achievement.description}
          </p>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#A093A5]">
                {t('achievement.progress')}
              </span>
              <span className="text-[11px] text-[#6B5B6E] font-medium">
                {achievement.current}/{achievement.total}
              </span>
            </div>
            <div className="h-2 bg-pink-50 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  achievement.unlocked
                    ? 'bg-pink-400'
                    : 'bg-pink-200'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.06 }}
              />
            </div>
          </div>

          {achievement.unlockedAt && (
            <p className="text-[11px] text-[#A093A5] mt-2">
              {achievement.unlockedAt}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Component ─── */
export default function Achievement() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  /* Load achievements */
  useEffect(() => {
    async function loadAchievements() {
      try {
        setLoading(true);

        if (!isAuthenticated) {
          setAchievements([]);
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAchievements([]);
          setLoading(false);
          return;
        }

        // Load user stats for achievement calculation
        const [
          messagesResult,
          diariesResult,
          dramasResult,
        ] = await Promise.all([
          supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('companion_diaries')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('drama_progress')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        const messageCount = messagesResult.count ?? 0;
        const diaryCount = diariesResult.count ?? 0;
        const dramaCount = dramasResult.count ?? 0;

        // Build achievement list
        const achievementList: AchievementItem[] = [
          {
            id: 'first-chat',
            title: '初次邂逅',
            description: '发送你的第一条消息',
            icon: 'message',
            total: 1,
            current: Math.min(messageCount, 1),
            unlocked: messageCount >= 1,
          },
          {
            id: 'chat-10',
            title: '畅聊达人',
            description: '累计发送 10 条消息',
            icon: 'message',
            total: 10,
            current: Math.min(messageCount, 10),
            unlocked: messageCount >= 10,
          },
          {
            id: 'chat-100',
            title: '千言万语',
            description: '累计发送 100 条消息',
            icon: 'message',
            total: 100,
            current: Math.min(messageCount, 100),
            unlocked: messageCount >= 100,
          },
          {
            id: 'first-diary',
            title: '记忆收藏家',
            description: '拥有第一篇日记',
            icon: 'book',
            total: 1,
            current: Math.min(diaryCount, 1),
            unlocked: diaryCount >= 1,
          },
          {
            id: 'first-drama',
            title: '剧情探索者',
            description: '首次参与剧情',
            icon: 'star',
            total: 1,
            current: Math.min(dramaCount, 1),
            unlocked: dramaCount >= 1,
          },
          {
            id: 'login-7',
            title: '七日之约',
            description: '连续 7 天登录',
            icon: 'calendar',
            total: 7,
            current: 1,
            unlocked: false,
          },
        ];

        setAchievements(achievementList);
      } catch (e) {
        console.error('Achievement load error:', e);
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    }

    loadAchievements();
  }, [isAuthenticated]);

  /* Filtered achievements */
  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  /* Animation */
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
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
            <Trophy size={20} className="text-pink-400" />
            <h2 className="font-body text-[28px] font-bold text-[#2D1B2E]">
              {t('achievement.title')}
            </h2>
          </div>

          {/* Right: Stats */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="px-3 py-1 rounded-full text-[12px] font-semibold text-pink-500 bg-pink-50 border border-pink-200">
              {unlockedCount}/{achievements.length}
            </span>
          </motion.div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          className="flex items-center gap-2 mt-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {([
            { key: 'all', label: '全部' },
            { key: 'unlocked', label: t('achievement.unlocked') },
            { key: 'locked', label: t('achievement.locked') },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-5 py-2 rounded-full text-[14px] font-medium transition-all duration-200',
                filter === tab.key
                  ? 'accent-gradient text-white shadow-md'
                  : 'bg-white text-[#6B5B6E] border border-pink-100 hover:bg-pink-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-pink-300 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {filteredAchievements.length > 0 ? (
              <motion.div
                className="grid grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <AnimatePresence>
                  {filteredAchievements.map((achievement, idx) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      index={idx}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col items-center justify-center py-20"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Trophy size={64} className="text-pink-200 mb-4" />
                <p className="text-[15px] text-[#A093A5] font-medium">
                  {t('achievement.noAchievements')}
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
