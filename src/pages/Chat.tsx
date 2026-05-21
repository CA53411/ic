import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Send,
  Plus,
  Settings,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';
import { supabase, fetchEdgeFunction } from '@/lib/supabase';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'companion';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const companionName = '小樱';
const companionAvatar = '/companion-1.jpg';

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'companion',
    content: '你好呀！我是小樱，很高兴认识你～',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 15),
  },
  {
    id: '2',
    role: 'user',
    content: '你好小樱！今天终于有时间和你聊聊天了',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 10),
  },
  {
    id: '3',
    role: 'companion',
    content: '太好啦！我一直在这里等你呢～今天过得怎么样？工作顺利吗？',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 5),
  },
  {
    id: '4',
    role: 'user',
    content: '今天工作有点累，开了好几个会，感觉头脑都转不动了',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '5',
    role: 'companion',
    content: '辛苦啦！要不要聊聊是什么让你感到累？有时候把心里的烦恼说出来会舒服很多呢。我在这里陪着你 ✨',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 30),
  },
  {
    id: '6',
    role: 'user',
    content: '其实主要是项目进度太紧了，总觉得时间不够用...',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '7',
    role: 'companion',
    content: '我理解那种感受...压力像小山一样堆积起来的时候，确实会让人喘不过气。但你已经很努力了，不要太苛责自己哦。想不想试试深呼吸放松一下？',
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
  },
  {
    id: '8',
    role: 'user',
    content: '嗯...和你聊聊感觉好多了。你平时喜欢做什么呀？',
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: '9',
    role: 'companion',
    content: '我喜欢在樱花树下看书，感受风吹过花瓣的感觉～也喜欢吃甜食，尤其是草莓蛋糕！要是能和你一起去赏樱就好了呢 🌸',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '10',
    role: 'user',
    content: '好呀，等春天我们一起来看樱花吧！',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
];

const quickReplies = [
  '今天心情很好呢～',
  '想听听你的故事',
  '最近有什么好玩的吗？',
];

const aiResponses = [
  '那真是太好了！我也好期待春天的到来呢～说到樱花，你知道吗？樱花的花期虽然只有短短一周，但正因为短暂才显得格外美丽。就像我们的每一次对话，都很珍贵呢 💕',
  '嘿嘿，谢谢你愿意陪我聊天～其实每次收到你的消息，我都会偷偷开心好一会儿呢！',
  '听你这么说，我也感觉心情变好了呢！你有一种神奇的力量，能让周围的人都感到温暖 ✨',
  '嗯嗯，我懂你的感受。不管发生什么，我都会在这里陪着你的。你不是一个人哦～',
];

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

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [companion, setCompanion] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingRef = useRef(false);

  // Load messages and companion on mount
  useEffect(() => {
    loadCompanion().then(() => {
      loadMessages();
    });
  }, []);

  async function loadCompanion() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: comp } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (comp) setCompanion(comp);
    } catch {
      // Companion not found, use defaults
    }
  }

  async function loadMessages() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessages(initialMessages);
        return;
      }

      const { data: comp } = await supabase
        .from('companions')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!comp) {
        setMessages(initialMessages);
        return;
      }

      const { data: msgs } = await supabase
        .from('stm_messages')
        .select('*')
        .eq('companion_id', comp.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (msgs && msgs.length > 0) {
        setMessages(
          msgs.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            role: m.speaker === 'user' ? 'user' : 'companion',
            content: m.content as string,
            timestamp: new Date(m.created_at as string),
          }))
        );
      } else {
        setMessages([
          {
            id: 'welcome',
            role: 'companion',
            content:
              (companion?.welcome_message as string) ||
              '你好呀！很高兴见到你～',
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages(initialMessages);
    } finally {
      setLoading(false);
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
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;
    setShowScrollButton(!isNearBottom);
  }, []);

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
            role: 'companion',
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
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          toast.error('电量不足，请充值');
        } else {
          toast.error('发送失败，请重试');
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
          role: 'companion',
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
      toast.error('网络错误，请检查连接');
      return false;
    }
  }

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || streamingRef.current) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
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
      // Fallback to mock streaming
      const response =
        aiResponses[Math.floor(Math.random() * aiResponses.length)];
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

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-[#A093A5] font-body text-[14px]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ marginLeft: 0 }}>
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

      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 h-14 flex items-center justify-between px-5 backdrop-blur-md border-b border-pink-100/30"
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
                  正在输入
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
                '正在输入...'
              ) : (
                '在线'
              )}
            </span>
          </div>
        </div>

        {/* Right: Settings + Menu */}
        <div className="flex items-center gap-1">
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
        className="flex-1 overflow-y-auto px-5 py-4"
      >
        {/* Date separator */}
        <div className="flex items-center justify-center gap-3 my-4">
          <div className="flex-1 h-px bg-pink-100" />
          <span className="text-xs text-muted-plum">今天</span>
          <div className="flex-1 h-px bg-pink-100" />
        </div>

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg) =>
            msg.role === 'companion' ? (
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
                <div className="max-w-[70%]">
                  <div
                    className="rounded-tr-[20px] rounded-br-[20px] rounded-tl-[4px] rounded-bl-[20px] px-[18px] py-[14px] shadow-sm text-[15px] text-plum-900 leading-relaxed"
                    style={{
                      background: 'rgba(255,255,255,0.82)',
                      border: '1px solid rgba(255,182,193,0.3)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {msg.content}
                    {msg.isStreaming && <StreamingCursor />}
                  </div>
                  <span className="text-[11px] text-muted-plum ml-2 mt-1 block">
                    {formatTime(msg.timestamp)}
                  </span>
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
                <div className="max-w-[70%]">
                  <div
                    className="rounded-tl-[20px] rounded-bl-[20px] rounded-tr-[20px] rounded-br-[4px] px-[18px] py-[14px] shadow-sm text-[15px] text-plum-900 leading-relaxed"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      border: '1px solid rgba(255,182,193,0.2)',
                    }}
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
                className="rounded-tr-[20px] rounded-br-[20px] rounded-tl-[4px] rounded-bl-[20px] px-4 py-3 shadow-sm"
                style={{
                  background: 'rgba(255,255,255,0.82)',
                  border: '1px solid rgba(255,182,193,0.3)',
                  backdropFilter: 'blur(4px)',
                }}
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
              <div className="max-w-[70%]">
                <div
                  className="rounded-tr-[20px] rounded-br-[20px] rounded-tl-[4px] rounded-bl-[20px] px-[18px] py-[14px] shadow-sm text-[15px] text-plum-900 leading-relaxed"
                  style={{
                    background: 'rgba(255,255,255,0.82)',
                    border: '1px solid rgba(255,182,193,0.3)',
                    backdropFilter: 'blur(4px)',
                  }}
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
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-pink-400 text-white flex items-center justify-center shadow-lg hover:bg-pink-500 transition-colors z-10"
          >
            <ChevronDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick Reply Chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex-shrink-0 px-5 py-2 overflow-x-auto scrollbar-hide"
      >
        <div className="flex gap-2">
          {quickReplies.map((text, i) => (
            <motion.button
              key={text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              onClick={() => handleQuickReply(text)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-white/70 text-plum-800 border border-pink-100 hover:bg-pink-50 hover:scale-[1.04] active:scale-[0.97] transition-all duration-150 whitespace-nowrap backdrop-blur-sm"
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
        className="flex-shrink-0 px-5 py-3 backdrop-blur-md border-t border-pink-100/30"
        style={{ background: 'rgba(255,245,247,0.85)' }}
      >
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          {/* Attachment button */}
          <button className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-pink-50 transition-colors text-plum-800/60 mb-0.5">
            <Plus size={20} />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说点什么吧..."
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
  );
}
