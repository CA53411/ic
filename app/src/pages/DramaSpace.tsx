/**
 * DramaSpace.tsx — Independent Drama Space
 * Each drama is a completely separate virtual world.
 * Users enter a scripted scene and role-play with their companion.
 * Fully independent from Chat — separate message table, separate UI, separate everything.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Loader2, Sparkles, BookOpen,
  Play, Square, Scroll, Wand2, Clock, Zap,
  Pause, RotateCcw, Theater, Feather,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { supabase, EDGE_FUNCTIONS_URL } from '@/lib/supabase';

const easeSmooth = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

interface DramaMessage {
  id: string;
  session_id: string;
  speaker: 'user' | 'companion' | 'narrator';
  content: string;
  created_at: string;
}

interface DramaInfo {
  id: string;
  name: string;
  description: string;
  scene_setting: string;
  cover_image_path: string | null;
  drama_prompt: string;
}

interface CompanionInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  gender: string;
}

interface SessionInfo {
  id: string;
  status: string;
  started_at: string;
}

export default function DramaSpace() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { t } = useI18n();

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drama, setDrama] = useState<DramaInfo | null>(null);
  const [companion, setCompanion] = useState<CompanionInfo | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<DramaMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSceneIntro, setShowSceneIntro] = useState(true);
  const [energy, setEnergy] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [typingDots, setTypingDots] = useState(false);

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Load session data ──
  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        setLoading(true);
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) { navigate('/auth'); return; }

        const res = await fetch(`${EDGE_FUNCTIONS_URL}/drama-session`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', session_id: sessionId }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setDrama(data.drama);
        setCompanion(data.companion);
        setSession(data.session);
        setMessages(data.messages || []);

        // Get energy
        const { data: acctRows } = await supabase.from('energy_accounts')
          .select('balance').limit(1);
        setEnergy(acctRows?.[0]?.balance || 0);

        // Hide scene intro after 5 seconds
        setTimeout(() => setShowSceneIntro(false), 5000);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, navigate]);

  // ── Auto-resize textarea ──
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(120, el.scrollHeight) + 'px';
  }, [inputValue]);

  // ── Send message ──
  const handleSend = async () => {
    const text = inputValue.trim();
    const {t} = useI18n();
    if (!text || isStreaming || !sessionId) return;

    if (energy < 30) {
      setError({t('chat.energyLow')} || '能量不足，请先充值');
      return;
    }

    setInputValue('');
    setIsStreaming(true);
    streamingRef.current = true;

    // Optimistic add user message
    const userMsg: DramaMessage = {
      id: 'temp-' + Date.now(), session_id: sessionId,
      speaker: 'user', content: text, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${EDGE_FUNCTIONS_URL}/drama-chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Drama chat failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let replyText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              if (data.startsWith('[ERROR]')) throw new Error(data.slice(7));
              replyText += data;
              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== 'streaming');
                return [...filtered, {
                  id: 'streaming', session_id: sessionId,
                  speaker: 'companion', content: replyText,
                  created_at: new Date().toISOString(),
                }];
              });
            }
          }
        }
      }

      // Update energy
      setEnergy(prev => Math.max(0, prev - 30));

      // Refresh messages
      const refreshRes = await fetch(`${EDGE_FUNCTIONS_URL}/drama-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', session_id: sessionId }),
      });
      const refreshData = await refreshRes.json();
      if (refreshData.messages) {
        setMessages(refreshData.messages);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsStreaming(false);
      streamingRef.current = false;
    }
  };

  // ── Complete drama ──
  const handleComplete = () => {
    navigate('/drama');
  };

  // ── Restart drama ──
  const handleRestart = async () => {
    if (!session || !confirm('重新开始将清空该剧本的所有聊天记录，确定吗？')) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${EDGE_FUNCTIONS_URL}/drama-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', drama_id: drama!.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.session?.id) {
        navigate(`/drama-space/${data.session.id}`);
        window.location.reload();
      }
    } catch (e: any) {
      setError('重新开始失败: ' + e.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isPaused) handleSend(); }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1025] to-[#2a1a3a]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-pink-400 mx-auto mb-4" />
          <p className="text-white/70">正在进入剧情空间...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1025] to-[#2a1a3a]">
        <div className="text-center max-w-md px-4">
          <Sparkles className="w-12 h-12 text-pink-400 mx-auto mb-4" />
          <p className="text-white/90 mb-4">{error}</p>
          <button onClick={() => navigate('/drama')}
            className="px-6 py-2 bg-pink-400/20 text-pink-300 rounded-full hover:bg-pink-400/30 transition-all">
            <ArrowLeft className="w-4 h-4 inline mr-2" />返回剧情广场
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#1a1025] via-[#1e1530] to-[#2a1a3a] relative overflow-hidden">
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* ── Scene Introduction Overlay ── */}
      <AnimatePresence>
        {showSceneIntro && drama && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, delay: 4 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #0d0a1a 0%, #1a1025 40%, #2a1a3a 100%)' }}
          >
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-pink-400/30 rounded-full"
                  initial={{ opacity: 0, x: Math.random() * 100 + '%', y: '100%' }}
                  animate={{ opacity: [0, 0.8, 0], y: '-10%' }}
                  transition={{ duration: 3 + Math.random() * 4, delay: Math.random() * 2, repeat: Infinity }}
                  style={{ left: Math.random() * 100 + '%' }}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 1.2, ease: easeSmooth }}
              className="text-center max-w-xl px-8 relative z-10"
            >
              {/* Theater icon */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <Theater className="w-12 h-12 text-pink-400/50 mx-auto mb-6" />
              </motion.div>

              {/* Drama name */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-4xl font-bold text-white mb-4 font-display tracking-wide"
                style={{ textShadow: '0 0 40px rgba(255,105,180,0.3)' }}
              >
                {drama.name}
              </motion.h1>

              {/* Divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="w-24 h-px bg-gradient-to-r from-transparent via-pink-400/50 to-transparent mx-auto mb-5"
              />

              {/* Scene setting */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.8 }}
                className="text-purple-200/70 text-base leading-relaxed mb-3 italic"
              >
                {drama.scene_setting}
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.8 }}
                className="text-white/40 text-sm leading-relaxed"
              >
                {drama.description}
              </motion.p>

              {/* Drama prompt teaser */}
              {drama.drama_prompt && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2, duration: 1 }}
                  className="text-white/30 text-xs mt-6 leading-relaxed max-w-md mx-auto"
                >
                  {drama.drama_prompt.substring(0, 80)}...
                </motion.p>
              )}

              {/* Skip button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 0.5 }}
                onClick={() => setShowSceneIntro(false)}
                className="mt-8 text-white/20 hover:text-white/50 text-xs transition-colors"
              >
                点击跳过开场
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-md bg-[#1a1025]/80 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/drama')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-all text-white/60 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Scroll className="w-4 h-4 text-pink-400" />
              <span className="text-white font-medium text-sm">{drama?.name}</span>
            </div>
            <p className="text-white/40 text-xs">{companion?.nickname} · {t('drama.immersive') || '剧情模式'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Message count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Feather className="w-3 h-3 text-purple-400/60" />
            <span className="text-white/60 text-xs">{messages.filter(m => m.speaker !== 'narrator').length}</span>
          </div>
          {/* Energy */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-white/80 text-xs font-medium">{energy}</span>
          </div>
          {/* Pause/Resume */}
          <button onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 text-xs">
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          {/* Restart drama */}
          <button onClick={handleRestart}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all text-white/60 hover:text-purple-300 text-xs"
            title="重新开始">
            <RotateCcw className="w-3 h-3" />
          </button>
          {/* End drama */}
          <button onClick={handleComplete}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all text-white/60 hover:text-red-300 text-xs">
            <Square className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Pause Overlay ── */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-[#1a1025]/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center">
              <Pause className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/50 text-sm mb-4">剧情已暂停</p>
              <button onClick={() => setIsPaused(false)}
                className="px-5 py-2 bg-pink-500/20 text-pink-300 rounded-full text-sm hover:bg-pink-500/30 transition-all">
                <Play className="w-4 h-4 inline mr-1.5" />继续剧情
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages Area ── */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 chat-scrollbar">
        {messages.map((msg, idx) => (
          <DramaMessageBubble key={msg.id || idx} message={msg} companion={companion} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 backdrop-blur-md bg-[#1a1025]/80">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isPaused ? '剧情已暂停...' : (t('drama.typeInScene') || '在剧情中输入你的台词...')}
              rows={1}
              disabled={isPaused}
              className={`w-full px-4 py-2.5 rounded-xl border text-white/90 text-sm placeholder:text-white/30 focus:outline-none transition-all resize-none max-h-[100px] leading-relaxed ${
                isPaused
                  ? 'bg-white/[0.02] border-white/5 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 focus:border-pink-400/50 focus:bg-white/10'
              }`}
            />
          </div>
          <motion.button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || isPaused}
            whileHover={{ scale: inputValue.trim() && !isPaused ? 1.05 : 1 }}
            whileTap={{ scale: inputValue.trim() && !isPaused ? 0.95 : 1 }}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              inputValue.trim() && !isPaused
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/25'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          </motion.button>
        </div>
        <p className="text-center text-white/20 text-xs mt-2">
          <Clock className="w-3 h-3 inline mr-1" />
          {t('drama.energyCost') || '每条消息消耗 30 能量'}
        </p>
      </div>
    </div>
  );
}

// ── Drama Message Bubble ──
function DramaMessageBubble({ message, companion }: { message: DramaMessage; companion: CompanionInfo | null }) {
  const isNarrator = message.speaker === 'narrator';
  const isUser = message.speaker === 'user';
  const isCompanion = message.speaker === 'companion';

  if (isNarrator) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-4 text-center"
      >
        <div className="inline-block max-w-[85%]">
          <div className="px-5 py-3 rounded-lg bg-purple-500/10 border border-purple-400/20">
            <div className="text-purple-300/60 text-xs mb-1 flex items-center justify-center gap-1">
              <BookOpen className="w-3 h-3" />旁白
            </div>
            <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }} />
          </div>
        </div>
      </motion.div>
    );
  }

  if (isUser) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end my-3">
        <div className="max-w-[75%]">
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/20">
            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Companion
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 my-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden ring-2 ring-purple-400/30 mt-1">
        <img src={companion?.avatar_url || '/default-avatar.jpg'} alt={companion?.nickname || ''}
          className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.jpg'; }} />
      </div>
      <div className="max-w-[75%]">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-purple-300/60 text-xs font-medium">{companion?.nickname || 'Companion'}</span>
        </div>
        <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10">
          <div className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }} />
        </div>
      </div>
    </motion.div>
  );
}

// Format content: **bold**, *italic*, etc.
function formatContent(content: string): string {
  return content
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/60 italic">$1</em>');
}
