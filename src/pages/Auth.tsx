import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Check,
  X,
  Github,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2 | 3;

/* ------------------------------------------------------------------ */
/*  Validation helpers                                                 */
/* ------------------------------------------------------------------ */

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

interface PasswordCheck {
  label: string;
  met: boolean;
}

const getPasswordStrength = (password: string): { level: number; checks: PasswordCheck[] } => {
  const checks: PasswordCheck[] = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const metCount = checks.filter((c) => c.met).length;
  let level = 0;
  if (metCount >= 5) level = 4;
  else if (metCount >= 4) level = 3;
  else if (metCount >= 3) level = 2;
  else if (metCount >= 1) level = 1;
  return { level, checks };
};

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-rose-gold', 'bg-pink-400'];
const strengthTextColors = ['', 'text-red-400', 'text-orange-400', 'text-rose-gold', 'text-pink-400'];

/* ------------------------------------------------------------------ */
/*  Animation config                                                   */
/* ------------------------------------------------------------------ */

const easeBounce = [0.68, -0.3, 0.32, 1.3] as [number, number, number, number];
const easeSmooth = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const cardVariants = {
  hidden: { scale: 0.92, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: easeBounce, delay: 0.2 },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.4 + i * 0.06, duration: 0.4, ease: easeSmooth },
  }),
};

const tabContentVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: easeSmooth } },
  exit: (direction: number) => ({
    x: direction > 0 ? -30 : 30,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: easeSmooth } },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.25 },
  }),
};

/* ------------------------------------------------------------------ */
/*  Floating Orbs                                                      */
/* ------------------------------------------------------------------ */

function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute rounded-full blur-[80px]"
        style={{
          width: 300,
          height: 300,
          background: 'rgba(255,182,193,0.25)',
          top: '10%',
          left: '10%',
          animation: 'float-orb 14s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-[100px]"
        style={{
          width: 250,
          height: 250,
          background: 'rgba(232,160,191,0.2)',
          bottom: '15%',
          right: '10%',
          animation: 'float-orb 12s ease-in-out infinite',
          animationDelay: '3s',
        }}
      />
      <div
        className="absolute rounded-full blur-[90px]"
        style={{
          width: 200,
          height: 200,
          background: 'rgba(212,165,212,0.2)',
          top: '40%',
          right: '20%',
          animation: 'float-orb 16s ease-in-out infinite',
          animationDelay: '6s',
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success Checkmark (SVG animation)                                  */
/* ------------------------------------------------------------------ */

function SuccessCheckmark() {
  return (
    <motion.svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: easeBounce }}
    >
      <motion.circle
        cx="40"
        cy="40"
        r="36"
        stroke="#FF69B4"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.2 }}
      />
      <motion.path
        d="M26 40 L35 49 L54 30"
        stroke="#FF69B4"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut', delay: 0.8 }}
      />
    </motion.svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Password Strength Indicator                                        */
/* ------------------------------------------------------------------ */

function PasswordStrength({ password }: { password: string }) {
  const { level, checks } = getPasswordStrength(password);

  return (
    <div className="mt-2 space-y-2">
      {/* 4-segment bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full bg-pink-50 transition-colors duration-200"
          >
            <motion.div
              className={cn('h-full rounded-full', strengthColors[level] || 'bg-gray-200')}
              initial={{ width: 0 }}
              animate={{ width: level >= i ? '100%' : '0%' }}
              transition={{ duration: 0.2, ease: easeSmooth }}
            />
          </div>
        ))}
      </div>

      {/* Strength label */}
      {password.length > 0 && (
        <p className={cn('text-xs font-body font-medium', strengthTextColors[level])}>
          Password strength: {strengthLabels[level]}
        </p>
      )}

      {/* Rules checklist */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1.5">
            {check.met ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <X size={12} className="text-gray-300" />
            )}
            <span
              className={cn(
                'text-[11px] font-body',
                check.met ? 'text-green-600' : 'text-gray-400'
              )}
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Verification Code Input                                            */
/* ------------------------------------------------------------------ */

function VerificationCodeInput({
  value,
  onChange,
  onComplete,
}: {
  value: string[];
  onChange: (vals: string[]) => void;
  onComplete?: () => void;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const next = [...value];
    next[index] = char;
    onChange(next);
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
    if (next.every((v) => v !== '') && onComplete) {
      onComplete();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = text.split('').concat(Array(6 - text.length).fill(''));
    onChange(next);
    const focusIdx = Math.min(text.length, 5);
    inputsRef.current[focusIdx]?.focus();
    if (text.length === 6 && onComplete) {
      onComplete();
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {value.map((char, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={char}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            'w-12 h-14 text-center text-2xl font-number font-bold rounded-xl border transition-all duration-200 outline-none',
            'border-pink-200 text-plum-900',
            'focus:border-pink-400 focus:shadow-glow'
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Social Login Buttons                                               */
/* ------------------------------------------------------------------ */

function SocialLoginButtons() {
  const handleClick = () => {
    toast.error('Not authorised OAuth pathway, try another way', { position: 'top-center' });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-[#A093A5] font-body">Sign in with</p>
      <div className="flex gap-3">
        {/* Google */}
        <button
          onClick={() => handleClick()}
          className={cn(
            'w-11 h-11 rounded-full border border-pink-100 flex items-center justify-center',
            'bg-white/60 backdrop-blur-sm transition-all duration-150',
            'hover:bg-pink-50 hover:scale-105 active:scale-95'
          )}
          aria-label="Sign in with Google"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        </button>

        {/* GitHub */}
        <button
          onClick={() => handleClick()}
          className={cn(
            'w-11 h-11 rounded-full border border-pink-100 flex items-center justify-center',
            'bg-white/60 backdrop-blur-sm transition-all duration-150',
            'hover:bg-pink-50 hover:scale-105 active:scale-95'
          )}
          aria-label="Sign in with GitHub"
        >
          <Github size={20} className="text-[#2D1B2E]" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Login Form                                                         */
/* ------------------------------------------------------------------ */

function LoginForm({
  onSwitch,
  direction,
}: {
  onSwitch: () => void;
  direction: number;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address', { position: 'top-center' });
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 400);
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters', { position: 'top-center' });
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 400);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message || 'Login failed. Please try again.', { position: 'top-center' });
        return;
      }
      if (data.user) {
        toast.success('Welcome back!', { position: 'top-center' });
        setTimeout(() => navigate('/dashboard'), 800);
      }
    } catch (e) {
      console.error('Login error:', e);
      toast.error('Login failed. Please try again.', { position: 'top-center' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      key="login"
      custom={direction}
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      onSubmit={handleSubmit}
      className="space-y-4"
      autoComplete="off"
    >
      <motion.div
        custom={0}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="space-y-1.5"
      >
        <label className="block text-xs font-semibold text-[#6B5B6E] tracking-wide uppercase font-body">
          Email
        </label>
        <div className="relative">
          <Mail
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] pointer-events-none"
          />
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              'w-full h-12 pl-10 pr-4 rounded-xl border bg-white text-sm font-body text-plum-900',
              'border-pink-100 placeholder:text-[#A093A5]',
              'focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200'
            )}
          />
        </div>
      </motion.div>

      <motion.div
        custom={1}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="space-y-1.5"
      >
        <label className="block text-xs font-semibold text-[#6B5B6E] tracking-wide uppercase font-body">
          Password
        </label>
        <div className="relative">
          <Lock
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] pointer-events-none"
          />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(
              'w-full h-12 pl-10 pr-11 rounded-xl border bg-white text-sm font-body text-plum-900',
              'border-pink-100 placeholder:text-[#A093A5]',
              'focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] hover:text-pink-400 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => toast.info('Coming soon!', { position: 'top-center' })}
            className="text-xs text-pink-500 hover:underline font-body"
          >
            Forgot password?
          </button>
        </div>
      </motion.div>

      <motion.div
        custom={2}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setRememberMe(!rememberMe)}
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center transition-all duration-150',
            rememberMe
              ? 'bg-pink-400 border-pink-400'
              : 'border-pink-200 bg-white'
          )}
        >
          {rememberMe && <Check size={12} className="text-white" />}
        </button>
        <span className="text-xs text-[#6B5B6E] font-body">Remember me</span>
      </motion.div>

      <motion.div
        custom={3}
        variants={fieldVariants}
        initial="hidden"
        animate={shouldShake ? { x: [0, -6, 6, -6, 6, -6, 6, 0] } : 'visible'}
        transition={shouldShake ? { duration: 0.4 } : undefined}
      >
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full h-12 rounded-xl text-white font-semibold font-body text-sm',
            'accent-gradient transition-all duration-150',
            'hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2'
          )}
        >
          {isLoading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            />
          ) : (
            'Sign In'
          )}
        </motion.button>
      </motion.div>

      {/* Divider */}
      <motion.div
        custom={4}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-3 py-1"
      >
        <div className="flex-1 h-px bg-pink-100" />
        <span className="text-xs text-[#A093A5] font-body">or</span>
        <div className="flex-1 h-px bg-pink-100" />
      </motion.div>

      <motion.div
        custom={5}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <SocialLoginButtons />
      </motion.div>

      <motion.p
        custom={6}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="text-center text-xs text-[#A093A5] font-body pt-2"
      >
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-pink-500 font-semibold hover:underline"
        >
          Sign Up
        </button>
      </motion.p>

      {/* Test account hint */}
      <motion.p
        custom={7}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="text-center text-[11px] text-pink-400/70 font-body pt-1"
      >
        Test account: test@platonic.ai / Test123456
      </motion.p>
    </motion.form>
  );
}

/* ------------------------------------------------------------------ */
/*  Signup Form — Step 1: Basic Info                                   */
/* ------------------------------------------------------------------ */

function SignupStep1({
  formData,
  update,
  onNext,
  direction,
}: {
  formData: { username: string; email: string; password: string; confirmPassword: string };
  update: (field: string, value: string) => void;
  onNext: () => void;
  direction: number;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsDiffer =
    formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const canProceed =
    formData.username.length > 0 &&
    isValidEmail(formData.email) &&
    formData.password.length >= 8 &&
    passwordsMatch;

  return (
    <motion.div
      key="step1"
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="space-y-4"
    >
      {/* Username */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#6B5B6E] tracking-wide uppercase font-body">
          Nickname
        </label>
        <div className="relative">
          <User
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] pointer-events-none"
          />
          <input
            type="text"
            placeholder="A name for your companion to call you"
            maxLength={20}
            value={formData.username}
            onChange={(e) => update('username', e.target.value)}
            className={cn(
              'w-full h-12 pl-10 pr-14 rounded-xl border bg-white text-sm font-body text-plum-900',
              'border-pink-100 placeholder:text-[#A093A5]',
              'focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200'
            )}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[#A093A5] font-body">
            {formData.username.length}/20
          </span>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#6B5B6E] tracking-wide uppercase font-body">
          Email
        </label>
        <div className="relative">
          <Mail
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] pointer-events-none"
          />
          <input
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => update('email', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            className={cn(
              'w-full h-12 pl-10 pr-4 rounded-xl border bg-white text-sm font-body text-plum-900',
              'border-pink-100 placeholder:text-[#A093A5]',
              'focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200',
              touched.email && formData.email.length > 0 && !isValidEmail(formData.email)
                ? 'border-red-300 focus:border-red-400'
                : ''
            )}
          />
        </div>
        {touched.email && formData.email.length > 0 && !isValidEmail(formData.email) && (
          <p className="text-xs text-red-400 font-body">Please enter a valid email address</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#6B5B6E] tracking-wide uppercase font-body">
          Set Password
        </label>
        <div className="relative">
          <Lock
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] pointer-events-none"
          />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={(e) => update('password', e.target.value)}
            className={cn(
              'w-full h-12 pl-10 pr-11 rounded-xl border bg-white text-sm font-body text-plum-900',
              'border-pink-100 placeholder:text-[#A093A5]',
              'focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] hover:text-pink-400 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {formData.password.length > 0 && <PasswordStrength password={formData.password} />}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#6B5B6E] tracking-wide uppercase font-body">
          Confirm Password
        </label>
        <div className="relative">
          <Lock
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] pointer-events-none"
          />
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            className={cn(
              'w-full h-12 pl-10 pr-11 rounded-xl border bg-white text-sm font-body text-plum-900',
              'border-pink-100 placeholder:text-[#A093A5]',
              'focus:outline-none focus:border-pink-400 focus:shadow-glow transition-all duration-200',
              passwordsMatch && 'border-green-300 focus:border-green-400',
              passwordsDiffer && 'border-red-300 focus:border-red-400'
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A093A5] hover:text-pink-400 transition-colors"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {passwordsMatch && (
            <Check size={18} className="absolute right-12 top-1/2 -translate-y-1/2 text-green-500" />
          )}
        </div>
        {passwordsDiffer && (
          <p className="text-xs text-red-400 font-body">Passwords do not match</p>
        )}
      </div>

      {/* Next button */}
      <motion.button
        type="button"
        disabled={!canProceed}
        whileHover={canProceed ? { scale: 1.02 } : {}}
        whileTap={canProceed ? { scale: 0.98 } : {}}
        onClick={onNext}
        className={cn(
          'w-full h-12 rounded-xl text-white font-semibold font-body text-sm',
          'accent-gradient transition-all duration-150',
          'hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none',
          'mt-2'
        )}
      >
        Next
      </motion.button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Signup Form — Step 2: Email Verification                           */
/* ------------------------------------------------------------------ */

function SignupStep2({
  email,
  code,
  onCodeChange,
  onVerify,
  onBack,
  direction,
}: {
  email: string;
  code: string[];
  onCodeChange: (vals: string[]) => void;
  onVerify: () => void;
  onBack: () => void;
  direction: number;
}) {
  const [timer, setTimer] = useState(45);
  const [isResendActive, setIsResendActive] = useState(false);

  useEffect(() => {
    if (timer <= 0) {
      setIsResendActive(true);
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleResend = () => {
    setTimer(45);
    setIsResendActive(false);
    toast.success('Verification code resent!', { position: 'top-center' });
  };

  const isComplete = code.every((c) => c !== '');

  return (
    <motion.div
      key="step2"
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center">
            <Mail size={32} className="text-pink-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-plum-900 font-body">Verify your email</h2>
        <p className="text-sm text-[#6B5B6E] font-body leading-relaxed">
          We&apos;ve sent a verification code to <strong className="text-plum-900">{email}</strong>,
          <br />
          please check your inbox and enter it below
        </p>
      </div>

      {/* Code input */}
      <VerificationCodeInput
        value={code}
        onChange={onCodeChange}
        onComplete={() => {
          /* auto-submits when all 6 digits entered */
        }}
      />

      {/* Resend timer */}
      <div className="text-center">
        {isResendActive ? (
          <button
            type="button"
            onClick={handleResend}
            className="text-sm text-pink-500 font-semibold hover:underline font-body"
          >
            Resend code
          </button>
        ) : (
          <p className="text-sm text-[#A093A5] font-body">
            Resend in <span className="font-number font-semibold text-pink-400">{timer}s</span>
          </p>
        )}
      </div>

      {/* Verify button */}
      <motion.button
        type="button"
        disabled={!isComplete}
        whileHover={isComplete ? { scale: 1.02 } : {}}
        whileTap={isComplete ? { scale: 0.98 } : {}}
        onClick={onVerify}
        className={cn(
          'w-full h-12 rounded-xl text-white font-semibold font-body text-sm',
          'accent-gradient transition-all duration-150',
          'hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        Verify
      </motion.button>

      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-[#A093A5] hover:text-pink-500 font-body transition-colors"
      >
        Back
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Signup Form — Step 3: Success                                      */
/* ------------------------------------------------------------------ */

function SignupStep3({ direction }: { direction: number }) {
  const navigate = useNavigate();

  return (
    <motion.div
      key="step3"
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="space-y-6 text-center"
    >
      <div className="flex justify-center">
        <SuccessCheckmark />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4, ease: easeSmooth }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-bold text-plum-900 font-body">
          Welcome to Platonic
        </h2>
        <p className="text-sm text-[#6B5B6E] font-body leading-relaxed">
          Your account has been created successfully.
          <br />
          Now, go meet your soulmate.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.3, ease: easeSmooth }}
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard')}
          className={cn(
            'w-full h-12 rounded-xl text-white font-semibold font-body text-sm',
            'accent-gradient hover:shadow-glow transition-all duration-150'
          )}
        >
          Enter Platonic
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Auth Page                                                     */
/* ------------------------------------------------------------------ */

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [tabDirection, setTabDirection] = useState(1);
  const [stepDirection, setStepDirection] = useState(1);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [signupForm, setSignupForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(''));

  const switchMode = (newMode: AuthMode) => {
    setTabDirection(newMode === 'signup' ? 1 : -1);
    setMode(newMode);
    setSignupStep(1);
    setSignupForm({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const updateSignup = useCallback((field: string, value: string) => {
    setSignupForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const goToStep = (step: SignupStep) => {
    setStepDirection(step > signupStep ? 1 : -1);
    setSignupStep(step);
  };

  const handleSignupNext = async () => {
    setStepDirection(1);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          data: { nickname: signupForm.username },
        },
      });
      if (error) {
        toast.error(error.message || 'Signup failed. Please try again.', { position: 'top-center' });
        return;
      }
      if (data.user) {
        setSignupStep(2);
        toast.success('Please check your email for the verification code!', { position: 'top-center' });
      }
    } catch (e) {
      console.error('Signup error:', e);
      toast.error('Signup failed. Please try again.', { position: 'top-center' });
    }
  };

  const handleVerify = async () => {
    setStepDirection(1);
    try {
      const token = verificationCode.join('');
      const { data, error } = await supabase.auth.verifyOtp({
        email: signupForm.email,
        token,
        type: 'signup',
      });
      if (error) {
        toast.error(error.message || 'Verification failed. Please try again.', { position: 'top-center' });
        return;
      }
      if (data.user) {
        setSignupStep(3);
        toast.success('Email verified!', { position: 'top-center' });
      }
    } catch (e) {
      console.error('Verification error:', e);
      toast.error('Verification failed. Please try again.', { position: 'top-center' });
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden breathing-gradient px-4">
      <FloatingOrbs />

      {/* Auth Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'relative z-10 w-full max-w-[420px] rounded-3xl p-8 md:p-10',
          'bg-white/85 backdrop-blur-xl',
          'border border-pink-200/30',
          'shadow-lg'
        )}
        style={{
          boxShadow: '0 8px 32px rgba(45,27,46,0.12), 0 0 60px rgba(255,182,193,0.15)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={28} className="text-pink-400" />
            <span className="text-2xl font-display text-pink-400">Platonic</span>
          </div>
          <p className="text-sm text-[#A093A5] font-body">Your AI Virtual Companion</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-pink-50 rounded-full p-1">
            <button
              onClick={() => switchMode('login')}
              className={cn(
                'relative px-6 py-2 rounded-full text-sm font-semibold font-body transition-all duration-200',
                mode === 'login'
                  ? 'bg-white text-pink-500 shadow-sm'
                  : 'text-[#A093A5] hover:text-[#6B5B6E]'
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={cn(
                'relative px-6 py-2 rounded-full text-sm font-semibold font-body transition-all duration-200',
                mode === 'signup'
                  ? 'bg-white text-pink-500 shadow-sm'
                  : 'text-[#A093A5] hover:text-[#6B5B6E]'
              )}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Step indicator (signup only) */}
        {mode === 'signup' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'rounded-full transition-all duration-300',
                      signupStep >= step
                        ? 'w-2.5 h-2.5 bg-pink-400'
                        : 'w-2 h-2 bg-pink-100'
                    )}
                  />
                  {i < 2 && (
                    <div
                      className={cn(
                        'w-8 h-px rounded-full transition-colors duration-300',
                        signupStep > step ? 'bg-pink-400' : 'bg-pink-100'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form content */}
        <AnimatePresence mode="wait" custom={tabDirection}>
          {mode === 'login' ? (
            <LoginForm
              key="login-tab"
              onSwitch={() => switchMode('signup')}
              direction={tabDirection}
            />
          ) : (
            <div key="signup-flow">
              <AnimatePresence mode="wait" custom={stepDirection}>
                {signupStep === 1 && (
                  <SignupStep1
                    key="s1"
                    formData={signupForm}
                    update={updateSignup}
                    onNext={handleSignupNext}
                    direction={stepDirection}
                  />
                )}
                {signupStep === 2 && (
                  <SignupStep2
                    key="s2"
                    email={signupForm.email}
                    code={verificationCode}
                    onCodeChange={setVerificationCode}
                    onVerify={handleVerify}
                    onBack={() => goToStep(1)}
                    direction={stepDirection}
                  />
                )}
                {signupStep === 3 && <SignupStep3 key="s3" direction={stepDirection} />}
              </AnimatePresence>

              {signupStep === 1 && (
                <p className="text-center text-xs text-[#A093A5] font-body mt-4 pt-2">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-pink-500 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Nunito, sans-serif',
            fontSize: '13px',
          },
        }}
      />
    </div>
  );
}
