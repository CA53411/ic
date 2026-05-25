import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';
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
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  HeartCrack,
  Sparkles,
  HelpCircle,
  Mail,
  Clock,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { applyTheme, loadSavedTheme } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Language = 'zh' | 'en' | 'ja' | 'ko';

interface LanguageOption {
  code: Language;
  label: string;
  tag?: string;
}

interface TimezoneOption {
  value: string;
  label: string;
  region: string;
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

const TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)', region: '中国' },
  { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)', region: '香港' },
  { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)', region: '新加坡' },
  { value: 'Asia/Taipei', label: '台北时间 (UTC+8)', region: '台湾' },
  { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)', region: '日本' },
  { value: 'Asia/Seoul', label: '首尔时间 (UTC+9)', region: '韩国' },
  { value: 'Asia/Bangkok', label: '曼谷时间 (UTC+7)', region: '泰国' },
  { value: 'Asia/Dubai', label: '迪拜时间 (UTC+4)', region: '阿联酋' },
  { value: 'Europe/London', label: '伦敦时间 (UTC+0/+1)', region: '英国' },
  { value: 'Europe/Paris', label: '巴黎时间 (UTC+1/+2)', region: '法国' },
  { value: 'Europe/Berlin', label: '柏林时间 (UTC+1/+2)', region: '德国' },
  { value: 'Europe/Moscow', label: '莫斯科时间 (UTC+3)', region: '俄罗斯' },
  { value: 'America/New_York', label: '纽约时间 (UTC-5/-4)', region: '美国东部' },
  { value: 'America/Los_Angeles', label: '洛杉矶时间 (UTC-8/-7)', region: '美国西部' },
  { value: 'America/Chicago', label: '芝加哥时间 (UTC-6/-5)', region: '美国中部' },
  { value: 'America/Toronto', label: '多伦多时间 (UTC-5/-4)', region: '加拿大' },
  { value: 'Australia/Sydney', label: '悉尼时间 (UTC+10/+11)', region: '澳大利亚' },
  { value: 'Pacific/Auckland', label: '奥克兰时间 (UTC+12/+13)', region: '新西兰' },
  { value: 'UTC', label: '协调世界时 (UTC)', region: '全球' },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={18} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={18} /> },
  { value: 'auto', label: 'Auto', icon: <Monitor size={18} /> },
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

/** Default privacy policy content */
const DEFAULT_PRIVACY_POLICY = `Corolas | Platonic 隐私政策

最后更新日期：2026年1月1日

1. 数据收集
我们仅收集为您提供服务所必需的最少信息，包括：
- 账号信息（邮箱、用户名）
- 伴侣配置和对话记录
- 使用统计数据（用于改善服务）

2. 数据存储
- 您的对话数据存储在安全的云端服务器上
- 敏感信息采用加密存储
- 您随时可以导出或删除自己的数据

3. 数据使用
- 我们不会将您的个人数据出售给第三方
- 不会使用您的对话内容训练AI模型（除非您明确同意）
- 仅用于提供服务和技术支持

4. 您的权利
- 访问权：查看我们持有的关于您的数据
- 更正权：修改不准确的信息
- 删除权：要求删除您的所有数据
- 导出权：导出您的数据副本

5. 联系方式
如有隐私相关问题，请联系：corolar@corolas.top`;

/** Default terms of service content */
const DEFAULT_TERMS_OF_SERVICE = `Corolas | Platonic 服务条款

最后更新日期：2026年1月1日

1. 服务说明
Corolas | Platonic 是一款AI虚拟伴侣应用，旨在为用户提供情感陪伴和互动体验。

2. 使用规则
- 用户需年满13周岁
- 禁止用于违法、欺诈或骚扰目的
- 禁止尝试破解、逆向工程或干扰服务正常运行
- 用户对自己的账号行为负责

3. 内容政策
- 禁止生成或传播违法、暴力、仇恨言论
- 禁止上传侵犯他人知识产权的内容
- 我们保留删除违规内容的权利

4. 服务变更
- 我们保留随时修改或终止服务的权利
- 重大变更将提前通知用户
- 用户可以自主选择是否继续使用更新后的服务

5. 免责声明
- AI伴侣的回复由算法生成，不构成专业建议
- 对于因使用服务造成的间接损失，我们不承担责任
- 服务按"现状"提供，不作任何明示或暗示的担保

6. 联系我们
如有任何问题，请联系：corolar@corolas.top`;

/** Default help content */
const DEFAULT_HELP_CONTENT = `Corolas | Platonic 帮助中心

快速入门：
1. 注册并登录您的账号
2. 在 Plaza 中创建您的专属伴侣
3. 开始与伴侣聊天，建立独特的情感连接
4. 探索 Memory 功能，记录美好回忆
5. 体验 Drama 剧情模式，享受沉浸式故事

常见问题：

Q: 我可以创建多个伴侣吗？
A: 每个账号只能拥有一个伴侣。如需更换，可以在设置中释放当前伴侣后重新创建。

Q: 对话数据会保存多久？
A: 您的对话数据会一直保存，直到您主动删除账号或释放伴侣。

Q: 如何修改伴侣的性格？
A: 目前伴侣创建后性格设置不可修改。您可以在释放后重新创建。

Q: 支持哪些语言？
A: 目前支持中文和英文界面。伴侣可以使用多种语言与您交流。

Q: 如何联系支持团队？
A: 发送邮件至 corolar@corolas.top，我们会在24小时内回复。`;

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

/** Collapsible section for text content */
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-pink-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3
          hover:bg-pink-50/50 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-body text-[14px] font-medium text-plum-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-muted-plum" />
        ) : (
          <ChevronDown size={16} className="text-muted-plum" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-pink-50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Text content display with pre-wrap */
function TextContent({ content }: { content: string }) {
  return (
    <pre className="font-body text-[13px] text-[#6B5B6E] leading-relaxed whitespace-pre-wrap">
      {content}
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Settings() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [language, setLanguage] = useState<Language>('en');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [savedTimezone, setSavedTimezone] = useState(false);
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

  // Dark mode - replaced by 3-state theme
  const [theme, setTheme] = useState<Theme>(() => loadSavedTheme());

  // Notification states
  const [notifEnergy, setNotifEnergy] = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);

  // Modal states
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  // Release loading
  const [releasing, setReleasing] = useState(false);

  // Content states (loaded from localStorage or defaults)
  const [helpContent, setHelpContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [termsContent, setTermsContent] = useState('');

  // Load user data on mount
  useEffect(() => {
    loadUserData();
    loadNotificationSettings();
    loadThemeSettings();
    loadContentSettings();
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
          const savedLang = (profile.language as Language) || localStorage.getItem('language') as Language || 'en';
          setLanguage(savedLang);
          setTimezone(profile.timezone || 'Asia/Shanghai');
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
    // notification_settings table has no columns yet - use defaults
    setNotifEnergy(true);
  }

  function loadThemeSettings() {
    const savedTheme = loadSavedTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }

  function loadContentSettings() {
    // Load content from localStorage, or use defaults
    const storedHelp = localStorage.getItem('platonic_help_content');
    const storedPrivacy = localStorage.getItem('platonic_privacy_policy');
    const storedTerms = localStorage.getItem('platonic_terms_of_service');

    setHelpContent(storedHelp || DEFAULT_HELP_CONTENT);
    setPrivacyContent(storedPrivacy || DEFAULT_PRIVACY_POLICY);
    setTermsContent(storedTerms || DEFAULT_TERMS_OF_SERVICE);
  }

  async function handleLanguageChange(newLang: Language) {
    setLanguage(newLang);
    setLang(newLang);
    setSavedLanguage(false);
    localStorage.setItem('language', newLang);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ language: newLang }).eq('id', user.id);
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
      setSavedLanguage(true);
      setTimeout(() => setSavedLanguage(false), 2000);
    }
  };

  const handleTimezoneChange = async (tz: string) => {
    setTimezone(tz);
    setSavedTimezone(false);
  };

  const handleTimezoneSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ timezone }).eq('id', user.id);
      }
      setSavedTimezone(true);
      toast.success('时区已保存');
      setTimeout(() => setSavedTimezone(false), 2000);
    } catch (e) {
      toast.error('时区保存失败');
    }
  };

  // 3-state theme handler
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    toast.success(t('theme.' + newTheme) || newTheme);
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
          <h2 className="font-body text-[28px] font-bold text-plum-900">{t('settings.title')}</h2>
        </div>
      </motion.div>

      <div className="px-8">
        {/* ── Section 1: Account Information ── */}
        <SectionCard delay={0}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-body text-[22px] font-bold text-plum-900">
              {t('settings.account')}
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
              { label: t('settings.username'), value: username, icon: <Edit3 size={14} className="text-pink-400" /> },
              { label: t('settings.email'), value: email, verified: true },
              { label: t('settings.registered'), value: registeredAt },
              {
                label: t('settings.companion'),
                value: (
                  <span className="flex items-center gap-1">
                    {companionName || t('settings.companionNone')}
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
              onClick={() => toast.info(t('settings.passwordComingSoon'))}
            >
              {t('settings.changePassword')}
            </button>
          </div>
        </SectionCard>

        {/* ── Section 2: Language Settings ── */}
        <SectionCard delay={0.1}>
          <h3 className="font-body text-[22px] font-bold text-plum-900 mb-1">
            {t('settings.language')}
          </h3>
          <p className="font-body text-[13px] text-muted-plum mb-4">
            {t('settings.languageDesc')}
          </p>

          <div className="flex flex-col gap-2 mb-5">
            {LANGUAGES.map((langOpt, i) => {
              const isSelected = language === langOpt.code;
              return (
                <motion.button
                  key={langOpt.code}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => {
                    handleLanguageChange(langOpt.code);
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
                    {langOpt.label}
                  </span>

                  {langOpt.tag && (
                    <span className="font-body text-[12px] text-muted-plum">
                      {langOpt.tag}
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
                  {t('common.saved')}
                </span>
              ) : (
                t('common.save')
              )}
            </button>
          </div>
        </SectionCard>

        {/* ── Section 3: Timezone Settings ── */}
        <SectionCard delay={0.12}>
          <h3 className="font-body text-[22px] font-bold text-plum-900 mb-1">
            {t('settings.timezone')}
          </h3>
          <p className="font-body text-[13px] text-muted-plum mb-4">
            {t('settings.timezoneDesc')}
          </p>

          <div className="flex flex-col gap-2 mb-5">
            {TIMEZONES.map((tz, i) => {
              const isSelected = timezone === tz.value;
              return (
                <motion.button
                  key={tz.value}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.02 }}
                  onClick={() => handleTimezoneChange(tz.value)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
                    transition-all duration-200 w-full text-left
                    ${isSelected ? 'bg-pink-50 border border-pink-200' : 'hover:bg-pink-50/50 border border-transparent'}
                  `}
                >
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

                  <span className="font-body text-[14px] text-plum-800 flex-1">
                    {tz.label}
                  </span>

                  <span className="font-body text-[12px] text-muted-plum">
                    {tz.region}
                  </span>

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
              onClick={handleTimezoneSave}
              className="
                px-6 py-2.5 rounded-xl accent-gradient text-white font-body font-semibold
                transition-all duration-150 hover:brightness-110 hover:shadow-glow active:brightness-95
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {savedTimezone ? (
                <span className="flex items-center gap-1.5">
                  <Check size={16} strokeWidth={2.5} />
                  {t('common.saved')}
                </span>
              ) : (
                t('common.save')
              )}
            </button>
          </div>
        </SectionCard>

        {/* ── Section 4: Theme Settings (3-state) ── */}
        <SectionCard delay={0.15}>
          <h3 className="font-body text-[22px] font-bold text-plum-900 mb-1">
            {t('settings.theme')}
          </h3>
          <p className="font-body text-[13px] text-muted-plum mb-5">
            {t('settings.themeDesc')}
          </p>

          {/* 3-state theme selection */}
          <div className="mb-6">
            <p className="font-body text-[13px] text-plum-800 mb-3">{t('settings.themeMode')}</p>
            <div className="flex gap-3">
              {THEME_OPTIONS.map((option) => {
                const isSelected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium
                      transition-all duration-200 border
                      ${isSelected
                        ? 'bg-pink-50 border-pink-400 text-pink-600'
                        : 'bg-white border-pink-100 text-plum-800 hover:bg-pink-50/50 hover:border-pink-200'
                      }
                    `}
                  >
                    <span className={isSelected ? 'text-pink-500' : 'text-muted-plum'}>
                      {option.icon}
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="font-body text-[12px] text-muted-plum mt-2">
              {theme === 'auto'
                ? t('theme.autoHint')
                : theme === 'dark'
                ? t('theme.darkHint')
                : t('theme.lightHint')}
            </p>
          </div>

          {/* Theme Swatches */}
          <div className="mb-6">
            <p className="font-body text-[13px] text-plum-800 mb-3">{t('settings.appearance')}</p>
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
          <div>
            <p className="font-body text-[13px] text-plum-800 mb-3">{t('settings.accentColor')}</p>
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
        </SectionCard>

        {/* ── Section 4: Notifications ── */}
        <SectionCard delay={0.2}>
          <h3 className="font-body text-[22px] font-bold text-plum-900 mb-4">
            {t('settings.notifications')}
          </h3>
          <NotificationToggle
            label={t('settings.notifEnergy')}
            description={t('settings.notifEnergyDesc')}
            enabled={notifEnergy}
            onChange={setNotifEnergy}
          />
          <NotificationToggle
            label={t('settings.notifDaily')}
            description={t('settings.notifDailyDesc')}
            enabled={notifDaily}
            onChange={setNotifDaily}
          />
        </SectionCard>

        {/* ── Section 5: Help Center ── */}
        <SectionCard delay={0.25}>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle size={20} className="text-pink-400" />
            <h3 className="font-body text-[22px] font-bold text-plum-900">
              {t('settings.help')}
            </h3>
          </div>
          <p className="font-body text-[13px] text-muted-plum mb-4">
            {t('settings.helpDesc')}
          </p>

          <CollapsibleSection title={t('settings.guide')} icon={<FileText size={16} className="text-pink-400" />}>
            <TextContent content={helpContent} />
          </CollapsibleSection>

          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-pink-50 rounded-xl border border-pink-100">
            <Mail size={16} className="text-pink-400" />
            <span className="font-body text-[13px] text-plum-800">
              {t('settings.contactEmail')}：
              <a
                href="mailto:corolar@corolas.top"
                className="text-pink-500 hover:text-pink-600 hover:underline transition-colors"
              >
                corolar@corolas.top
              </a>
            </span>
          </div>
        </SectionCard>

        {/* ── Section 6: Privacy Policy ── */}
        <SectionCard delay={0.3}>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-pink-400" />
            <h3 className="font-body text-[22px] font-bold text-plum-900">
              {t('settings.privacy')}
            </h3>
          </div>
          <p className="font-body text-[13px] text-muted-plum mb-4">
            {t('settings.privacyDesc')}
          </p>

          <div className="bg-pink-50/50 rounded-xl border border-pink-100 p-4 max-h-[400px] overflow-y-auto">
            <TextContent content={privacyContent} />
          </div>

          <p className="font-body text-[11px] text-muted-plum mt-3 text-center">
            {t('settings.updated')}
          </p>
        </SectionCard>

        {/* ── Section 7: Terms of Service ── */}
        <SectionCard delay={0.35}>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={20} className="text-pink-400" />
            <h3 className="font-body text-[22px] font-bold text-plum-900">
              {t('settings.terms')}
            </h3>
          </div>
          <p className="font-body text-[13px] text-muted-plum mb-4">
            {t('settings.termsDesc')}
          </p>

          <div className="bg-pink-50/50 rounded-xl border border-pink-100 p-4 max-h-[400px] overflow-y-auto">
            <TextContent content={termsContent} />
          </div>

          <p className="font-body text-[11px] text-muted-plum mt-3 text-center">
            {t('settings.updated')}
          </p>
        </SectionCard>

        {/* ── Section 8: Companion Management ── */}
        {companionId && (
          <SectionCard delay={0.4}>
            <h3 className="font-body text-[22px] font-bold text-plum-900 mb-1">
              {t('settings.companionMgmt')}
            </h3>
            <p className="font-body text-[13px] text-muted-plum mb-4">
              {t('settings.companionMgmtDesc')} {companionName || t('settings.companion')}
            </p>

            {/* Uniqueness notice */}
            <div className="flex items-start gap-3 p-3 mb-4 rounded-xl bg-amber-50 border border-amber-100">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="font-body text-[12px] text-amber-700 leading-relaxed">
                每个账号只能拥有一个伴侣。释放当前伴侣后，您可以创建新的伴侣。
                此操作将删除所有与当前伴侣相关的回忆数据，且不可撤销。
              </p>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-pink-50 border border-pink-100 mb-5">
              <img
                src={avatar}
                alt={companionName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-200"
              />
              <div className="flex-1">
                <p className="font-body text-[15px] font-semibold text-plum-900">
                  {companionName || t('settings.companion')}
                </p>
                <p className="font-body text-[12px] text-muted-plum">
                  {t('settings.companion')} · Active
                </p>
              </div>
              <HeartCrack size={18} className="text-pink-300" />
            </div>

            {/* Danger Zone Divider */}
            <div className="border-t border-red-100 pt-4">
              <p className="font-body text-[12px] font-semibold text-red-600 uppercase tracking-wider mb-3">
                Danger Zone
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
                {t('settings.releaseCompanion')}
              </button>
              <p className="text-[11px] text-muted-plum font-body mt-2 text-center">
                {t('settings.releaseConfirm')}
              </p>
            </div>
          </SectionCard>
        )}

        {/* ── Logout Button ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
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
            {t('common.logout')}
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
                  {t('settings.releaseCompanion')}
                </h3>
                <p className="font-body text-[13px] text-muted-plum">
                  {t('settings.releaseConfirm')}
                </p>
                <p className="font-body text-[12px] text-amber-600 mt-2">
                  释放后可以创建新的伴侣。
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReleaseModal(false)}
                  disabled={releasing}
                  className="flex-1 py-2.5 rounded-xl border border-pink-200 text-plum-900 font-body font-medium hover:bg-pink-50 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleReleaseCompanion}
                  disabled={releasing}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-body font-medium hover:bg-red-600 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {releasing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('common.confirm')
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
