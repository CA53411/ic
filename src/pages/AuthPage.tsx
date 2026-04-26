import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import {
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  AlertTriangle,
  Lock,
  Loader2,
  X,
  FileText,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Security helpers                                                   */
/* ------------------------------------------------------------------ */
function validatePassword(pwd: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push("至少 8 个字符");
  if (!/[A-Z]/.test(pwd)) errors.push("至少 1 个大写字母");
  if (!/[a-z]/.test(pwd)) errors.push("至少 1 个小写字母");
  if (!/[0-9]/.test(pwd)) errors.push("至少 1 个数字");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd))
    errors.push("至少 1 个特殊符号");
  return { valid: errors.length === 0, errors };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { setUser, setSession } = useStore();

  /* ---- Local state ---- */
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Registration sub-flow */
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  /* Post-registration email verification */
  const [needsEmailVerify, setNeedsEmailVerify] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [checkingVerification, setCheckingVerification] = useState(false);

  /* Session lock: prevent navigation before email verified */
  const [, _setPendingSession] = useState<any>(null);

  /* ---- Effects ---- */
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  /* Listen for auth state; if user lands back after clicking email link */
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        /* Check email_confirmed_at */
        const confirmed = !!session.user?.email_confirmed_at;
        if (confirmed) {
          setSession(session);
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString(),
          });
          setNeedsEmailVerify(false);
          _setPendingSession(null);
          navigate("/onboard");
        }
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---- Handlers ---- */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        if (signInErr.message.includes("Invalid login")) {
          setError("邮箱或密码错误。如果尚未注册，请先注册。");
        } else if (signInErr.message.includes("Email not confirmed")) {
          setError("邮箱尚未验证。请查收验证邮件。");
          setNeedsEmailVerify(true);
        } else {
          setError(signInErr.message);
        }
        setLoading(false);
        return;
      }

      /* Verify email_confirmed_at server-side */
      const confirmed = !!data.user?.email_confirmed_at;
      if (!confirmed) {
        _setPendingSession(data.session);
        setNeedsEmailVerify(true);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setUser({
        id: data.user.id,
        email: data.user.email || undefined,
        created_at: data.user.created_at || new Date().toISOString(),
        updated_at: data.user.updated_at || new Date().toISOString(),
      });
      navigate("/onboard");
    } catch (err: any) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setError(`密码强度不足：${pwdCheck.errors.join("、")}`);
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (!agreedTerms || !agreedPrivacy) {
      setError("请阅读并同意服务条款和隐私政策");
      return;
    }

    setLoading(true);
    try {
      const { data: _regData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?verified=true`,
        },
      });

      if (signUpErr) {
        if (signUpErr.message.includes("already registered")) {
          setError("该邮箱已注册。请直接登录。");
          setMode("login");
        } else {
          setError(signUpErr.message);
        }
        setLoading(false);
        return;
      }

      /* Successful registration → require email verification */
      setNeedsEmailVerify(true);
      setResendTimer(60);
    } catch (err: any) {
      setError("注册失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) {
        setError(error.message);
      } else {
        setResendTimer(60);
        setError("");
      }
    } catch {
      setError("发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    /* Refresh session to see if email is now confirmed */
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      const confirmed = !!data.session.user?.email_confirmed_at;
      if (confirmed) {
        setSession(data.session);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || undefined,
          created_at: data.session.user.created_at || new Date().toISOString(),
          updated_at: data.session.user.updated_at || new Date().toISOString(),
        });
        setNeedsEmailVerify(false);
        navigate("/onboard");
        return;
      }
    }
    setError("邮箱尚未验证。请检查邮件并点击验证链接。");
    setCheckingVerification(false);
  };

  const resetAll = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAgreedTerms(false);
    setAgreedPrivacy(false);
    setError("");
    setNeedsEmailVerify(false);
    _setPendingSession(null);
  };

  /* ---- Render: email verification gate ---- */
  if (needsEmailVerify) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FF1493]/10 border border-[#FF1493]/30 flex items-center justify-center mb-6">
            <Mail className="w-7 h-7 text-[#FF1493]" />
          </div>
          <h2 className="text-2xl font-light tracking-wider mb-3">验证你的邮箱</h2>
          <p className="text-white/40 text-sm mb-6 leading-relaxed">
            为了保障你的账号安全，我们已向
            <br />
            <span className="text-[#FF1493]">{email || "你的邮箱"}</span>
            <br />
            发送了一封验证邮件。请点击邮件中的链接完成验证。
          </p>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckVerification}
              disabled={checkingVerification}
              className="w-full py-3 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm tracking-wider hover:bg-[#FF1493]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkingVerification ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {checkingVerification ? "检查中..." : "我已完成验证"}
            </motion.button>

            <button
              onClick={handleResendVerification}
              disabled={resendTimer > 0 || loading}
              className="w-full py-3 text-white/30 text-sm hover:text-white/50 transition-colors disabled:opacity-30"
            >
              {resendTimer > 0 ? `重新发送 (${resendTimer}s)` : "重新发送验证邮件"}
            </button>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm flex items-center gap-1 justify-center"
              >
                <AlertTriangle className="w-3 h-3" />
                {error}
              </motion.p>
            )}

            <button
              onClick={resetAll}
              className="text-white/20 text-xs hover:text-white/40 transition-colors mt-4"
            >
              使用其他邮箱
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---- Render: normal auth ---- */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Language switch (decorative) */}
      <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-white/20">
        <button className="px-2 py-1 text-[#FF1493]/60">中</button>
        <span>/</span>
        <button className="px-2 py-1 text-white/20 hover:text-white/40">EN</button>
      </div>

      <motion.button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 text-sm"
        whileHover={{ x: -3 }}
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-[#FF1493]/30 mb-6"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Shield className="w-7 h-7 text-[#FF1493]" strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-2xl font-light tracking-wider mb-2">
            {mode === "login" ? "安全登录" : "安全注册"}
          </h2>
          <p className="text-white/40 text-sm">
            {mode === "login"
              ? "你的羁绊，需要被妥善保护"
              : "创建一个安全的数字身份"}
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-white/40 text-xs mb-2 ml-1">
              <Mail className="w-3 h-3" />
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="name@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-1 focus:ring-[#FF1493]/30 transition-all"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-white/40 text-xs mb-2 ml-1">
              <Lock className="w-3 h-3" />
              密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder={mode === "register" ? "至少8位，含大小写+数字+符号" : "输入密码"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-1 focus:ring-[#FF1493]/30 transition-all pr-12"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password for register */}
          <AnimatePresence>
            {mode === "register" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4">
                  <label className="flex items-center gap-1.5 text-white/40 text-xs mb-2 ml-1">
                    <Lock className="w-3 h-3" />
                    确认密码
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 focus:ring-1 focus:ring-[#FF1493]/30 transition-all"
                    required={mode === "register"}
                  />
                </div>

                {/* Password strength indicator */}
                <div className="mt-3 space-y-1">
                  {[
                    { label: "至少 8 个字符", test: password.length >= 8 },
                    { label: "含大写字母", test: /[A-Z]/.test(password) },
                    { label: "含小写字母", test: /[a-z]/.test(password) },
                    { label: "含数字", test: /[0-9]/.test(password) },
                    { label: "含特殊符号", test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div
                        className={`w-3 h-3 rounded-full flex items-center justify-center transition-colors ${
                          rule.test ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"
                        }`}
                      >
                        {rule.test && <CheckCircle className="w-2.5 h-2.5" />}
                      </div>
                      <span className={rule.test ? "text-green-400/80" : "text-white/20"}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Terms & Privacy */}
                <div className="mt-5 space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FF1493] rounded border-white/20"
                    />
                    <span className="text-xs text-white/40 leading-relaxed">
                      我已阅读并同意
                      <button
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="text-[#FF1493]/70 hover:text-[#FF1493] underline mx-1"
                      >
                        服务条款
                      </button>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedPrivacy}
                      onChange={(e) => setAgreedPrivacy(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FF1493] rounded border-white/20"
                    />
                    <span className="text-xs text-white/40 leading-relaxed">
                      我已阅读并同意
                      <button
                        type="button"
                        onClick={() => setShowPrivacy(true)}
                        className="text-[#FF1493]/70 hover:text-[#FF1493] underline mx-1"
                      >
                        隐私政策
                      </button>
                    </span>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading || (mode === "register" && (!agreedTerms || !agreedPrivacy))}
            className="w-full py-3 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm tracking-wider hover:bg-[#FF1493]/30 transition-all duration-300 disabled:opacity-30 flex items-center justify-center gap-2 mt-6"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "处理中..." : mode === "login" ? "安全登录" : "安全注册"}
          </motion.button>
        </form>

        {/* Toggle mode */}
        <p className="text-center mt-6 text-white/30 text-sm">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              resetAll();
            }}
            className="text-[#FF1493]/70 hover:text-[#FF1493] ml-1 transition-colors"
          >
            {mode === "login" ? "注册" : "登录"}
          </button>
        </p>
      </motion.div>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-dark rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#FF1493]" />
                  <h3 className="text-lg font-light">服务条款</h3>
                </div>
                <button onClick={() => setShowTerms(false)} className="text-white/30 hover:text-white/60">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-sm text-white/50 leading-relaxed space-y-4">
                <p><strong className="text-white/70">1. 服务概述</strong><br/>Platonic 是一款柏拉图式AI虚拟伴侣产品，旨在为用户提供情感陪伴和对话服务。本平台所提供的服务不构成心理咨询、医疗建议或专业治疗。</p>
                <p><strong className="text-white/70">2. 用户账号</strong><br/>用户需使用有效的电子邮箱注册账号。每位用户仅限拥有一个活跃伴侣。用户有责任保护自己的账号信息安全，包括密码和登录凭据。</p>
                <p><strong className="text-white/70">3. 年龄限制</strong><br/>使用本服务的最低年龄为18周岁。如果我们发现任何未满18周岁的用户，将立即终止其账号访问权限并删除相关数据。</p>
                <p><strong className="text-white/70">4. 数据使用</strong><br/>用户与AI伴侣的对话内容将被存储用于提供个性化服务。我们不会将用户的对话内容出售给第三方。详见隐私政策。</p>
                <p><strong className="text-white/70">5. 禁止行为</strong><br/>禁止利用本服务进行任何非法活动、传播有害内容、试图操纵或逆向工程AI系统。违规将导致账号永久封禁。</p>
                <p><strong className="text-white/70">6. 知识产权</strong><br/>Platonic 平台的所有代码、设计和品牌资产均受版权保护。用户生成的人格描述归用户所有，但我们保留将其用于改进服务的匿名化使用权。</p>
                <p><strong className="text-white/70">7. 服务变更</strong><br/>我们保留随时修改或终止服务的权利，恕不另行通知。重大变更将提前30天通过邮件通知用户。</p>
                <p><strong className="text-white/70">8. 责任限制</strong><br/>Platonic 及其运营方不对因使用或无法使用服务而产生的任何直接、间接、附带或后果性损害承担责任。</p>
                <p><strong className="text-white/70">9. 争议解决</strong><br/>本条款适用中华人民共和国法律。因本条款产生的任何争议，双方应首先通过友好协商解决；协商不成的，提交至服务提供方所在地有管辖权的人民法院诉讼解决。</p>
                <p><strong className="text-white/70">10. 联系方式</strong><br/>如有任何问题，请通过 platonic@corolas.top 联系我们。</p>
              </div>
              <button
                onClick={() => { setAgreedTerms(true); setShowTerms(false); }}
                className="w-full mt-6 py-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm hover:bg-[#FF1493]/30 transition-colors"
              >
                我同意
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-dark rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#FF1493]" />
                  <h3 className="text-lg font-light">隐私政策</h3>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="text-white/30 hover:text-white/60">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-sm text-white/50 leading-relaxed space-y-4">
                <p><strong className="text-white/70">1. 数据收集</strong><br/>我们收集以下数据以提供服务：电子邮箱（用于身份验证）、密码（经过哈希加密存储）、与AI伴侣的对话内容、人格配置信息。我们不收集真实姓名、身份证号或支付信息。</p>
                <p><strong className="text-white/70">2. 数据使用目的</strong><br/>对话内容仅用于：生成个性化回复、构建伴侣记忆系统、改善AI响应质量。所有数据处理均在加密环境中进行。</p>
                <p><strong className="text-white/70">3. 数据存储与安全</strong><br/>用户数据存储于Supabase提供的安全数据库中，采用TLS加密传输和AES-256加密存储。我们实施严格的访问控制，仅授权人员可接触生产数据。</p>
                <p><strong className="text-white/70">4. 数据共享</strong><br/>我们不会将用户个人数据出售、出租或交易给任何第三方。AI对话通过KIMI API处理时，仅传输必要的对话上下文，不传输用户身份信息。</p>
                <p><strong className="text-white/70">5. Cookie与追踪</strong><br/>我们仅使用必要的功能性Cookie维持用户登录状态。不使用第三方追踪Cookie或广告分析工具。</p>
                <p><strong className="text-white/70">6. 数据保留与删除</strong><br/>用户账号及所有关联数据在用户主动删除或账号闲置超过2年后将被永久删除。用户可随时通过设置页面申请数据导出或删除。</p>
                <p><strong className="text-white/70">7. 用户权利</strong><br/>根据适用法律，用户享有以下权利：访问权（查看自己的数据）、更正权（修改错误信息）、删除权（"被遗忘权"）、限制处理权、数据可携带权。</p>
                <p><strong className="text-white/70">8. 未成年人保护</strong><br/>我们不会在知情的情况下收集18岁以下未成年人的数据。如发现有未成年人使用服务，我们将立即删除其账号及全部数据。</p>
                <p><strong className="text-white/70">9. 政策更新</strong><br/>我们可能会不时更新本隐私政策。重大变更将在登录页面显著位置公示30天，并通过邮件通知用户。</p>
                <p><strong className="text-white/70">10. 联系方式</strong><br/>如对本隐私政策有任何疑问或行使您的权利，请联系 privacy@corolas.top。</p>
              </div>
              <button
                onClick={() => { setAgreedPrivacy(true); setShowPrivacy(false); }}
                className="w-full mt-6 py-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm hover:bg-[#FF1493]/30 transition-colors"
              >
                我同意
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
