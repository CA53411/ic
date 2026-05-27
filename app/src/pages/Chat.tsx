import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';
import {
  ChevronLeft,
  Send,
  Plus,
  Settings,
  MoreVertical,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  PawPrint,
  LogIn,
} from 'lucide-react';
import { supabase, fetchEdgeFunction } from '@/lib/supabase';
import { toast } from 'sonner';

/* ─── Types ─── */
interface ChatMessage {
  id: string;
  speaker: 'user' | 'companion';
  content: string;
  timestamp: Date;
  emotionLabel?: string;
  isStreaming?: boolean;
}

interface Companion {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
}

/* ─── Helpers ─── */
function formatTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  if (isToday) return `${hours}:${mins}`;
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Save a message to stm_messages (fallback when Edge Function fails) */
async function saveMessageToDB(
  userId: string,
  companionId: string,
  speaker: 'user' | 'companion',
  content: string,
  emotionLabel?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('stm_messages')
      .insert({
        user_id: userId,
        companion_id: companionId,
        speaker,
        content,
        emotion_label: emotionLabel || null,
        message_type: 'text',
        edit_count: 0,
        is_deleted: false,
      })
      .select('id')
      .single();
    if (error) {
      console.error('[Chat] Save message error:', error);
      return null;
    }
    return data?.id || null;
  } catch (e) {
    console.error('[Chat] Save message exception:', e);
    return null;
  }
}



/** Typing dots - isolated perpetual animation */
const TypingDots = React.memo(function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-pink-400"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

/** Streaming cursor - isolated perpetual animation */
const StreamingCursor = React.memo(function StreamingCursor() {
  return (
    <motion.span
      className="inline-block w-2 h-4 bg-pink-400 ml-0.5 align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
    />
  );
});

/* ─── Right Preview Panel ─── */
function RightPreviewPanel({ companion, t }: { companion?: Companion | null; t: (key: string) => string }) {
  const [activePreviewTab, setActivePreviewTab] = useState<'live2d' | 'pet'>('live2d');

  return (
    <div className="w-[240px] border-l border-pink-100 bg-pink-50/50 flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex items-center border-b border-pink-100 flex-shrink-0">
        <button
          onClick={() => setActivePreviewTab('live2d')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-body font-medium transition-colors ${
            activePreviewTab === 'live2d'
              ? 'text-pink-500 border-b-2 border-pink-400'
              : 'text-[#A093A5] hover:text-[#6B5B6E]'
          }`}
        >
          <Sparkles size={14} />
          Live2D
        </button>
        <button
          onClick={() => setActivePreviewTab('pet')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-body font-medium transition-colors ${
            activePreviewTab === 'pet'
              ? 'text-pink-500 border-b-2 border-pink-400'
              : 'text-[#A093A5] hover:text-[#6B5B6E]'
          }`}
        >
          <PawPrint size={14} />
          Pet
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {activePreviewTab === 'live2d' ? (
            <motion.div
              key="live2d"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-pink-100 to-pink-50 border border-pink-200 mb-4 flex items-center justify-center">
                <img
                  src="/live2d-preview.jpg"
                  alt="Live2D Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Sparkles size={48} className="text-pink-200" />
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-500 text-[11px] font-body font-semibold mb-3">
                {t('common.comingSoon')}
              </span>
              <p className="text-[12px] text-[#A093A5] font-body text-center leading-relaxed">
                Live2D interactive avatar will be available in a future update.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="pet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-orange-50 to-pink-50 border border-pink-200 mb-4 flex items-center justify-center">
                <img
                  src="/pet-preview.jpg"
                  alt="Pet Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <PawPrint size={48} className="text-pink-200" />
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-500 text-[11px] font-body font-semibold mb-3">
                {t('common.comingSoon')}
              </span>
              <p className="text-[12px] text-[#A093A5] font-body text-center leading-relaxed">
                Virtual pet companion will be available in a future update.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Login Prompt ─── */
function LoginPrompt({ t }: { t: (key: string) => string }) {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <LogIn size={48} className="text-pink-300 mb-4" />
      <p className="text-[18px] text-[#2D1B2E] font-body font-semibold mb-2">{t('common.login')}</p>
      <p className="text-[13px] text-[#A093A5] font-body mb-6 text-center max-w-[300px]">
        {t('chat.loginToChat')}
      </p>
      <button
        onClick={() => navigate('/auth')}
        className="flex items-center gap-2 px-6 py-3 rounded-xl accent-gradient text-white text-[14px] font-body font-semibold hover:brightness-110 transition-all duration-150"
      >
        <LogIn size={16} />
        {t('common.login')}
      </button>
    </div>
  );
}

/* ─── Main Chat Component ─── */
export default function Chat() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompanion, setHasCompanion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingRef = useRef(false);

  const companionName = companion?.nickname || '伴侣';
  const companionAvatar = companion?.avatar_url || '/default-avatar.jpg';

  // Load companion and messages on mount
  useEffect(() => {
    initializeChat();
  }, []);

  async function initializeChat() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);

      // Load companion
      const { data: comp } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!comp) {
        setHasCompanion(false);
        setLoading(false);
        return;
      }

      setCompanion(comp as Companion);
      setHasCompanion(true);

      // Load messages
      await loadMessages(comp as Companion);
    } catch (e) {
      console.error('Chat init error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(comp: Companion) {
    try {
      const { data: msgs } = await supabase
        .from('stm_messages')
        .select('id, speaker, content, emotion_label, created_at')
        .eq('companion_id', comp.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (msgs && msgs.length > 0) {
        setMessages(
          msgs.map((m: Record<string, unknown>) => ({
            id: (m.id as string) || generateId(),
            speaker: m.speaker === 'user' ? 'user' : 'companion',
            content: (m.content as string) || '',
            emotionLabel: (m.emotion_label as string) || undefined,
            timestamp: new Date((m.created_at as string) || Date.now()),
          }))
        );
      } else {
        // Show welcome message
        setMessages([
          {
            id: 'welcome',
            speaker: 'companion',
            content: `你好呀！我是${comp.nickname || '伴侣'}，很高兴认识你～`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      // Fallback to welcome message
      setMessages([
        {
          id: 'welcome',
          speaker: 'companion',
          content: `你好呀！很高兴见到你～`,
          timestamp: new Date(),
        },
      ]);
    }
  }

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, isTyping, streamingText, scrollToBottom]);

  // Handle scroll to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  // Quick reply options
  const quickReplies = [
    t('chat.quickReply1') || '今天心情很好呢～',
    t('chat.quickReply2') || '想听听你的故事',
    t('chat.quickReply3') || '最近有什么好玩的吗？',
    t('chat.quickReply4') || '你喜欢什么样的音乐？',
  ];
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${newHeight}px`;
  }, [inputValue]);

  // Fallback: SSE streaming simulation (used when Edge Function fails)
  const streamResponse = useCallback((text: string) => {
    streamingRef.current = true;
    let idx = 0;
    setStreamingText('');

    const streamChar = () => {
      if (!streamingRef.current) return;
      if (idx < text.length) {
        setStreamingText(text.slice(0, idx + 1));
        idx++;
        // Variable speed: slightly random 20-50ms per character
        const delay = 20 + Math.random() * 35;
        setTimeout(streamChar, delay);
      } else {
        // Streaming complete, add to messages
        streamingRef.current = false;
        setStreamingText('');
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            speaker: 'companion',
            content: text,
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      }
    };

    streamChar();
  }, []);

  // Real SSE streaming via Edge Function
  async function streamViaEdgeFunction(content: string) {
    try {
      const response = await fetchEdgeFunction('chat-stream', {
        method: 'POST',
        body: JSON.stringify({
          message: content,
          companion_id: companion?.id,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          toast.error('电量不足，请充值');
        } else {
          toast.error(t('chat.sendFailed'));
        }
        setIsTyping(false);
        return false;
      }

      // Read SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';
      const aiId = 'ai-' + Date.now();

      // Add empty AI message
      setMessages((prev) => [
        ...prev,
        {
          id: aiId,
          speaker: 'companion',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            if (data.startsWith('[ERROR]')) {
              toast.error('对话出错: ' + data.slice(7));
              break;
            }
            aiContent += data;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, content: aiContent } : m
              )
            );
          }
        }
      }

      // Mark streaming as done
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, isStreaming: false } : m))
      );
      return true;
    } catch {
      toast.error(t('chat.networkError'));
      return false;
    }
  }

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || streamingRef.current) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      speaker: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    // Show typing indicator, then stream
    setIsTyping(true);

    // Try real SSE API first
    const success = await streamViaEdgeFunction(trimmed);
    if (success) {
      setIsTyping(false);
    } else {
      // Fallback: save user message locally, then show fallback AI reply
      // Note: Edge Function normally saves both messages.
      // In fallback mode we save user msg here; AI reply is display-only.
      if (companion) {
        await saveMessageToDB(
          companion.user_id,
          companion.id,
          'user',
          trimmed
        );
      }
      // Fallback to simulated streaming
      const fallbackResponses = [
        '那真是太好了！我也好期待春天的到来呢～说到樱花，你知道吗？樱花的花期虽然只有短短一周，但正因为短暂才显得格外美丽。就像我们的每一次对话，都很珍贵呢 💕',
        '嘿嘿，谢谢你愿意陪我聊天～其实每次收到你的消息，我都会偷偷开心好一会儿呢！',
        '听你这么说，我也感觉心情变好了呢！你有一种神奇的力量，能让周围的人都感到温暖 ✨',
        '嗯嗯，我懂你的感受。不管发生什么，我都会在这里陪着你的。你不是一个人哦～',
      ];
      const response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      setTimeout(() => {
        setIsTyping(false);
        streamResponse(response);
      }, 1200);
    }
  }, [inputValue, streamResponse]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickReply = useCallback((text: string) => {
    setInputValue(text);
    textareaRef.current?.focus();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamingRef.current = false;
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
          <div className="text-[#A093A5] font-body text-[14px]">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col relative">
        {/* Breathing gradient background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(135deg, #FFF8FA 0%, #FFF0F3 20%, #FFE8EE 40%, #FFD4E0 60%, #FFC9D8 80%, #FFB6C1 100%)',
            backgroundSize: '400% 400%',
            animation: 'breathing 10s ease-in-out infinite',
          }}
        />
        <LoginPrompt t={t} />
      </div>
    );
  }

  // No companion
  if (!hasCompanion) {
    return (
      <div className="h-screen flex flex-col relative">
        {/* Breathing gradient background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(135deg, #FFF8FA 0%, #FFF0F3 20%, #FFE8EE 40%, #FFD4E0 60%, #FFC9D8 80%, #FFB6C1 100%)',
            backgroundSize: '400% 400%',
            animation: 'breathing 10s ease-in-out infinite',
          }}
        />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <Sparkles size={48} className="text-pink-300 mb-4" />
          <p className="text-[18px] text-[#2D1B2E] font-body font-semibold mb-2">{t('chat.noCompanion')}</p>
          <p className="text-[13px] text-[#A093A5] font-body mb-6 text-center max-w-[300px]">
            {t('chat.noCompanionDesc')}
          </p>
          <button
            onClick={() => window.location.href = '/customize'}
            className="flex items-center gap-2 px-6 py-3 rounded-xl accent-gradient text-white text-[14px] font-body font-semibold hover:brightness-110 transition-all duration-150"
          >
            <Sparkles size={16} />
            {t('chat.goCustomize')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Breathing gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(135deg, #FFF8FA 0%, #FFF0F3 20%, #FFE8EE 40%, #FFD4E0 60%, #FFC9D8 80%, #FFB6C1 100%)',
          backgroundSize: '400% 400%',
          animation: 'breathing 10s ease-in-out infinite',
        }}
      />

      {/* Floating Orbs */}
      <div
        className="absolute -z-10 pointer-events-none"
        style={{
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'rgba(255,182,193,0.12)',
          filter: 'blur(100px)',
          top: '5%',
          left: '5%',
          animation: 'float-orb 16s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -z-10 pointer-events-none"
        style={{
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'rgba(232,160,191,0.1)',
          filter: 'blur(120px)',
          bottom: '10%',
          right: '8%',
          animation: 'float-orb 14s ease-in-out infinite 4s',
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0 h-14 flex items-center justify-between px-5 backdrop-blur-md border-b border-pink-100/30 chat-surface"
          style={{ background: 'rgba(255,245,247,0.7)' }}
        >
          {/* Left: Back + Avatar + Name */}
          <div className="flex items-center gap-3">
            <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-pink-50 transition-colors">
              <ChevronLeft size={20} className="text-plum-800" />
            </button>
            <img
              src={companionAvatar}
              alt={companionName}
              className="w-9 h-9 rounded-full object-cover shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-plum-900 leading-tight">
                {companionName}
              </span>
              <span className="text-xs text-muted-plum leading-tight">
                {isTyping ? (
                  <span className="flex items-center gap-1">
                    {t('chat.typing')}
                    <span className="inline-flex">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1 h-1 rounded-full bg-muted-plum mx-[1px]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </span>
                  </span>
                ) : streamingRef.current ? (
                  `${t('chat.typing')}...`
                ) : (
                  t('common.online')
                )}
              </span>
            </div>
          </div>

          {/* Right: Panel toggle + Settings + Menu */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="hidden xl:flex w-9 h-9 items-center justify-center rounded-full hover:bg-pink-50 transition-colors text-plum-800"
              title={panelOpen ? t('chat.panelCollapse') : t('chat.panelExpand')}
            >
              {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-pink-50 transition-colors text-plum-800">
              <Settings size={18} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-pink-50 transition-colors text-plum-800">
              <MoreVertical size={18} />
            </button>
          </div>
        </motion.div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-4 min-h-0 chat-scrollbar"
        >
          {/* Date separator */}
          <div className="flex items-center justify-center gap-3 my-4">
            <div className="flex-1 h-px bg-pink-100" />
            <span className="text-xs text-muted-plum">{t('common.today')}</span>
            <div className="flex-1 h-px bg-pink-100" />
          </div>

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg) =>
              msg.speaker === 'companion' ? (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
                  }}
                  className="flex items-end gap-2 mb-1"
                >
                  <img
                    src={companionAvatar}
                    alt={companionName}
                    className="w-7 h-7 rounded-full object-cover shadow-sm flex-shrink-0 self-end mb-5"
                  />
                  <div className="max-w-[70%] min-w-0">
                    <div
                      className="rounded-tr-[20px] rounded-br-[20px] rounded-tl-[4px] rounded-bl-[20px] px-[18px] py-[14px] shadow-sm text-[15px] text-plum-900 leading-relaxed break-words chat-msg-bubble"
                      style={{ backdropFilter: 'blur(4px)' }}
                    >
                      {msg.content}
                      {msg.isStreaming && <StreamingCursor />}
                    </div>
                    <div className="flex items-center gap-2 ml-2 mt-1">
                      <span className="text-[11px] text-muted-plum">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.emotionLabel && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full emotion-badge"
                        >
                          {msg.emotionLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
                  }}
                  className="flex justify-end mb-1"
                >
                  <div className="max-w-[70%] min-w-0">
                    <div
                      className="rounded-tl-[20px] rounded-bl-[20px] rounded-tr-[20px] rounded-br-[4px] px-[18px] py-[14px] shadow-sm text-[15px] text-plum-900 leading-relaxed break-words chat-msg-bubble-user"
                    >
                      {msg.content}
                    </div>
                    <span className="text-[11px] text-muted-plum mr-2 mt-1 block text-right">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex items-end gap-2 mb-1"
              >
                <img
                  src={companionAvatar}
                  alt={companionName}
                  className="w-7 h-7 rounded-full object-cover shadow-sm flex-shrink-0 self-end mb-5"
                />
                <div
                  className="rounded-tr-[20px] rounded-br-[20px] rounded-tl-[4px] rounded-bl-[20px] px-4 py-3 shadow-sm chat-msg-bubble"
                  style={{ backdropFilter: 'blur(4px)' }}
                >
                  <TypingDots />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Streaming message (fallback mode) */}
          <AnimatePresence>
            {streamingText && (
              <motion.div
                key="streaming"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-end gap-2 mb-1"
              >
                <img
                  src={companionAvatar}
                  alt={companionName}
                  className="w-7 h-7 rounded-full object-cover shadow-sm flex-shrink-0 self-end mb-5"
                />
                <div className="max-w-[70%] min-w-0">
                  <div
                    className="rounded-tr-[20px] rounded-br-[20px] rounded-tl-[4px] rounded-bl-[20px] px-[18px] py-[14px] shadow-sm text-[15px] text-plum-900 leading-relaxed break-words chat-msg-bubble"
                    style={{ backdropFilter: 'blur(4px)' }}
                  >
                    {streamingText}
                    <StreamingCursor />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-[152px] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-pink-400 text-white flex items-center justify-center shadow-lg hover:bg-pink-500 transition-colors z-10"
            >
              <ChevronDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Bottom Input Area: Quick Reply Chips + Input Bar ── */}
        <div
          className="flex-shrink-0 backdrop-blur-md border-t border-pink-100/30 chat-surface"
          style={{ background: 'rgba(255,245,247,0.85)' }}
        >
          {/* Quick Reply Chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="px-5 pt-2.5 pb-1 overflow-x-auto scrollbar-hide"
          >
            <div className="flex gap-2">
              {quickReplies.map((text, i) => (
                <motion.button
                  key={text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                  onClick={() => handleQuickReply(text)}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-white/70 text-plum-800 border border-pink-100 hover:bg-pink-50 hover:scale-[1.04] active:scale-[0.97] transition-all duration-150 whitespace-nowrap backdrop-blur-sm"
                >
                  {text}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Input Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="px-5 pb-3 pt-1"
          >
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
              {/* Attachment button */}
              <button className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-pink-50 transition-colors text-plum-800/60 mb-0.5">
                <Plus size={20} />
              </button>

              {/* Textarea */}
              <div className="flex-1 relative min-w-0">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.placeholder')}
                  rows={1}
                  className="w-full px-5 py-2.5 rounded-full bg-white border border-pink-100 text-[15px] text-plum-900 placeholder:text-muted-plum focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200 resize-none max-h-[120px] leading-relaxed"
                />
              </div>

              {/* Send button */}
              <motion.button
                onClick={handleSend}
                disabled={!inputValue.trim() || streamingRef.current}
                whileHover={{ scale: inputValue.trim() ? 1.05 : 1 }}
                whileTap={{ scale: inputValue.trim() ? 0.95 : 1 }}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 mb-0.5 ${
                  inputValue.trim()
                    ? 'accent-gradient text-white hover:brightness-110 shadow-md'
                    : 'bg-pink-200 text-white/50 cursor-not-allowed'
                }`}
              >
                <Send size={18} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Preview Panel - Desktop only, collapsible */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
            className="hidden xl:flex flex-shrink-0 overflow-hidden"
          >
            <RightPreviewPanel companion={companion} t={t} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
