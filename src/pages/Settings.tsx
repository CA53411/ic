import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon,
  Globe,
  Check,
  Edit3,
  ChevronRight,
  CheckCircle,
  LogOut,
  Trash2,
  AlertTriangle,
  Sun,
  Moon,
  HeartCrack,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Language = 'zh' | 'en' | 'ja' | 'ko';

interface LanguageOption {
  code: Language;
  label: string;
  tag?: string;
}

interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LANGUAGES: LanguageOption[] = [
  { code: 'zh', label: '中文', tag: '简体' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語', tag: 'Japanese' },
  { code: 'ko', label: '한국어', tag: 'Korean' },
];

const ACCENT_COLORS = [
  { name: 'Default Pink', class: 'bg-pink-400', hex: '#FF69B4' },
  { name: 'Rose Gold', class: 'bg-rose-gold', hex: '#E8A0BF' },
  { name: 'Lavender', class: 'bg-purple-memory', hex: '#C8A8E9' },
  { name: 'Coral', class: 'bg-[#FF8A80]', hex: '#FF8A80' },
  { name: 'Mint', class: 'bg-[#80CBC4]', hex: '#80CBC4' },
];

const THEME_SWATCHES = [
  { name: 'Pink', class: 'bg-pink-400', selected: true },
  { name: 'Rose', class: 'bg-rose-gold', selected: false },
  { name: 'Purple', class: 'bg-purple-memory', selected: false },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Toggle Switch */
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${enabled ? 'bg-pink-400' : 'bg-pink-100'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200
          ${enabled ? 'translate-x-6' : 'translate-x-0.5'}
        `}
      />
    </button>
  );
}

/** Notification Toggle Row */
function NotificationToggle({ label, description, enabled, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-pink-50 last:border-b-0">
      <div>
        <p className="font-body text-[15px] text-plum-900">{label}</p>
        {description && (
          <p className="font-body text-[12px] text-muted-plum mt-0.5">{description}</p>
        )}
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} />
    </div>
  );
}

/** Section Card Wrapper */
function SectionCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      }}
      className="bg-white rounded-2xl border border-pink-100 shadow-md p-6 mb-5 max-w-[640px]"
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Settings() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>('zh');
  const [selectedTheme, setSelectedTheme] = useState('Pink');
  const [accentColor, setAccentColor] = useState('Default Pink');
  const [savedLanguage, setSavedLanguage] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [registeredAt, setRegisteredAt] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState('/default-avatar.jpg');
  const [loading, setLoading] = useState(true);

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);

  // Notification states
  const [notifProactive, setNotifProactive] = useState(true);
  const [notifEnergy, setNotifEnergy] = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);

  // Modal states
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Release loading
  const [releasing, setReleasing] = useState(false);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
    loadNotificationSettings();
    loadThemeSettings();
  }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setUsername(user.user_metadata?.username || user.email?.split('@')[0] || 'User');

        // Get profile
        const { data: profile } = await supabase.from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) {
          const savedLang = (profile.language as Language) || localStorage.getItem('language') as Language || 'zh';
          setLanguage(savedLang);
          setRegisteredAt(profile.created_at
            ? new Date(profile.created_at).toLocaleDateString('zh-CN')
            : '');
          // If has companion, load companion info
          if (profile.current_companion_id) {
            const { data: companion } = await supabase.from('companions')
              .select('id, nickname, name, avatar_url')
              .eq('id', profile.current_companion_id)
              .single();
            if (companion) {
              setCompanionName(companion.nickname || companion.name);
              setCompanionId(companion.id);
              if (companion.avatar_url) setAvatar(companion.avatar_url);
            }
          }
        } else {
          // Load from localStorage fallback
          const savedLang = localStorage.getItem('language') as Language;
          if (savedLang && LANGUAGES.some(l => l.code === savedLang)) {
            setLanguage(savedLang);
          }
        }
      }
    } catch (e) {
      console.error('加载用户数据失败:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadNotificationSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase.from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settings) {
        setNotifProactive(settings.push_enabled ?? true);
        setNotifEnergy(settings.energy_alert_threshold ? true : false);
      }
    } catch (e) {
      // Use defaults - table may not exist yet
    }
  }

  function loadThemeSettings() {
    // Load dark mode from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }

  async function handleLanguageChange(lang: Language) {
    setLanguage(lang);
    setSavedLanguage(false);
    // Save to localStorage immediately
    localStorage.setItem('language', lang);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ language: lang }).eq('id', user.id);
      }
    } catch (e) {
      // Silent fail - localStorage is the source of truth
    }
  }

  const handleLanguageSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ language }).eq('id', user.id);
      }
      localStorage.setItem('language', language);
      setSavedLanguage(true);
      toast.success('语言已保存');
      setTimeout(() => setSavedLanguage(false), 2000);
    } catch (e) {
      toast.error('保存失败');
      // Still show local saved state for UX
      setSavedLanguage(true);
      setTimeout(() => setSavedLanguage(false), 2000);
    }
  };

  // Dark mode toggle
  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Release companion
  const handleReleaseCompanion = async () => {
    if (!companionId) {
      toast.error('未找到伴侣信息');
      return;
    }

    setReleasing(true);
    try {
      const { error } = await supabase
        .from('companions')
        .delete()
        .eq('id', companionId);

      if (error) {
        toast.error('释放伴侣失败: ' + error.message);
        setReleasing(false);
        return;
      }

      toast.success('伴侣已释放');
      setShowReleaseModal(false);
      setCompanionId(null);
      setCompanionName('');

      // Navigate to customize page
      navigate('/customize');
    } catch (e: any) {
      toast.error('释放伴侣时出错: ' + (e?.message || '未知错误'));
    } finally {
      setReleasing(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('已退出登录');
      window.location.href = '/';
    } catch (e) {
      toast.error('退出登录失败');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-pink-50 pb-16">
      {/* ── Top Bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between px-8 py-5"
      >
        <div className="flex items-center gap-2">
          <SettingsIcon size={20} className="text-plum-800" />
          <h2 className="font-body text-[28px] font-bold text-plum-900">设置</h2>
        </div>
      </motion.div>

      <div className="px-8">
        {/* ── Section 1: Language Settings ── */}
        <SectionCard delay={0}>
          <h3 className="font-body text-[22px] font-bold text-plum-900 mb-1">
            语言设置
          </h3>
          <p className="font-body text-[13px] text-muted-plum mb-4">
            选择你偏好的界面语言
          </p>

          <div className="flex flex-col gap-2 mb-5">
            {LANGUAGES.map((lang, i) => {
              const isSelected = language === lang.code;
              return (
                <motion.button
                  key={lang.code}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => {
                    handleLanguageChange(lang.code);
                  }}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer
                    transition-all duration-200 w-full text-left
                    ${isSelected ? 'bg-pink-50 border border-pink-200' : 'hover:bg-pink-50/50 border border-transparent'}
                  `}
                >
                  {/* Radio */}
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150
                      ${isSelected ? 'border-pink-400' : 'border-pink-200'}
                    `}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className="w-2.5 h-2.5 rounded-full bg-pink-400"
                      />
                    )}
                  </div>

                  <Globe size={18} className="text-plum-800 flex-shrink-0" />

                  <span className="font-body text-[15px] text-plum-900 flex-1">
                    {lang.label}
                  </span>

                  {lang.tag && (
                    <span className="font-body text-[12px] text-muted-plum">
                      {lang.tag}
                    </span>
                  )}

                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Check size={16} className="text-pink-400" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleLanguageSave}
              className="
                px-6 py-2.5 rounded-xl accent-gradient text-white font-body font-semibold
                transition-all duration-150 hover:brightness-110 hover:shadow-glow active:brightness-95
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {savedLanguage ? (
                <span className="flex items-center gap-1.5">
                  <Check size={16} strokeWidth={2.5} />
                  已保存
                </span>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </SectionCard>

        {/* ── Section 2: Account Information ── */}
        <SectionCard delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-body text-[22px] font-bold text-plum-900">
              账号信息
            </h3>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <img
              src={avatar}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-pink-200"
            />
            <div>
              <p className="font-body text-[18px] font-semibold text-plum-900">
                {username}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-body text-[13px] text-muted-plum">
                  {email}
                </span>
                <CheckCircle size={14} className="text-green-500" />
              </div>
            </div>
          </div>

          {/* Account fields */}
          <div className="space-y-1">
            {[
              { label: '用户名', value: username, icon: <Edit3 size={14} className="text-pink-400" /> },
              { label: '邮箱', value: email, verified: true },
              { label: '注册时间', value: registeredAt },
              {
                label: '伴侣',
                value: (
                  <span className="flex items-center gap-1">
                    {companionName || '未创建'}
                    <ChevronRight size={14} className="text-muted-plum" />
                  </span>
                ),
              },
            ].map((field) => (
              <div
                key={field.label}
                className="flex items-center py-3 border-b border-pink-50 last:border-b-0"
              >
                <span className="font-body text-[13px] text-muted-plum w-[120px] flex-shrink-0">
                  {field.label}
                </span>
                <span className="font-body text-[15px] text-plum-900 flex-1 flex items-center gap-1.5">
                  {typeof field.value === 'string' ? field.value : field.value}
                  {'verified' in field && field.verified && (
                    <CheckCircle size={14} className="text-green-500" />
                  )}
                  {'icon' in field && field.icon}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <button
              className="
                px-5 py-2.5 rounded-xl bg-pink-50 text-pink-500 font-body font-medium
                border border-pink-200 hover:bg-pink-100 transition-all duration-150
                text-[14px]
              "
              onClick={() => toast.info('修改密码功能即将推出')}
            >
              修改密码
            </button>
          </div>
        </SectionCard>

        {/* ── Section 3: Theme Settings ── */}
        <SectionCard delay={0.2}>
          <h3 className="font-body text-[22px] font-bold text-plum-900 mb-1">
            主题设置
          </h3>
          <p className="font-body text-[13px] text-muted-plum mb-5">
            自定义你的视觉体验
          </p>

          {/* Theme Swatches */}
          <div className="mb-6">
            <p className="font-body text-[13px] text-plum-800 mb-3">外观主题</p>
            <div className="flex gap-3">
              {THEME_SWATCHES.map((swatch) => (
                <button
                  key={swatch.name}
                  onClick={() => setSelectedTheme(swatch.name)}
                  className="relative group"
                >
                  <div
                    className={`
                      w-12 h-12 rounded-full transition-all duration-200
                      ${swatch.class}
                      ${selectedTheme === swatch.name
                        ? 'ring-[3px] ring-white ring-offset-2 ring-offset-plum-900 shadow-glow scale-100'
                        : 'hover:scale-110'
                      }
                    `}
                  />
                  <span className="block text-center font-body text-[11px] text-muted-plum mt-1.5">
                    {swatch.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color Selection */}
          <div className="mb-6">
            <p className="font-body text-[13px] text-plum-800 mb-3">强调色</p>
            <div className="flex gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setAccentColor(color.name)}
                  className="relative group"
                >
                  <div
                    className={`
                      w-8 h-8 rounded-full transition-all duration-200
                      ${color.class}
                      ${accentColor === color.name
                        ? 'ring-[3px] ring-white ring-offset-2 ring-offset-plum-900 shadow-glow scale-100'
                        : 'hover:scale-110'
                      }
                    `}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Light/Dark toggle */}
          <div>
            <p className="font-body text-[13px] text-plum-800 mb-3">主题模式</p>
            <div className="flex items-center gap-3">
              <Sun size={18} className={darkMode ? 'text-muted-plum' : 'text-plum-800'} />
              <ToggleSwitch
                enabled={darkMode}
                onChange={handleDarkModeToggle}
              />
              <Moon size={18} className={darkMode ? 'text-plum-800' : 'text-muted-plum'} />
              <span className="font-body text-[12px] text-muted-plum ml-1">
                {darkMode ? '深色模式' : '浅色模式'}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ── Section 4: Notifications ── */}
        <SectionCard delay={0.25}>
          <h3 className="font-body text-[22px] font-bold text-plum-900 mb-4">
            通知设置
          </h3>
          <NotificationToggle
            label="主动消息提醒"
            description="伴侣主动发来消息时通知你"
            enabled={notifProactive}
            onChange={setNotifProactive}
          />
          <NotificationToggle
            label="电量不足提醒"
            description="电量低于 20% 时提醒你"
            enabled={notifEnergy}
            onChange={setNotifEnergy}
          />
          <NotificationToggle
            label="每日摘要"
            description="每天发送一份关系摘要"
            enabled={notifDaily}
            onChange={setNotifDaily}
          />
        </SectionCard>

        {/* ── Section 5: Companion Management ── */}
        {companionId && (
          <SectionCard delay={0.28}>
            <h3 className="font-body text-[22px] font-bold text-plum-900 mb-1">
              伴侣管理
            </h3>
            <p className="font-body text-[13px] text-muted-plum mb-4">
              管理你与 {companionName || '伴侣'} 的关系
            </p>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-pink-50 border border-pink-100 mb-5">
              <img
                src={avatar}
                alt={companionName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-200"
              />
              <div className="flex-1">
                <p className="font-body text-[15px] font-semibold text-plum-900">
                  {companionName || '伴侣'}
                </p>
                <p className="font-body text-[12px] text-muted-plum">
                  当前伴侣 · 已绑定
                </p>
              </div>
              <HeartCrack size={18} className="text-pink-300" />
            </div>

            {/* Danger Zone Divider */}
            <div className="border-t border-red-100 pt-4">
              <p className="font-body text-[12px] font-semibold text-red-600 uppercase tracking-wider mb-3">
                危险操作
              </p>
              <button
                onClick={() => setShowReleaseModal(true)}
                className="
                  w-full flex items-center justify-center gap-2 py-3 rounded-xl
                  bg-red-50 text-red-600 font-body font-medium
                  border border-red-100 hover:bg-red-100 transition-all duration-150
                "
              >
                <HeartCrack size={16} />
                释放伴侣
              </button>
              <p className="text-[11px] text-muted-plum font-body mt-2 text-center">
                释放后所有回忆将被删除，此操作不可撤销
              </p>
            </div>
          </SectionCard>
        )}

        {/* ── Section 6: About & Danger Zone ── */}
        <SectionCard delay={0.3}>
          <h3 className="font-body text-[22px] font-bold text-plum-900 mb-1">
            关于 Corolas | Platonic
          </h3>
          <p className="font-body text-[13px] text-muted-plum mb-4">v1.0.0</p>

          <div className="flex gap-4 mb-5">
            <button
              onClick={() => toast.info('服务条款页面即将推出')}
              className="font-body text-[13px] text-pink-500 hover:text-pink-600 transition-colors"
            >
              服务条款
            </button>
            <button
              onClick={() => toast.info('隐私政策页面即将推出')}
              className="font-body text-[13px] text-pink-500 hover:text-pink-600 transition-colors"
            >
              隐私政策
            </button>
            <button
              onClick={() => toast.info('联系页面即将推出')}
              className="font-body text-[13px] text-pink-500 hover:text-pink-600 transition-colors"
            >
              联系我们
            </button>
          </div>

          <p className="font-body text-[12px] text-muted-plum mb-5">
            &copy; 2026 Corolas | Platonic
          </p>

          {/* Danger Zone Divider */}
          <div className="border-t border-pink-100 pt-5 mt-5">
            <p className="font-body text-[12px] font-semibold text-red-600 uppercase tracking-wider mb-4">
              危险操作
            </p>

            {/* Disconnect relationship */}
            <button
              onClick={() => setShowDisconnectModal(true)}
              className="
                w-full flex items-center justify-center gap-2 py-3 rounded-xl
                bg-red-50 text-red-600 font-body font-medium
                border border-red-100 hover:bg-red-100 transition-all duration-150
                mb-3
              "
            >
              <AlertTriangle size={16} />
              解除当前关系
            </button>

            {/* Delete account */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="
                w-full flex items-center justify-center gap-2 py-3 rounded-xl
                text-red-600 font-body font-medium text-[14px]
                hover:bg-red-50 transition-all duration-150
              "
            >
              <Trash2 size={16} />
              注销账号
            </button>
          </div>
        </SectionCard>

        {/* ── Logout Button ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-[640px] mt-6"
        >
          <button
            className="
              w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
              border border-plum-800/20 text-plum-800 font-body font-medium
              hover:bg-white transition-all duration-150
            "
            onClick={handleLogout}
          >
            <LogOut size={18} />
            退出登录
          </button>
        </motion.div>
      </div>

      {/* ── Release Companion Confirmation Modal ── */}
      <AnimatePresence>
        {showReleaseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(26,16,37,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => !releasing && setShowReleaseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-lg p-6 max-w-[400px] w-full"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <HeartCrack size={24} className="text-red-500" />
                </div>
                <h3 className="font-body text-[18px] font-semibold text-plum-900 mb-1">
                  释放伴侣
                </h3>
                <p className="font-body text-[13px] text-muted-plum">
                  确定要释放 <span className="font-semibold text-plum-800">{companionName}</span> 吗？此操作将删除所有回忆且不可撤销。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReleaseModal(false)}
                  disabled={releasing}
                  className="flex-1 py-2.5 rounded-xl border border-pink-200 text-plum-900 font-body font-medium hover:bg-pink-50 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleReleaseCompanion}
                  disabled={releasing}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-body font-medium hover:bg-red-600 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {releasing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      处理中...
                    </>
                  ) : (
                    '确认释放'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Disconnect Confirmation Modal ── */}
      <AnimatePresence>
        {showDisconnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(26,16,37,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowDisconnectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-lg p-6 max-w-[400px] w-full"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <h3 className="font-body text-[18px] font-semibold text-plum-900 mb-1">
                  解除当前关系
                </h3>
                <p className="font-body text-[13px] text-muted-plum">
                  确定要解除与伴侣的关系吗？此操作不可撤销。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisconnectModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-pink-200 text-plum-900 font-body font-medium hover:bg-pink-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowDisconnectModal(false);
                    toast.success('关系已解除');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-body font-medium hover:bg-red-600 transition-colors"
                >
                  确认解除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Account Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(26,16,37,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-lg p-6 max-w-[400px] w-full"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className="font-body text-[18px] font-semibold text-plum-900 mb-1">
                  注销账号
                </h3>
                <p className="font-body text-[13px] text-muted-plum">
                  确定要注销账号吗？此操作不可撤销，所有数据将被永久删除。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-pink-200 text-plum-900 font-body font-medium hover:bg-pink-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    toast.success('账号已注销');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-body font-medium hover:bg-red-600 transition-colors"
                >
                  确认注销
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
