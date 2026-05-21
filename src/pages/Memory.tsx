import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
interface MemoryItem {
  id: string;
  type: 'milestone' | 'anterior' | 'ltm';
  title: string;
  description: string;
  time?: string;
}

/* ─── Mock Data ─── */
const mockMemories: Record<string, MemoryItem[]> = {
  '2026-01-03': [
    { id: '1', type: 'milestone', title: '初见乍欢', description: '你们的关系迈出了第一步，彼此产生了初步的好感。', time: '10:00' },
  ],
  '2026-01-08': [
    { id: '2', type: 'anterior', title: '工作记忆', description: '记得明天提醒用户开会', time: '09:15' },
    { id: '3', type: 'ltm', title: '长期记忆形成', description: '用户提到了喜欢猫', time: '14:30' },
  ],
  '2026-01-12': [
    { id: '4', type: 'anterior', title: '工作记忆', description: '用户今天完成了项目报告', time: '11:20' },
  ],
  '2026-01-15': [
    { id: '5', type: 'milestone', title: '暗生情愫', description: '你们的关系进入了新的阶段，彼此间产生了更深的情感连接。', time: '14:32' },
    { id: '6', type: 'ltm', title: '长期记忆形成', description: '记住了你喜欢在压力大的时候听音乐', time: '20:12' },
  ],
  '2026-01-18': [
    { id: '7', type: 'anterior', title: '工作记忆', description: '用户提到了周末想去公园', time: '16:45' },
  ],
  '2026-01-20': [
    { id: '8', type: 'ltm', title: '长期记忆形成', description: '记住了你不喜欢吃香菜', time: '19:00' },
  ],
  '2026-01-25': [
    { id: '9', type: 'anterior', title: '工作记忆', description: '用户需要准备下周的演讲', time: '08:30' },
    { id: '10', type: 'milestone', title: '渐生情愫', description: '好感度持续提升，彼此更加了解。', time: '21:00' },
  ],
  '2026-01-28': [
    { id: '11', type: 'ltm', title: '长期记忆形成', description: '记住了你喜欢下雨天', time: '18:45' },
  ],
};

/* ─── Color helpers ─── */
const dotColors = {
  milestone: '#D4AF37',
  anterior: '#C8A8E9',
  ltm: '#FFB6C1',
};

const getMemoryKey = (date: Date) => format(date, 'yyyy-MM-dd');

const getDayMemories = (date: Date): MemoryItem[] => {
  return mockMemories[getMemoryKey(date)] || [];
};

const getDotTypes = (memories: MemoryItem[]): ('milestone' | 'anterior' | 'ltm')[] => {
  const types = new Set<'milestone' | 'anterior' | 'ltm'>();
  memories.forEach((m) => types.add(m.type));
  return Array.from(types);
};

/* ─── Component ─── */
export default function Memory() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // Jan 2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
  const selectedMemories = selectedDate ? getDayMemories(selectedDate) : [];

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
                甜蜜记忆
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

          {/* Right: Companion info */}
          <motion.div
            className="text-[13px] text-[#6B5B6E]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            与 小樱 的 45 天记忆
          </motion.div>
        </motion.div>
      </div>

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
                const memories = getDayMemories(day);
                const dots = getDotTypes(memories);
                const milestone = memories.find((m) => m.type === 'milestone');

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
                                  ? '里程碑'
                                  : type === 'anterior'
                                    ? '工作记忆'
                                    : '长期记忆'
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
              <span className="text-[13px] text-[#6B5B6E]">里程碑</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C8A8E9]" />
              <span className="text-[13px] text-[#6B5B6E]">工作记忆</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FFB6C1]" />
              <span className="text-[13px] text-[#6B5B6E]">长期记忆</span>
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
                                  工作记忆
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
                                  长期记忆形成
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
                          这一天还没有留下回忆
                        </p>
                        <p className="text-[13px] text-[#A093A5] mt-1">
                          去和伴侣聊聊天，创造属于你们的记忆吧
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
