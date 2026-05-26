import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Star,
  Users,
  Sparkles,
  Play,
  LogIn,
  UserPlus,
  RotateCcw,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, getStorageUrl, EDGE_FUNCTIONS_URL } from '@/lib/supabase';

/* ─── Types ─── */
interface DramaItem {
  id: string;
  name: string;
  description: string;
  cover_image_path: string | null;
  scene_setting: string | null;
  rating: number;
  ratingCount: string;
  genre: string;
  tags: string[];
  isUnlocked: boolean;
  unlockCondition: string;
  difficulty: '简单' | '中等' | '困难';
}

/** Matches database schema: drama_sessions + drama_definitions join */
interface MyStorySession {
  id: string;
  drama_id: string;
  drama_name: string;
  drama_cover: string;
  message_count: number;
  status: 'active' | 'not_started';
  started_at: string;
}

const filterTabs = ['全部', '热门', '浪漫', '悬疑', '日常', '奇幻'];

const difficultyColors: Record<string, string> = {
  '简单': 'bg-green-100 text-green-700',
  '中等': 'bg-amber-100 text-amber-700',
  '困难': 'bg-red-100 text-red-700',
};

/* ─── Drama Cover Image with fallback ─── */
function DramaCoverImage({ drama, className }: { drama: DramaItem; className?: string }) {
  const [src, setSrc] = useState(drama.cover_image_path || '/drama-cover-1.jpg');
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (!failed) {
      setSrc('/drama-cover-1.jpg');
      setFailed(true);
    }
  };

  return (
    <img
      src={src}
      alt={drama.name}
      className={className}
      onError={handleError}
    />
  );
}

/* ─── Login Banner ─── */
function AuthBanner() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="mb-6 rounded-xl bg-pink-50 border border-pink-200 p-4 flex items-center gap-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Sparkles size={20} className="text-pink-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-[13px] text-[#6B5B6E] font-body">
          登录后可以解锁并参与剧情互动。
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

/* ─── Component ─── */
export default function Drama() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'plaza' | 'my'>('plaza');
  const [activeFilter, setActiveFilter] = useState('全部');
  const [dramas, setDramas] = useState<DramaItem[]>([]);
  const [sessions, setSessions] = useState<MyStorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  /* ── Load dramas from Supabase — all unlocked by default ── */
  useEffect(() => {
    async function loadDramas() {
      try {
        setLoading(true);
        const { data: rows, error } = await supabase
          .from('drama_definitions')
          .select('id, name, description, scene_setting, cover_image_path, unlock_condition, is_active, sort_order')
          .order('sort_order', { ascending: true });

        if (error || !rows) {
          setDramas([]);
          return;
        }

        const mapped: DramaItem[] = rows.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          name: String(row.name || ''),
          description: String(row.description || ''),
          cover_image_path: row.cover_image_path ? getStorageUrl(String(row.cover_image_path)) : null,
          scene_setting: String(row.scene_setting || ''),
          rating: 4.5,                    // default
          ratingCount: '128',             // default
          genre: '浪漫',                   // default
          tags: ['剧情', '互动'],           // default
          isUnlocked: true,               // ← ALL dramas unlocked by default
          unlockCondition: String(row.unlock_condition || 'default'),
          difficulty: '简单' as const,     // default
        }));

        setDramas(mapped);
      } catch (e) {
        console.error('Drama load error:', e);
        setDramas([]);
      } finally {
        setLoading(false);
      }
    }

    loadDramas();
  }, []);

  /* ── Load my story sessions from drama_sessions + drama_definitions ── */
  useEffect(() => {
    async function loadSessions() {
      if (!user) {
        setSessions([]);
        return;
      }
      try {
        setSessionsLoading(true);

        // 1) Query drama_sessions for this user
        const { data: sessionRows, error: sessionError } = await supabase
          .from('drama_sessions')
          .select('id, drama_id, status, started_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false });

        if (sessionError || !sessionRows || sessionRows.length === 0) {
          setSessions([]);
          return;
        }

        // 2) Get drama definitions for names & covers
        const dramaIds = sessionRows.map((s: Record<string, unknown>) => String(s.drama_id));
        const { data: dramaRows } = await supabase
          .from('drama_definitions')
          .select('id, name, cover_image_path')
          .in('id', dramaIds);

        const dramaMap = new Map<string, { name: string; cover: string }>();
        if (dramaRows) {
          dramaRows.forEach((d: Record<string, unknown>) => {
            dramaMap.set(String(d.id), {
              name: String(d.name || ''),
              cover: d.cover_image_path ? getStorageUrl(String(d.cover_image_path)) : '/drama-cover-1.jpg',
            });
          });
        }

        // 3) Count messages per session from drama_messages
        const sessionIds = sessionRows.map((s: Record<string, unknown>) => String(s.id));
        const { data: messageRows } = await supabase
          .from('drama_messages')
          .select('session_id')
          .in('session_id', sessionIds);

        const messageCounts = new Map<string, number>();
        if (messageRows) {
          messageRows.forEach((m: Record<string, unknown>) => {
            const sid = String(m.session_id);
            messageCounts.set(sid, (messageCounts.get(sid) || 0) + 1);
          });
        }

        // 4) Map to MyStorySession
        const mapped: MyStorySession[] = sessionRows.map((row: Record<string, unknown>) => {
          const dramaId = String(row.drama_id);
          const dramaInfo = dramaMap.get(dramaId);
          const rawStatus = String(row.status || 'not_started');
          // Normalize status: only 'active' | 'not_started' (no 'completed')
          const normalizedStatus: 'active' | 'not_started' =
            rawStatus === 'active' ? 'active' : 'not_started';

          return {
            id: String(row.id),
            drama_id: dramaId,
            drama_name: dramaInfo?.name || '未知剧本',
            drama_cover: dramaInfo?.cover || '/drama-cover-1.jpg',
            message_count: messageCounts.get(String(row.id)) || 0,
            status: normalizedStatus,
            started_at: String(row.started_at || ''),
          };
        });

        setSessions(mapped);
      } catch (e) {
        console.error('Session load error:', e);
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    }

    loadSessions();
  }, [user]);

  /* Filtered dramas — removed '已解锁' filter since all are unlocked */
  const filteredDramas = useMemo(() => {
    if (activeFilter === '全部') return dramas;
    if (activeFilter === '热门') return [...dramas].sort((a, b) => b.ratingCount.localeCompare(a.ratingCount));
    return dramas.filter((d) => d.genre === activeFilter);
  }, [activeFilter, dramas]);

  /* ── Handle enter drama ── */
  const handleEnterDrama = async (dramaId?: string, existingSessionId?: string | null) => {
    if (!dramaId) return;
    if (!isAuthenticated) {
      toast('请先登录以参与剧情', {
        description: '登录后可以解锁并体验剧情',
        icon: <Sparkles size={16} className="text-pink-400" />,
      });
      return;
    }

    // If there's an existing session, go directly to it
    if (existingSessionId) {
      navigate(`/drama-space/${existingSessionId}`);
      return;
    }

    // Create new session via edge function
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { navigate('/auth'); return; }

      const res = await fetch(`${EDGE_FUNCTIONS_URL}/drama-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', drama_id: dramaId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.session?.id) {
        navigate(`/drama-space/${data.session.id}`);
      }
    } catch (e: any) {
      toast('进入剧情失败', { description: e.message, icon: <Sparkles size={16} className="text-red-400" /> });
    }
  };

  /* ── Handle restart drama (with confirmation dialog) ── */
  const handleRestart = async (dramaId: string) => {
    if (!confirm('重新开始将清空该剧本的所有聊天记录，确定吗？')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { navigate('/auth'); return; }

      const res = await fetch(`${EDGE_FUNCTIONS_URL}/drama-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', drama_id: dramaId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.session?.id) {
        navigate(`/drama-space/${data.session.id}`);
      }
    } catch (e: any) {
      toast('重新开始失败: ' + e.message);
    }
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
              {t('drama.title')}
            </h2>
          </div>

          {/* Right: Drama count badge */}
          <motion.span
            className="px-3 py-1 rounded-full text-[12px] font-semibold tracking-wider text-pink-500 bg-pink-50 border border-pink-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            共 {dramas.length} 个剧本
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
            {t('drama.plaza')}
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
            {t('drama.myDrama')}
          </button>
        </motion.div>
      </div>

      {/* ── Auth Banner ── */}
      {!isAuthenticated && (
        <div className="px-8">
          <AuthBanner />
        </div>
      )}

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
              {dramas.length > 0 && (
              <motion.div
                className="relative w-full h-[240px] rounded-3xl overflow-hidden mb-6 group cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                onClick={() => handleEnterDrama(dramas[0]?.id)}
              >
                <DramaCoverImage
                  drama={dramas[0]}
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
                    {t('drama.recommended')}
                  </span>
                  <h1 className="font-display text-[36px] text-white mb-2 leading-tight">
                    {dramas[0].name}
                  </h1>
                  <p className="text-[15px] text-white/80 leading-relaxed mb-4 line-clamp-2">
                    {dramas[0].description}
                  </p>
                  <div className="flex items-center gap-4 text-[13px] text-white/70 mb-4">
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-[#D4AF37] fill-[#D4AF37]" />
                      {dramas[0].rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {dramas[0].ratingCount} {t('drama.peoplePlayed')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles size={14} />
                      {t('drama.freeUnlock')}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnterDrama(dramas[0]?.id);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-white text-pink-500 font-semibold text-[14px]
                      hover:bg-pink-50 transition-all duration-150 w-fit shadow-md active:scale-95"
                  >
                    {t('drama.start')}
                  </button>
                </div>
              </motion.div>
              )}

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
                      /* Removed: grayscale when locked */
                      className="group rounded-2xl overflow-hidden bg-white border border-pink-100 transition-all duration-200 hover:shadow-lg hover:-translate-y-1.5"
                    >
                      {/* Cover Image — no lock overlay, always clickable */}
                      <div
                        className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                        onClick={() => handleEnterDrama(drama.id)}
                      >
                        <DramaCoverImage
                          drama={drama}
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

                        {/* Info overlay at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="font-body text-[16px] font-semibold text-white leading-snug mb-1 line-clamp-2">
                            {drama.name}
                          </h4>
                          <div className="flex items-center gap-2 text-white/70">
                            <Star size={12} className="text-[#D4AF37] fill-[#D4AF37]" />
                            <span className="text-[12px]">{drama.rating}</span>
                            <span className="text-[11px] text-white/50">{drama.ratingCount}{t('drama.peoplePlayed')}</span>
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
                          {/* Always show "进入剧情" button — all unlocked */}
                          <button
                            onClick={() => handleEnterDrama(drama.id)}
                            className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white
                              accent-gradient hover:brightness-110 transition-all duration-150
                              shadow-sm active:scale-95"
                          >
                            进入剧情
                          </button>
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
              {/* Stats summary — only "进行中" and "未开始", no "已完成" */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-pink-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={18} className="text-pink-400" />
                    <span className="text-[13px] text-[#6B5B6E]">总体验剧情</span>
                  </div>
                  <span className="font-number text-[32px] font-bold text-[#2D1B2E]">
                    {sessions.length}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-pink-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Play size={18} className="text-amber-500" />
                    <span className="text-[13px] text-[#6B5B6E]">{t('drama.inProgress')}</span>
                  </div>
                  <span className="font-number text-[32px] font-bold text-[#2D1B2E]">
                    {sessions.filter((s) => s.status === 'active').length}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-pink-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={18} className="text-pink-400" />
                    <span className="text-[13px] text-[#6B5B6E]">未开始</span>
                  </div>
                  <span className="font-number text-[32px] font-bold text-[#2D1B2E]">
                    {sessions.filter((s) => s.status === 'not_started').length}
                  </span>
                </div>
              </div>

              {/* Loading state */}
              {sessionsLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-200 border-t-pink-500" />
                </div>
              )}

              {/* Empty state */}
              {!sessionsLoading && sessions.length === 0 && (
                <motion.div
                  className="text-center py-16 bg-white rounded-2xl border border-pink-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <BookOpen size={48} className="text-pink-200 mx-auto mb-4" />
                  <p className="text-[16px] text-[#6B5B6E] font-body mb-2">还没有剧情记录</p>
                  <p className="text-[13px] text-[#A093A5] mb-6">去剧本广场选择一个剧本开始体验吧</p>
                  <button
                    onClick={() => setActiveView('plaza')}
                    className="px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white
                      accent-gradient hover:brightness-110 transition-all duration-150 shadow-sm active:scale-95"
                  >
                    去剧本广场
                  </button>
                </motion.div>
              )}

              {/* Session list */}
              {!sessionsLoading && sessions.length > 0 && (
                <div className="space-y-4">
                  {sessions.map((session, idx) => (
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
                          src={session.drama_cover}
                          alt={session.drama_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/drama-cover-1.jpg'; }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-body text-[18px] font-semibold text-[#2D1B2E]">
                              {session.drama_name}
                            </h3>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                session.status === 'active'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-pink-100 text-pink-600'
                              )}
                            >
                              {session.status === 'active' ? t('drama.inProgress') : '未开始'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[12px] text-[#A093A5]">
                            <span className="flex items-center gap-1">
                              <MessageCircle size={12} />
                              {session.message_count} 条对话
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {session.started_at
                                ? new Date(session.started_at).toLocaleDateString('zh-CN')
                                : '--'}
                            </span>
                          </div>
                        </div>

                        {/* Status hint */}
                        <p className="text-[13px] text-[#6B5B6E]">
                          {session.status === 'active'
                            ? '剧情进行中，点击继续体验'
                            : '剧本尚未开始，点击开始体验'}
                        </p>

                        {/* Actions: Continue + Restart */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEnterDrama(session.drama_id, session.id)}
                            className="px-5 py-2 rounded-xl text-[13px] font-semibold text-white
                              accent-gradient hover:brightness-110 transition-all duration-150
                              shadow-sm active:scale-95 flex items-center gap-1.5"
                          >
                            {session.status === 'active' ? (
                              <>
                                <Play size={14} />
                                继续剧情
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                开始体验
                              </>
                            )}
                          </button>

                          {/* Restart button with confirmation dialog */}
                          <button
                            onClick={() => handleRestart(session.drama_id)}
                            className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#6B5B6E]
                              border border-pink-200 hover:bg-pink-50 hover:text-pink-600
                              transition-all duration-150 flex items-center gap-1.5 active:scale-95"
                          >
                            <RotateCcw size={14} />
                            重新开始
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
