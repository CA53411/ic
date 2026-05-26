import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Target,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { supabase, getStorageUrl } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';

/* ─── Types (matching DB schema exactly) ─── */
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

/* ─── Project Card ─── */
function ProjectCard({
  project,
  index,
}: {
  project: CrowdfundingProject;
  index: number;
}) {
  const { isAuthenticated } = useAuth();
  const [imgError, setImgError] = useState(false);

  const progress = project.target_amount > 0
    ? Math.min((project.current_amount / project.target_amount) * 100, 100)
    : 0;

  const imageSrc = project.cover_image_url && !imgError
    ? getStorageUrl(project.cover_image_url)
    : `/previews/${['tts-preview', 'pet-preview', 'live2d-preview'][index]}.jpg`;

  const handleSupport = () => {
    if (!isAuthenticated) {
      toast('Please login first', {
        description: 'Login to support crowdfunding projects',
      });
      return;
    }
    window.open('https://corolas.top', '_blank');
  };

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
        <p className="text-[14px] text-[#6B5B6E] leading-relaxed mb-4">
          {project.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-[#A093A5]">
              ¥{(project.current_amount || 0).toLocaleString()} / ¥{(project.target_amount || 0).toLocaleString()}
            </span>
            <span className="text-[12px] font-semibold text-pink-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-pink-50 rounded-full overflow-hidden">
            <motion.div
              className="h-full accent-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 * index }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <Target size={14} className="text-pink-400" />
            <span className="text-[12px] text-[#6B5B6E]">
              Target ¥{(project.target_amount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleSupport}
          className="w-full py-2.5 rounded-xl accent-gradient text-white font-semibold text-[14px]
            hover:brightness-110 hover:shadow-glow transition-all duration-150 active:brightness-95"
        >
          Support Project
        </button>
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
        <div className="h-8 bg-pink-100 rounded animate-pulse w-full mt-2" />
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
        feature_name: 'TTS语音合成',
        description: 'Advanced text-to-speech technology for your companion. Natural, emotional voice output with multiple tones.',
        cover_image_url: 'previews/tts-preview.jpg',
        target_amount: 40000,
        current_amount: 6200,
        status: 'active',
        sort_order: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 'virtual-pet',
        feature_name: '虚拟宠物系统',
        description: 'Your companion can raise her own virtual pet. The pet has its own emotions and needs, adding more fun.',
        cover_image_url: 'previews/pet-preview.jpg',
        target_amount: 30000,
        current_amount: 8500,
        status: 'active',
        sort_order: 2,
        created_at: new Date().toISOString(),
      },
      {
        id: 'live2d-avatar',
        feature_name: 'Live2D互动形象',
        description: 'Live2D technology for dynamic interactive avatars. Rich expressions, movements and interaction feedback.',
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

      {/* ── Projects Grid ── */}
      <div className="px-8">
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
                className="mt-10 grid grid-cols-2 gap-4 max-w-[480px] mx-auto"
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
                  <p className="text-[12px] text-[#A093A5] mb-1">Total Raised</p>
                  <p className="font-number text-[24px] font-bold text-pink-500">
                    ¥{projects.reduce((sum, p) => sum + (p.current_amount || 0), 0).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            )}
          </>
        )}
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
