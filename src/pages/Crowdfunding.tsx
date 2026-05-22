import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Users,
  Check,
  Clock,
  LogIn,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getStorageUrl } from '@/lib/supabase';

/* ─── Types ─── */
interface StretchGoal {
  amount: number;
  title: string;
  description: string;
  achieved: boolean;
}

interface RewardTier {
  title: string;
  price: string;
  description: string;
  shipping: string;
  spots?: string;
}

/* ─── Data ─── */
const projectData = {
  title: 'Corolas | Platonic 虚拟伴侣硬件终端',
  subtitle: '让AI伴侣走进你的现实世界',
  raised: 856320,
  goal: 500000,
  backers: 1247,
  daysLeft: 23,
  milestones: [
    { amount: 500000, label: '基础生产', achieved: true },
    { amount: 750000, label: '解锁彩色版', achieved: true },
    { amount: 1000000, label: '全球配送', achieved: false },
    { amount: 1500000, label: 'Pro版本', achieved: false },
  ],
};

const stretchGoals: StretchGoal[] = [
  { amount: 60, title: '定制充电底座', description: '专属设计的木纹无线充电底座', achieved: true },
  { amount: 75, title: 'RGB氛围灯效', description: '16百万色可自定义氛围灯光', achieved: true },
  { amount: 90, title: '触控交互升级', description: '电容触摸屏 + 手势识别', achieved: false },
  { amount: 120, title: '立体声音箱', description: '双扬声器立体声音效系统', achieved: false },
  { amount: 150, title: '全息投影模块', description: '迷你全息投影显示技术', achieved: false },
];

const rewardTiers: RewardTier[] = [
  { title: '感谢支持', price: '¥1', description: '你的名字将出现在项目感谢名单中', shipping: '无需邮寄' },
  { title: '早鸟版', price: '¥299', description: '全息投影终端(基础白) + 终身免费APP会员', shipping: '预计2026年6月发货', spots: '剩余 23' },
  { title: '标准版', price: '¥399', description: '全息投影终端(彩色版) + 终身免费APP会员 + 定制底座', shipping: '预计2026年6月发货' },
  { title: '收藏版', price: '¥699', description: '限量版玫瑰金 + 签名证书 + 专属语音包 + 全部标准版内容', shipping: '预计2026年5月发货', spots: '限量 100' },
  { title: '开发者版', price: '¥1299', description: '双终端套装 + API访问权限 + 开发文档 + 技术支持', shipping: '预计2026年4月发货', spots: '限量 50' },
];

/* ─── Sub-components ─── */

function ProgressBar({
  raised,
  goal,
  milestones,
}: {
  raised: number;
  goal: number;
  milestones: { amount: number; label: string; achieved: boolean }[];
}) {
  const maxAmount = milestones[milestones.length - 1].amount;
  const progress = (raised / maxAmount) * 100;

  return (
    <div className="mb-2">
      {/* Milestone labels */}
      <div className="relative h-6 mb-1">
        {milestones.map((m) => {
          const left = (m.amount / maxAmount) * 100;
          return (
            <div
              key={m.amount}
              className={cn(
                'absolute transform -translate-x-1/2 text-[10px] font-semibold',
                m.achieved ? 'text-pink-400' : 'text-pink-200'
              )}
              style={{ left: `${left}%` }}
            >
              ¥{(m.amount / 10000).toFixed(0)}万
            </div>
          );
        })}
      </div>

      {/* Bar */}
      <div className="relative h-3 bg-pink-50 rounded-full overflow-hidden">
        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 accent-gradient rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />

        {/* Milestone tick marks */}
        {milestones.map((m) => {
          const left = (m.amount / maxAmount) * 100;
          return (
            <div
              key={m.amount}
              className={cn(
                'absolute top-0 bottom-0 w-0.5',
                m.achieved ? 'bg-white/50' : 'bg-pink-200'
              )}
              style={{ left: `${left}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function AnimatedNumber({
  target,
  duration = 2000,
  prefix = '',
  suffix = '',
}: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return (
    <span className="font-number text-[28px] font-bold text-[#2D1B2E]">
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}

function MilestoneFlag({
  amount,
  label,
  achieved,
}: {
  amount: number;
  label: string;
  achieved: boolean;
}) {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all duration-200',
        achieved
          ? 'bg-pink-50 border-pink-200'
          : 'bg-white border-pink-100 opacity-50'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: achieved ? 1 : 0.5, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {achieved ? (
        <Check size={16} className="text-green-500" />
      ) : (
        <Clock size={16} className="text-pink-300" />
      )}
      <span className="text-[13px] font-semibold text-[#2D1B2E]">{label}</span>
      <span className="text-[11px] text-[#A093A5]">¥{(amount / 10000).toFixed(0)}万</span>
    </motion.div>
  );
}

function RewardCard({ tier, index }: { tier: RewardTier; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleBackProject = () => {
    if (!isAuthenticated) {
      toast('请先登录', {
        description: '登录后您可以参与众筹支持项目',
        icon: <LogIn size={16} className="text-pink-400" />,
      });
      navigate('/auth');
      return;
    }
    toast('Coming Soon', {
      description: '众筹支持功能即将上线，敬请期待！',
      icon: <Sparkles size={16} className="text-pink-400" />,
    });
  };

  return (
    <motion.div
      className={cn(
        'rounded-2xl border p-6 transition-all duration-200',
        hovered
          ? 'border-pink-400 bg-pink-50 shadow-glow scale-[1.01]'
          : 'border-pink-100 bg-white shadow-sm'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-[16px] font-semibold text-[#2D1B2E]">{tier.title}</h4>
        <span className="font-number text-[24px] font-bold text-pink-500">
          {tier.price}
        </span>
      </div>
      <p className="text-[13px] text-[#6B5B6E] leading-relaxed mb-2">{tier.description}</p>
      <p className="text-[12px] text-[#A093A5] mb-4">{tier.shipping}</p>
      {tier.spots && (
        <div className="mb-3">
          <span
            className={cn(
              'inline-block px-3 py-1 rounded-full text-[12px] font-semibold',
              tier.spots.includes('限量') ? 'bg-amber-50 text-amber-600' : 'bg-pink-50 text-pink-500'
            )}
          >
            {tier.spots}
          </span>
        </div>
      )}
      <button
        onClick={handleBackProject}
        className={cn(
          'w-full py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200',
          hovered
            ? 'accent-gradient text-white hover:brightness-110'
            : 'border border-pink-200 text-pink-500 hover:bg-pink-50'
        )}
      >
        支持项目
      </button>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function Crowdfunding() {
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-50px' });
  const projectRef = useRef(null);
  const projectInView = useInView(projectRef, { once: true, margin: '-50px' });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  /* Product image with storage fallback */
  const storageProductImage = getStorageUrl('crowdfunding/product-render.jpg');
  const [productImageSrc, setProductImageSrc] = useState(storageProductImage);
  const [productImageFailed, setProductImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const handleProductImageError = () => {
    if (!productImageFailed) {
      setProductImageSrc('/crowdfunding/product-render.jpg');
      setProductImageFailed(true);
    }
  };

  const handleVideoError = () => {
    setVideoFailed(true);
  };

  const handleBackProject = useCallback(() => {
    if (!isAuthenticated) {
      toast('请先登录', {
        description: '登录后您可以参与众筹支持项目',
        icon: <LogIn size={16} className="text-pink-400" />,
      });
      navigate('/auth');
      return;
    }
    toast('Coming Soon', {
      description: '众筹支持功能即将上线，敬请期待！',
      icon: <Sparkles size={16} className="text-pink-400" />,
    });
  }, [isAuthenticated, navigate]);

  /* Local video URL (fallback from storage) */
  const storageVideoUrl = getStorageUrl('crowdfunding/product-video.mp4');
  const localVideoUrl = '/crowdfunding/product-video.mp4';

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
            <Heart size={20} className="text-pink-400" />
            <h2 className="font-body text-[28px] font-bold text-[#2D1B2E]">
              众筹中心
            </h2>
          </div>

          {/* Right: Project title */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[14px] text-[#6B5B6E]">
              Corolas | Platonic 硬件终端
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Project Overview ── */}
      <div className="px-8 pb-6" ref={projectRef}>
        <div className="flex gap-6">
          {/* Video Preview */}
          <motion.div
            className="relative w-[60%] aspect-video rounded-3xl overflow-hidden bg-[#2D1B2E] flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={projectInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            {!videoFailed ? (
              <video
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                poster={productImageSrc}
                onError={handleVideoError}
              >
                <source src={storageVideoUrl} type="video/mp4" />
                <source src={localVideoUrl} type="video/mp4" />
              </video>
            ) : (
              <img
                src={productImageSrc}
                alt="Product"
                className="absolute inset-0 w-full h-full object-cover"
                onError={handleProductImageError}
              />
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 bg-[rgba(26,16,37,0.3)] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
              </div>
            </div>
          </motion.div>

          {/* Project Info */}
          <motion.div
            className="flex-1 flex flex-col justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={projectInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div>
              <h2 className="font-display text-[36px] text-[#2D1B2E] mb-1 leading-tight">
                {projectData.title}
              </h2>
              <p className="text-[16px] text-[#6B5B6E] mb-4">{projectData.subtitle}</p>

              {/* Progress */}
              <ProgressBar
                raised={projectData.raised}
                goal={projectData.goal}
                milestones={projectData.milestones}
              />

              {/* Raised amount */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="font-number text-[48px] font-bold text-pink-500">
                  ¥{projectData.raised.toLocaleString()}
                </span>
                <span className="text-[16px] text-[#A093A5]">
                  / ¥{(projectData.goal / 10000).toFixed(0)}万 目标
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-pink-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={16} className="text-pink-400" />
                    <span className="text-[13px] text-[#6B5B6E]">支持者</span>
                  </div>
                  <AnimatedNumber target={projectData.backers} suffix="人" />
                </div>
                <div className="bg-white rounded-xl border border-pink-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart size={16} className="text-pink-400" />
                    <span className="text-[13px] text-[#6B5B6E]">达成率</span>
                  </div>
                  <span className="font-number text-[28px] font-bold text-[#2D1B2E]">
                    {Math.round((projectData.raised / projectData.goal) * 100)}%
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-pink-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} className="text-pink-400" />
                    <span className="text-[13px] text-[#6B5B6E]">剩余</span>
                  </div>
                  <span className="font-number text-[28px] font-bold text-[#2D1B2E]">
                    {projectData.daysLeft}天
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleBackProject}
              className="w-full py-3.5 rounded-xl accent-gradient text-white font-semibold text-[16px]
                hover:brightness-110 hover:shadow-glow transition-all duration-150 active:brightness-95"
            >
              立即支持项目
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── Milestones ── */}
      <div className="px-8 py-6" ref={statsRef}>
        <h3 className="font-body text-[22px] font-bold text-[#2D1B2E] mb-4">项目里程碑</h3>
        <div className="flex gap-4">
          {projectData.milestones.map((m) => (
            <div key={m.amount} className="flex-1">
              <MilestoneFlag
                amount={m.amount}
                label={m.label}
                achieved={m.achieved}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Product Gallery ── */}
      <div className="px-8 py-6">
        <h3 className="font-body text-[22px] font-bold text-[#2D1B2E] mb-4">产品展示</h3>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="rounded-2xl overflow-hidden bg-white border border-pink-100 aspect-square"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <img
                src={
                  i === 1
                    ? productImageSrc
                    : `/crowdfunding/gallery-${i}.jpg`
                }
                alt={`Gallery ${i}`}
                className="w-full h-full object-cover"
                onError={
                  i === 1
                    ? handleProductImageError
                    : undefined
                }
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Stretch Goals ── */}
      <div className="px-8 py-6">
        <h3 className="font-body text-[22px] font-bold text-[#2D1B2E] mb-4">延伸目标</h3>
        <div className="space-y-3">
          {stretchGoals.map((goal, idx) => (
            <motion.div
              key={goal.amount}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
                goal.achieved
                  ? 'bg-pink-50 border-pink-200'
                  : 'bg-white border-pink-100'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * idx, duration: 0.4 }}
            >
              {/* Achievement indicator */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  goal.achieved ? 'bg-pink-400' : 'bg-pink-100'
                )}
              >
                {goal.achieved ? (
                  <Check size={18} className="text-white" />
                ) : (
                  <span className="text-[12px] text-pink-400 font-bold">¥{goal.amount}万</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h4 className="text-[15px] font-semibold text-[#2D1B2E]">{goal.title}</h4>
                <p className="text-[13px] text-[#6B5B6E]">{goal.description}</p>
              </div>

              {/* Amount badge */}
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-[12px] font-semibold',
                  goal.achieved
                    ? 'bg-pink-400 text-white'
                    : 'bg-pink-100 text-pink-400'
                )}
              >
                ¥{goal.amount}万
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Reward Tiers ── */}
      <div className="px-8 py-6">
        <h3 className="font-body text-[22px] font-bold text-[#2D1B2E] mb-4">支持档位</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewardTiers.map((tier, idx) => (
            <RewardCard key={tier.title} tier={tier} index={idx} />
          ))}
        </div>
      </div>

      {/* ── Product Details ── */}
      <div className="px-8 py-6">
        <h3 className="font-body text-[22px] font-bold text-[#2D1B2E] mb-4">产品详情</h3>
        <div className="bg-white rounded-2xl border border-pink-100 overflow-hidden">
          <div className="flex gap-8 p-8">
            <div className="w-[45%] rounded-xl overflow-hidden">
              <img
                src={productImageSrc}
                alt="Product Details"
                className="w-full h-full object-cover"
                onError={handleProductImageError}
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-[16px] font-semibold text-[#2D1B2E] mb-2">全息投影技术</h4>
                <p className="text-[14px] text-[#6B5B6E] leading-relaxed">
                  采用先进的全息投影技术，让你的AI伴侣以逼真的3D形象出现在桌面上。
                  伴侣可以做出各种表情和动作，让互动更加生动。
                </p>
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-[#2D1B2E] mb-2">智能对话系统</h4>
                <p className="text-[14px] text-[#6B5B6E] leading-relaxed">
                  内置高性能AI芯片，支持流畅的自然语言对话。伴侣可以记住你们的每一次对话，
                  建立独特的情感连接。
                </p>
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-[#2D1B2E] mb-2">多模态交互</h4>
                <p className="text-[14px] text-[#6B5B6E] leading-relaxed">
                  支持语音对话、触摸互动、手势识别等多种交互方式。
                  轻触伴侣的头，她会开心地笑；长按可以唤醒深度对话模式。
                </p>
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-[#2D1B2E] mb-2">隐私保护</h4>
                <p className="text-[14px] text-[#6B5B6E] leading-relaxed">
                  本地AI处理，对话数据加密存储。你的隐私是我们最重要的承诺。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-8 py-8 text-center">
        <p className="text-[14px] text-[#6B5B6E] mb-2">
          Corolas | Platonic &copy; 2026. All rights reserved.
        </p>
        <p className="text-[13px] text-[#A093A5]">
          Contact us: <a href="mailto:corolar@corolas.top" className="text-pink-500 hover:text-pink-600 transition-colors">corolar@corolas.top</a>
        </p>
      </div>
    </div>
  );
}
