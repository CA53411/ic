import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Heart,
  MessageCircle,
  LogIn,
  UserPlus,
  BookOpen,
  Sparkles,
  Sunrise,
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';

/* ─── Types ─── */
interface MemoryItem {
  id: string;
  type: 'milestone' | 'anterior' | 'ltm' | 'diary';
  title: string;
  description: string;
  time?: string;
  // Diary-specific fields (only populated for diary entries from consolidation)
  keyMoments?: string[];
  reflection?: string;
  tomorrowHopes?: string;
  emotionTag?: string;
}

interface DiaryRow {
  id: string;
  companion_id: string;
  diary_date: string;
  title: string | null;
  content: string;
  emotion_tag: string | null;
  sentiment_score: number | null;
  key_moments: string[] | null;
  reflection: string | null;
  tomorrow_hopes: string | null;
}

/* ─── Color helpers ─── */
const dotColors = {
  milestone: '#D4AF37',
  anterior: '#C8A8E9',
  ltm: '#FFB6C1',
  diary: '#A78BFA',
};

const getMemoryKey = (date: Date) => format(date, 'yyyy-MM-dd');

const getDotTypes = (memories: MemoryItem[]): ('milestone' | 'anterior' | 'ltm' | 'diary')[] => {
  const types = new Set<'milestone' | 'anterior' | 'ltm' | 'diary'>();
  memories.forEach((m) => types.add(m.type));
  return Array.from(types);
};

/* ─── Empty memories ─── */
const emptyMemories: Record<string, MemoryItem[]> = {};

/* ─── Login Prompt ─── */
function LoginPrompt() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-pink-50 border border-pink-200 p-8 text-center mb-6"
    >
      <Calendar size={32} className="text-pink-300 mx-auto mb-4" />
      <h3 className="font-body text-[18px] font-bold text-plum-900 mb-2">
        {t('memory.loginPrompt.title')}
      </h3>
      <p className="font-body text-[14px] text-[#6B5B6E] mb-4">
        {t('memory.loginPrompt.description')}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-2 px-5 py-2 rounded-xl accent-gradient text-white font-body font-medium text-[13px] hover:brightness-110 transition-all"
        >
          <LogIn size={14} />
          {t('common.login')}
        </button>
        <button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-2 px-5 py-2 rounded-xl border border-pink-200 text-pink-500 font-body font-medium text-[13px] hover:bg-pink-100 transition-all"
        >
          <UserPlus size={14} />
          {t('common.register')}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Component ─── */
export default function Memory() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // Jan 2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [memories, setMemories] = useState<Record<string, MemoryItem[]>>(emptyMemories);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  /* Load memories from Supabase */
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    async function loadMemories() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get companion
        const { data: companion } = await supabase
          .from('companions')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!companion) {
          setMemories(emptyMemories);
          setLoading(false);
          return;
        }

        const compId = companion.id;

        // Fetch all 3 memory sources in parallel
        const [
          diariesResult, ltmResult, anteriorResult
        ] = await Promise.all([
          // 1. Companion diaries (emotion summaries)
          supabase
            .from('companion_diaries')
            .select('id, diary_date, title, content, emotion_tag, sentiment_score, key_moments, reflection, tomorrow_hopes')
            .eq('companion_id', compId)
            .order('diary_date', { ascending: false })
            .limit(100),

          // 2. Long-term memories (extracted from conversations)
          supabase
            .from('ltm_memories')
            .select('id, content, memory_type, importance, created_at')
            .eq('companion_id', compId)
            .order('importance', { ascending: false })
            .limit(100),

          // 3. Anterior memories (todo items)
          supabase
            .from('anterior_memories')
            .select('id, content, trigger_type, priority, status, planned_at, created_at')
            .eq('companion_id', compId)
            .eq('status', 'pending')
            .order('priority', { ascending: false })
            .limit(50),
        ]);

        const grouped: Record<string, MemoryItem[]> = {};

        // Add diaries (from consolidation AI)
        if (diariesResult.data) {
          diariesResult.data.forEach((row: any) => {
            const dateKey = format(new Date(row.diary_date), 'yyyy-MM-dd');
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({
              id: `d-${row.id}`,
              type: 'diary',
              title: row.title || row.emotion_tag || t('memory.diary'),
              description: row.content || '',
              time: format(new Date(row.diary_date), 'HH:mm'),
              keyMoments: row.key_moments || [],
              reflection: row.reflection || '',
              tomorrowHopes: row.tomorrow_hopes || '',
              emotionTag: row.emotion_tag || '',
            });
          });
        }

        // Add LTM memories
        if (ltmResult.data) {
          ltmResult.data.forEach((row: any) => {
            const dateKey = format(new Date(row.created_at), 'yyyy-MM-dd');
            const typeLabel = row.memory_type === 'fact' ? '事实记忆'
              : row.memory_type === 'preference' ? '偏好记忆'
              : row.memory_type === 'event' ? '事件记忆'
              : '情感记忆';
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({
              id: `l-${row.id}`,
              type: 'ltm',
              title: typeLabel,
              description: row.content || '',
              time: format(new Date(row.created_at), 'HH:mm'),
            });
          });
        }

        // Add anterior memories
        if (anteriorResult.data) {
          anteriorResult.data.forEach((row: any) => {
            const dateKey = format(new Date(row.created_at), 'yyyy-MM-dd');
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({
              id: `a-${row.id}`,
              type: 'anterior',
              title: '待办提醒',
              description: row.content || '',
              time: format(new Date(row.created_at), 'HH:mm'),
            });
          });
        }

        setMemories(Object.keys(grouped).length > 0 ? grouped : emptyMemories);
      } catch (e) {
        console.error('Memory load error:', e);
        setMemories(emptyMemories);
      } finally {
        setLoading(false);
      }
    }

    loadMemories();
  }, [isAuthenticated]);

  /* Month navigation */
  const goToPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const goToNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  }, []);

  /* Calendar days generation */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  /* Day headers (Mon-Sun) */
  const dayHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  /* Selected date memories */
  const selectedMemories = selectedDate ? (memories[getMemoryKey(selectedDate)] || []) : [];

  /* Handle date click */
  const handleDateClick = (date: Date) => {
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(startOfMonth(date));
    }
    setSelectedDate(date);
  };

  /* Animation variants */
  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.02 },
    },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
  };

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  const sidebarVariants = {
    hidden: { x: 400, opacity: 0 },
    show: { x: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
    exit: { x: 400, opacity: 0, transition: { duration: 0.3 } },
  };

  const memoryCardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06, duration: 0.3 },
    }),
  };

  return (
    <div className="min-h-[100dvh] bg-pink-50 relative">
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
            <Calendar size={20} className="text-pink-400" />
            <div>
              <h2 className="font-body text-[28px] font-bold text-[#2D1B2E] leading-tight">
                {t('memory.title')}
              </h2>
              <p className="text-[13px] text-[#6B5B6E] mt-0.5">
                记录每一个特别的瞬间
              </p>
            </div>
          </div>

          {/* Center: Month Navigation */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <button
              onClick={goToPrevMonth}
              className="w-9 h-9 rounded-lg bg-white border border-pink-100 flex items-center justify-center
                hover:bg-pink-50 hover:border-pink-200 transition-all duration-150 active:scale-95"
            >
              <ChevronLeft size={18} className="text-[#2D1B2E]" />
            </button>
            <h3 className="font-body text-[22px] font-bold text-[#2D1B2E] min-w-[140px] text-center">
              {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
            </h3>
            <button
              onClick={goToNextMonth}
              className="w-9 h-9 rounded-lg bg-white border border-pink-100 flex items-center justify-center
                hover:bg-pink-50 hover:border-pink-200 transition-all duration-150 active:scale-95"
            >
              <ChevronRight size={18} className="text-[#2D1B2E]" />
            </button>
            <button
              onClick={goToToday}
              className="ml-2 px-4 py-1.5 rounded-full text-[13px] font-medium
                text-pink-500 bg-white border border-pink-200
                hover:bg-pink-100 transition-all duration-150 active:scale-95"
            >
              回到今天
            </button>
          </motion.div>

          {/* Right: Brand info */}
          <motion.div
            className="text-[13px] text-[#6B5B6E]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            Corolas | Platonic
          </motion.div>
        </motion.div>
      </div>

      {/* ── Login Prompt for unauthenticated ── */}
      {!isAuthenticated && (
        <div className="px-8 pb-4">
          <LoginPrompt />
        </div>
      )}

      {/* ── Calendar Area ── */}
      <div className="px-8 pb-6 flex gap-6">
        <div className="flex-1">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayHeaders.map((label, i) => (
              <div
                key={label}
                className={cn(
                  'h-9 flex items-center justify-center text-[12px] font-semibold tracking-wider text-[#A093A5] rounded-lg',
                  i >= 5 ? 'bg-pink-50/60' : ''
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={format(currentMonth, 'yyyy-MM')}
              className="grid grid-cols-7 gap-2"
              variants={gridVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {calendarDays.map((day, idx) => {
                const inCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const dayMemories = memories[getMemoryKey(day)] || [];
                const dots = getDotTypes(dayMemories);
                const milestone = dayMemories.find((m) => m.type === 'milestone');

                return (
                  <motion.button
                    key={idx}
                    variants={cellVariants}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'relative aspect-square rounded-xl border p-2 flex flex-col items-start justify-between',
                      'transition-all duration-200 cursor-pointer',
                      !inCurrentMonth && 'opacity-40',
                      isSelected
                        ? 'border-[#1A1025] border-2 shadow-[0_0_24px_rgba(255,182,193,0.25)]'
                        : 'border-pink-50 bg-white hover:border-pink-200 hover:bg-pink-50 hover:shadow-md hover:-translate-y-0.5',
                      isTodayDate && !isSelected && 'ring-2 ring-pink-400 ring-offset-1'
                    )}
                  >
                    {/* Day Number */}
                    <span
                      className={cn(
                        'text-[14px] font-semibold leading-none',
                        isTodayDate
                          ? 'w-7 h-7 rounded-full bg-pink-400 text-white flex items-center justify-center'
                          : inCurrentMonth
                            ? 'text-[#2D1B2E]'
                            : 'text-[#A093A5]'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Memory Indicators */}
                    <div className="w-full flex flex-col items-center gap-1 mt-auto">
                      {dots.length > 0 && (
                        <div className="flex items-center gap-1">
                          {dots.map((type) => (
                            <div
                              key={type}
                              className="rounded-full"
                              style={{
                                width: type === 'milestone' ? 8 : 6,
                                height: type === 'milestone' ? 8 : 6,
                                backgroundColor: dotColors[type],
                              }}
                              title={
                                type === 'milestone'
                                  ? t('memory.milestone')
                                  : type === 'anterior'
                                    ? t('memory.anterior')
                                    : t('memory.ltm')
                              }
                            />
                          ))}
                        </div>
                      )}
                      {/* Milestone label */}
                      {milestone && (
                        <span className="text-[10px] text-[#D4AF37] truncate w-full text-center leading-none">
                          {milestone.title}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Legend */}
          <motion.div
            className="flex items-center gap-6 mt-6 px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              <span className="text-[13px] text-[#6B5B6E]">{t('memory.milestone')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C8A8E9]" />
              <span className="text-[13px] text-[#6B5B6E]">{t('memory.anterior')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFB6C1]" />
              <span className="text-[13px] text-[#6B5B6E]">{t('memory.ltm')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-pink-400 flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">今</span>
              </div>
              <span className="text-[13px] text-[#6B5B6E]">今天</span>
            </div>
          </motion.div>
        </div>

        {/* ── Detail Drawer ── */}
        <AnimatePresence>
          {selectedDate && (
            <>
              {/* Overlay */}
              <motion.div
                className="fixed inset-0 bg-black/5 z-40"
                style={{ left: 220 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDate(null)}
              />
              {/* Drawer */}
              <motion.div
                className="fixed right-0 top-0 h-full w-[380px] bg-white border-l border-pink-100 z-50 shadow-lg flex flex-col"
                variants={sidebarVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {/* Drawer Header */}
                <div className="h-[60px] flex items-center justify-between px-6 border-b border-pink-50 shrink-0">
                  <div>
                    <h2 className="font-body text-[22px] font-bold text-[#2D1B2E]">
                      {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="w-9 h-9 rounded-full flex items-center justify-center
                      border border-pink-100 text-[#A093A5] hover:bg-pink-50 hover:text-[#2D1B2E]
                      transition-all duration-150"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Quick Action */}
                <div className="px-6 py-3 border-b border-pink-50 shrink-0">
                  <button
                    onClick={() => toast('在对话中回顾功能即将上线')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium
                      text-pink-500 bg-pink-50 border border-pink-200
                      hover:bg-pink-100 transition-all duration-150"
                  >
                    <MessageCircle size={14} />
                    在对话中回顾
                  </button>
                </div>

                {/* Memory List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  <AnimatePresence>
                    {selectedMemories.length > 0 ? (
                      selectedMemories.map((memory, idx) => (
                        <motion.div
                          key={memory.id}
                          custom={idx}
                          variants={memoryCardVariants}
                          initial="hidden"
                          animate="show"
                        >
                          {/* Milestone Card */}
                          {memory.type === 'milestone' && (
                            <div
                              className="rounded-xl p-4 bg-[rgba(212,175,55,0.05)] border-l-[3px] border-[#D4AF37]"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Star size={16} className="text-[#D4AF37] fill-[#D4AF37]" />
                                <span className="font-body text-[18px] font-semibold text-[#2D1B2E]">
                                  {memory.title}
                                </span>
                              </div>
                              <p className="text-[13px] text-[#6B5B6E] leading-relaxed">
                                {memory.description}
                              </p>
                              {memory.time && (
                                <span className="text-[12px] text-[#A093A5] mt-2 block">
                                  {memory.time}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Anterior Memory Card */}
                          {memory.type === 'anterior' && (
                            <div className="rounded-xl p-4 bg-white border border-pink-100">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-[#C8A8E9]" />
                                <span className="text-[12px] font-semibold tracking-wider text-[#C8A8E9] uppercase">
                                  {t('memory.anterior')}
                                </span>
                              </div>
                              <p className="text-[13px] text-[#2D1B2E] leading-relaxed">
                                {memory.description}
                              </p>
                              {memory.time && (
                                <span className="text-[12px] text-[#A093A5] mt-2 block">
                                  {memory.time}
                                </span>
                              )}
                            </div>
                          )}

                          {/* LTM Memory Card */}
                          {memory.type === 'ltm' && (
                            <div className="rounded-xl p-4 bg-pink-50">
                              <div className="flex items-center gap-2 mb-2">
                                <Heart size={16} className="text-pink-400 fill-pink-400" />
                                <span className="text-[12px] font-semibold tracking-wider text-pink-500 uppercase">
                                  {t('memory.ltm')}
                                </span>
                              </div>
                              <p className="text-[13px] text-[#2D1B2E] leading-relaxed">
                                {memory.description}
                              </p>
                              {memory.time && (
                                <span className="text-[12px] text-[#A093A5] mt-2 block">
                                  {memory.time}
                                </span>
                              )}
                            </div>
                          )}

                          {/* AI Diary Card - from consolidation */}
                          {memory.type === 'diary' && (
                            <div className="rounded-xl p-5 bg-white border border-purple-100 shadow-sm">
                              {/* Title + Emotion Tag */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <BookOpen size={16} className="text-purple-400" />
                                  <span className="font-body text-[15px] font-semibold text-[#2D1B2E]">
                                    {memory.title}
                                  </span>
                                </div>
                                {memory.emotionTag && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-500">
                                    {memory.emotionTag}
                                  </span>
                                )}
                              </div>

                              {/* Main Content */}
                              <p className="text-[13px] text-[#2D1B2E] leading-relaxed mb-3 whitespace-pre-line">
                                {memory.description}
                              </p>

                              {/* Key Moments */}
                              {memory.keyMoments && memory.keyMoments.length > 0 && (
                                <div className="mb-3">
                                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                                    {t('memory.sparkMoments')}
                                  </span>
                                  <ul className="mt-1 space-y-1">
                                    {memory.keyMoments.map((moment, i) => (
                                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#6B5B6E]">
                                        <Sparkles size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                        {moment}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Reflection */}
                              {memory.reflection && (
                                <div className="mb-3 p-3 rounded-lg bg-purple-50/50">
                                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                                    {t('memory.reflection')}
                                  </span>
                                  <p className="text-[12px] text-[#6B5B6E] mt-1 italic">
                                    {memory.reflection}
                                  </p>
                                </div>
                              )}

                              {/* Tomorrow Hopes */}
                              {memory.tomorrowHopes && (
                                <div className="flex items-center gap-2 text-[11px] text-[#A093A5]">
                                  <Sunrise size={12} className="text-amber-400" />
                                  <span>{t('memory.tomorrowHopes')}: {memory.tomorrowHopes}</span>
                                </div>
                              )}

                              {memory.time && (
                                <span className="text-[12px] text-[#A093A5] mt-3 block">
                                  {memory.time}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      /* Empty State */
                      <motion.div
                        className="flex flex-col items-center justify-center py-16"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Calendar size={64} className="text-pink-100 mb-4" />
                        <p className="text-[15px] text-[#A093A5] font-medium">
                          {isAuthenticated ? t('memory.noData') : '登录后查看记忆'}
                        </p>
                        <p className="text-[13px] text-[#A093A5] mt-1">
                          {isAuthenticated ? '去和伴侣聊聊天，创造属于你们的记忆吧' : '去和伴侣聊聊天，创造属于你们的记忆吧'}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
