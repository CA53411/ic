import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Target,
  Sparkles,
  Loader2,
  Coffee,
  Zap,
  LogIn,
  ChevronRight,
} from 'lucide-react';
import { supabase, getStorageUrl } from '@/lib/supabase';
import { fetchEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/* ─── Types ─── */
interface CrowdfundingProject {
  id: string;
  feature_name: string;
  description: string;
  cover_image_url: string | null;
  target_amount: number;
  current_amount: number;
  status: string;
  sort_order: number;
  created_at: string;
}

const COFFEE_AMOUNTS = [
  { label: '¥1', cents: 100, desc: '来杯热水' },
  { label: '¥5', cents: 500, desc: '小份咖啡' },
  { label: '¥10', cents: 1000, desc: '中杯拿铁' },
  { label: '¥20', cents: 2000, desc: '大杯美式' },
  { label: '¥50', cents: 5000, desc: '精品手冲' },
  { label: '¥100', cents: 10000, desc: '咖啡周卡' },
  { label: '¥200', cents: 20000, desc: '超级支持' },
];

/* ─── Project Card (display only) ─── */
function ProjectCard({
  project,
  index,
}: {
  project: CrowdfundingProject;
  index: number;
}) {
  const [imgError, setImgError] = useState(false);

  const imageSrc = project.cover_image_url && !imgError
    ? getStorageUrl(project.cover_image_url)
    : `/previews/${['tts-preview', 'pet-preview', 'live2d-preview'][index]}.jpg`;

  return (
    <motion.div
      className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden
        hover:shadow-md hover:border-pink-200 transition-all duration-200"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Cover Image */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-pink-50">
        <img
          src={imageSrc}
          alt={project.feature_name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(45,27,46,0.5)] to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-body text-[20px] font-bold text-white drop-shadow-sm">
            {project.feature_name}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-[14px] text-[#6B5B6E] leading-relaxed">
          {project.description}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Loading Skeleton ─── */
function ProjectSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.3 }}
    >
      <div className="w-full aspect-[16/10] bg-pink-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-pink-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-pink-100 rounded animate-pulse w-full" />
        <div className="h-3 bg-pink-100 rounded animate-pulse w-2/3" />
        <div className="h-2 bg-pink-100 rounded animate-pulse w-full mt-2" />
      </div>
    </motion.div>
  );
}

/* ─── Buy Me a Coffee Section ─── */
function BuyMeACoffee() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const { t } = useI18n();

  const handleSupport = async () => {
    if (!isAuthenticated) {
      toast('请先登录', { description: '登录后即可支持我们' });
      return;
    }
    if (!selectedAmount) {
      toast('请选择金额');
      return;
    }

    try {
      setPaying(true);
      const response = await fetchEdgeFunction('payment-create', {
        method: 'POST',
        body: JSON.stringify({
          amount_cents: selectedAmount,
          name: 'Buy me a coffee',
        }),
      });
      const data = await response.json();

      if (data.error) {
        toast.error('创建订单失败: ' + data.error);
        return;
      }

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.error('获取支付链接失败');
      }
    } catch (e) {
      toast.error('创建订单失败');
    } finally {
      setPaying(false);
    }
  };

  return (
    <motion.div
      className="bg-white rounded-2xl border border-pink-100 shadow-md overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center">
            <Coffee size={20} className="text-pink-500" />
          </div>
          <h3 className="font-body text-[22px] font-bold text-[#2D1B2E]">
            Buy me a coffee
          </h3>
        </div>
        <p className="text-[14px] text-[#6B5B6E] leading-relaxed">
          {t('crowdfunding.platonicSupport')}
        </p>
      </div>

      {/* Amount Selection */}
      <div className="p-6 sm:p-8">
        <p className="text-[13px] font-semibold text-[#2D1B2E] mb-4">
          {t('crowdfunding.selectAmount')}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
          {COFFEE_AMOUNTS.map((item) => {
            const isSelected = selectedAmount === item.cents;
            return (
              <button
                key={item.cents}
                onClick={() => setSelectedAmount(item.cents)}
                className={`
                  relative rounded-xl p-3 text-center transition-all duration-200
                  border-2 ${
                    isSelected
                      ? 'border-pink-400 bg-pink-50 shadow-glow'
                      : 'border-pink-100 bg-white hover:border-pink-300 hover:shadow-sm'
                  }
                `}
              >
                <span className="block font-number text-[18px] font-bold text-[#2D1B2E]">
                  {item.label}
                </span>
                <span className="block text-[11px] text-[#A093A5] mt-0.5">
                  {item.desc}
                </span>
                {isSelected && (
                  <motion.div
                    layoutId="coffee-check"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-pink-400 flex items-center justify-center"
                  >
                    <Sparkles size={12} className="text-white" />
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        {isAuthenticated ? (
          <button
            onClick={handleSupport}
            disabled={paying || !selectedAmount}
            className={`
              w-full py-3.5 rounded-xl font-body font-semibold text-[15px]
              transition-all duration-150 flex items-center justify-center gap-2
              ${
                selectedAmount && !paying
                  ? 'accent-gradient text-white hover:brightness-110 hover:shadow-glow active:brightness-95'
                  : 'bg-pink-200 text-white/70 cursor-not-allowed'
              }
            `}
          >
            {paying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                创建订单中...
              </>
            ) : (
              <>
                <Coffee size={18} />
                {selectedAmount ? '用支付宝支持我们' : '请先选择金额'}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-3.5 rounded-xl accent-gradient text-white font-body font-semibold text-[15px]
              hover:brightness-110 hover:shadow-glow transition-all duration-150
              flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {t('common.login')}
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function Crowdfunding() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<CrowdfundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('crowdfunding_projects')
        .select('id, feature_name, description, cover_image_url, target_amount, current_amount, status, sort_order, created_at')
        .eq('status', 'active')
        .order('sort_order');

      if (dbError) {
        console.error('[Crowdfunding] DB error:', dbError.message);
        setProjects(getDefaultProjects());
        return;
      }

      if (data && data.length > 0) {
        setProjects(data as CrowdfundingProject[]);
      } else {
        setProjects(getDefaultProjects());
      }
    } catch (e) {
      console.error('[Crowdfunding] Error:', e);
      setProjects(getDefaultProjects());
    } finally {
      setLoading(false);
    }
  }

  /** Fallback when DB is empty or error */
  function getDefaultProjects(): CrowdfundingProject[] {
    return [
      {
        id: 'tts-voice',
        feature_name: t('crowdfunding.features.ttsVoice'),
        description: t('crowdfunding.features.ttsVoiceDescription'),
        cover_image_url: 'previews/tts-preview.jpg',
        target_amount: 40000,
        current_amount: 6200,
        status: 'active',
        sort_order: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 'virtual-pet',
        feature_name: t('crowdfunding.features.virtualPet'),
        description: t('crowdfunding.features.virtualPetDescription'),
        cover_image_url: 'previews/pet-preview.jpg',
        target_amount: 30000,
        current_amount: 8500,
        status: 'active',
        sort_order: 2,
        created_at: new Date().toISOString(),
      },
      {
        id: 'live2d-avatar',
        feature_name: t('crowdfunding.features.live2dAvatar'),
        description: t('crowdfunding.features.live2dAvatarDescription'),
        cover_image_url: 'previews/live2d-preview.jpg',
        target_amount: 50000,
        current_amount: 12800,
        status: 'active',
        sort_order: 3,
        created_at: new Date().toISOString(),
      },
    ];
  }

  return (
    <div className="min-h-[100dvh] bg-pink-50 pb-16">
      {/* ── Top Bar ── */}
      <motion.div
        className="flex items-center justify-between px-8 py-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <Heart size={20} className="text-pink-400" />
          <h2 className="font-body text-[28px] font-bold text-[#2D1B2E]">
            {t('crowdfunding.title')}
          </h2>
        </div>
        <span className="text-[14px] text-[#6B5B6E]">
          Support Corolas | Platonic
        </span>
      </motion.div>

      <div className="px-8 max-w-[1100px] mx-auto space-y-10">
        {/* ── Projects Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <ProjectSkeleton key={i} index={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, idx) => (
                <ProjectCard key={project.id} project={project} index={idx} />
              ))}
            </div>

            {/* ── Stats Summary ── */}
            {projects.length > 0 && (
              <motion.div
                className="grid grid-cols-2 gap-4 max-w-[480px] mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <div className="bg-white rounded-xl border border-pink-100 p-4 text-center">
                  <p className="text-[12px] text-[#A093A5] mb-1">Active Projects</p>
                  <p className="font-number text-[24px] font-bold text-[#2D1B2E]">
                    {projects.length}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-pink-100 p-4 text-center">
                  <p className="text-[12px] text-[#A093A5] mb-1">Expected Raised</p>
                  <p className="font-number text-[24px] font-bold text-pink-500">
                    ¥{projects.reduce((sum, p) => sum + (p.target_amount || 0), 0).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ── Buy Me a Coffee ── */}
        <BuyMeACoffee />
      </div>

      {/* ── Footer ── */}
      <div className="px-8 py-8 text-center mt-8">
        <p className="text-[14px] text-[#6B5B6E] mb-2">
          Corolas | Platonic &copy; 2026. All rights reserved.
        </p>
        <p className="text-[13px] text-[#A093A5]">
          Contact us:{" "}
          <a
            href="mailto:corolar@corolas.top"
            className="text-pink-500 hover:text-pink-600 transition-colors"
          >
            corolar@corolas.top
          </a>
        </p>
      </div>
    </div>
  );
}
