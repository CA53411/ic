import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { useLang } from "../context/LangContext";
import {
  Mail, ArrowLeft, Eye, EyeOff, Shield, CheckCircle,
  AlertTriangle, Lock, Loader2, X, FileText,
} from "lucide-react";

function validatePassword(pwd: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push("至少 8 个字符 / Min 8 chars");
  if (!/[A-Z]/.test(pwd)) errors.push("大写字母 / Uppercase");
  if (!/[a-z]/.test(pwd)) errors.push("小写字母 / Lowercase");
  if (!/[0-9]/.test(pwd)) errors.push("数字 / Digit");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push("特殊符号 / Symbol");
  return { valid: errors.length === 0, errors };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setSession } = useStore();
  const { lang, setLang, t } = useLang();

  const verified = searchParams.get("verified") === "true";
  const [verifying, _setVerifying] = useState(verified);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [needsEmailVerify, setNeedsEmailVerify] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [checkingVerification, setCheckingVerification] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  /* Handle email verification callback */
  useEffect(() => {
    if (!verified) return;
    const processVerify = async () => {
      _setVerifying(true);
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        _setVerifying(false);
        return;
      }
      const user = data.session.user;
      if (user?.email_confirmed_at) {
        await supabase.rpc("mark_email_verified", { p_user_id: user.id });
        setSession(data.session);
        setUser({
          id: user.id,
          email: user.email || undefined,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString(),
        });
        setVerifySuccess(true);
        setTimeout(() => navigate("/onboard"), 1500);
      } else {
        _setVerifying(false);
      }
    };
    processVerify();
  }, [verified]);
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const confirmed = !!session.user?.email_confirmed_at;
        if (confirmed) {
          markVerifiedAndNavigate(session);
        }
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function markVerifiedAndNavigate(session: any) {
    try {
      await supabase.rpc("mark_email_verified", { p_user_id: session.user.id });
    } catch {
      // ignore
    }
    setSession(session);
    setUser({
      id: session.user.id,
      email: session.user.email || undefined,
      created_at: session.user.created_at || new Date().toISOString(),
      updated_at: session.user.updated_at || new Date().toISOString(),
    });
    setNeedsEmailVerify(false);
    navigate("/onboard");
  }

  /* Check DB-level email verification */
  async function isEmailVerifiedDB(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from("user_preferences")
      .select("email_verified")
      .eq("user_id", userId)
      .single();
    return data?.email_verified === true;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateEmail(email)) { setError(t("errorEmail")); return; }
    if (!password) { setError(t("errorPassword")); return; }

    setLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError(signInErr.message.includes("Invalid") ? t("errorLogin") : signInErr.message);
        setLoading(false);
        return;
      }

      /* Double-gate: DB verification check */
      const dbVerified = await isEmailVerifiedDB(data.user.id);
      const authVerified = !!data.user.email_confirmed_at;

      if (!dbVerified && !authVerified) {
        setNeedsEmailVerify(true);
        setLoading(false);
        return;
      }

      // If auth says verified but DB doesn't, sync it
      if (authVerified && !dbVerified) {
        await supabase.rpc("mark_email_verified", { p_user_id: data.user.id });
      }

      setSession(data.session);
      setUser({ id: data.user.id, email: data.user.email || undefined,
        created_at: data.user.created_at || new Date().toISOString(),
        updated_at: data.user.updated_at || new Date().toISOString() });
      navigate("/onboard");
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateEmail(email)) { setError(t("errorEmail")); return; }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) { setError(`${t("errorPwdStrength")}: ${pwdCheck.errors.join(", ")}`); return; }
    if (password !== confirmPassword) { setError(t("errorPwdMatch")); return; }
    if (!agreedTerms || !agreedPrivacy) { setError(t("errorAgree")); return; }

    setLoading(true);
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth?verified=true` },
      });

      if (signUpErr) {
        if (signUpErr.message.includes("already registered")) {
          setError("该邮箱已注册 / Email already registered");
          setMode("login");
        } else {
          setError(signUpErr.message);
        }
        setLoading(false);
        return;
      }

      // Create user_preferences record with email_verified=false
      if (data.user) {
        await supabase.rpc("ensure_user_prefs", { p_user_id: data.user.id });
      }

      setNeedsEmailVerify(true);
      setResendTimer(60);
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) setError(error.message);
      else { setResendTimer(60); setError(""); }
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    try {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) {
        const confirmed = !!data.session.user?.email_confirmed_at;
        if (confirmed) {
          await markVerifiedAndNavigate(data.session);
          return;
        }
      }
      setError("邮箱尚未验证 / Email not verified yet");
    } catch {
      setError("验证失败 / Verification failed");
    }
    setCheckingVerification(false);
  };

  const resetAll = () => {
    setEmail(""); setPassword(""); setConfirmPassword("");
    setAgreedTerms(false); setAgreedPrivacy(false); setError("");
    setNeedsEmailVerify(false);
  };

  if (verifying && !verifySuccess) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-4">
        <div className="w-8 h-8 border-2 border-[#FF1493]/20 border-t-[#FF1493] rounded-full animate-spin mb-4" />
        <p className="text-white/30 text-sm">{lang === "zh" ? "正在验证..." : "Verifying..."}</p>
      </div>
    );
  }

  if (verifySuccess) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FF1493]/15 border border-[#FF1493]/30 flex items-center justify-center mb-4">
            <CheckCircle className="w-7 h-7 text-[#FF1493]" />
          </div>
          <h2 className="text-xl font-light tracking-wider mb-2">{lang === "zh" ? "验证成功" : "Verified"}</h2>
          <p className="text-white/40 text-sm">{lang === "zh" ? "正在进入你的世界..." : "Entering your world..."}</p>
        </motion.div>
      </div>
    );
  }

  if (needsEmailVerify) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-4 relative">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-xs">
          <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
          <span className="text-white/10">/</span>
          <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#FF1493]/10 border border-[#FF1493]/30 flex items-center justify-center mb-5">
            <Mail className="w-6 h-6 text-[#FF1493]" />
          </div>
          <h2 className="text-xl font-light tracking-wider mb-3">{t("verifyEmail")}</h2>
          <p className="text-white/40 text-sm mb-6 leading-relaxed">
            {t("verifySent")}<br />
            <span className="text-[#FF1493]">{email}</span>
          </p>
          <div className="space-y-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleCheckVerification} disabled={checkingVerification}
              className="w-full py-3 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm hover:bg-[#FF1493]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {checkingVerification ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {checkingVerification ? "..." : t("verifyDone")}
            </motion.button>
            <button onClick={handleResendVerification} disabled={resendTimer > 0 || loading}
              className="w-full py-2 text-white/30 text-sm hover:text-white/50 transition-colors disabled:opacity-30">
              {resendTimer > 0 ? `${t("resendWait")} (${resendTimer}s)` : t("resend")}
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={resetAll} className="text-white/20 text-xs hover:text-white/40">{t("useOther")}</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-1 text-xs z-10">
        <button onClick={() => setLang("zh")} className={`px-2 py-1 rounded ${lang==="zh"?"text-[#FF1493]":"text-white/20"}`}>中</button>
        <span className="text-white/10">/</span>
        <button onClick={() => setLang("en")} className={`px-2 py-1 rounded ${lang==="en"?"text-[#FF1493]":"text-white/20"}`}>EN</button>
      </div>

      <motion.button onClick={() => navigate("/")} className="absolute top-4 left-4 text-white/40 hover:text-white/80 flex items-center gap-1 text-sm"
        whileHover={{ x: -3 }}><ArrowLeft className="w-4 h-4" /> {t("back")}</motion.button>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#FF1493]/30 mb-4">
            <Shield className="w-5 h-5 text-[#FF1493]" />
          </div>
          <h2 className="text-xl font-light tracking-wider mb-1">{mode === "login" ? t("login") : t("register")}</h2>
          <p className="text-white/40 text-xs">{mode === "login" ? "Your bond deserves protection" : "Create a secure digital identity"}</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-3">
          <div>
            <label className="flex items-center gap-1 text-white/40 text-[10px] mb-1 ml-1"><Mail className="w-3 h-3" />{t("email")}</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="name@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 transition-all" required autoComplete="email" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-white/40 text-[10px] mb-1 ml-1"><Lock className="w-3 h-3" />{t("password")}</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder={mode === "register" ? t("passwordHint") : t("password")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 transition-all pr-10"
                required autoComplete={mode === "login" ? "current-password" : "new-password"} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mode === "register" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3">
                <div>
                  <label className="flex items-center gap-1 text-white/40 text-[10px] mb-1 ml-1"><Lock className="w-3 h-3" />{t("confirmPassword")}</label>
                  <input type={showPassword ? "text" : "password"} value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("confirmPassword")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF1493]/50 transition-all" required />
                </div>
                <div className="space-y-1">
                  {[
                    { label: "至少 8 个字符 / Min 8 chars", test: password.length >= 8 },
                    { label: "大写字母 / Uppercase", test: /[A-Z]/.test(password) },
                    { label: "小写字母 / Lowercase", test: /[a-z]/.test(password) },
                    { label: "数字 / Digit", test: /[0-9]/.test(password) },
                    { label: "特殊符号 / Symbol", test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className={`w-3 h-3 rounded-full flex items-center justify-center ${rule.test ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/20"}`}>
                        {rule.test && <CheckCircle className="w-2.5 h-2.5" />}
                      </div>
                      <span className={rule.test ? "text-green-400/80" : "text-white/20"}>{rule.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FF1493] rounded" />
                    <span className="text-[10px] text-white/40 leading-relaxed">
                      {t("agreeTerms")} <button type="button" onClick={() => setShowTerms(true)} className="text-[#FF1493]/70 hover:text-[#FF1493] underline">{t("terms")}</button>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FF1493] rounded" />
                    <span className="text-[10px] text-white/40 leading-relaxed">
                      {t("agreePrivacy")} <button type="button" onClick={() => setShowPrivacy(true)} className="text-[#FF1493]/70 hover:text-[#FF1493] underline">{t("privacy")}</button>
                    </span>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={loading || (mode === "register" && (!agreedTerms || !agreedPrivacy))}
            className="w-full py-2.5 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm tracking-wider hover:bg-[#FF1493]/30 transition-all disabled:opacity-30 flex items-center justify-center gap-2 mt-4"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "..." : mode === "login" ? t("loginBtn") : t("registerBtn")}
          </motion.button>
        </form>

        <p className="text-center mt-4 text-white/30 text-xs">
          {mode === "login" ? t("noAccount") : t("hasAccount")}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); resetAll(); }}
            className="text-[#FF1493]/70 hover:text-[#FF1493] ml-1 transition-colors">{mode === "login" ? t("registerBtn") : t("loginBtn")}</button>
        </p>
      </motion.div>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-dark rounded-2xl p-5 max-w-md w-full max-h-[75vh] overflow-y-auto border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-[#FF1493]" /><h3 className="text-base font-light">{t("termsTitle")}</h3></div>
                <button onClick={() => setShowTerms(false)} className="text-white/30 hover:text-white/60"><X className="w-5 h-5" /></button>
              </div>
              <div className="text-xs text-white/50 leading-relaxed space-y-3">
                <p><strong className="text-white/70">1. Overview</strong><br/>Platonic is a platonic AI virtual companion product, providing emotional companionship. Not medical or therapeutic advice.</p>
                <p><strong className="text-white/70">2. Account</strong><br/>One active companion per user. Users are responsible for protecting credentials.</p>
                <p><strong className="text-white/70">3. Age</strong><br/>Minimum age 18. Underage accounts will be terminated immediately.</p>
                <p><strong className="text-white/70">4. Data</strong><br/>Conversation content is stored for personalization. Not sold to third parties.</p>
                <p><strong className="text-white/70">5. Prohibited</strong><br/>Illegal activities, harmful content, reverse engineering. Violation = permanent ban.</p>
                <p><strong className="text-white/70">6. IP</strong><br/>All code, design and brand assets are copyrighted. User-generated persona descriptions belong to users.</p>
                <p><strong className="text-white/70">7. Changes</strong><br/>We reserve the right to modify or terminate service with 30 days notice for major changes.</p>
                <p><strong className="text-white/70">8. Liability</strong><br/>Platonic is not liable for any damages arising from use or inability to use the service.</p>
                <p><strong className="text-white/70">9. Governing Law</strong><br/>People's Republic of China. Disputes resolved by courts at service provider location.</p>
              </div>
              <button onClick={() => { setAgreedTerms(true); setShowTerms(false); }}
                className="w-full mt-4 py-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm hover:bg-[#FF1493]/30">{t("agreeBtn")}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-dark rounded-2xl p-5 max-w-md w-full max-h-[75vh] overflow-y-auto border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#FF1493]" /><h3 className="text-base font-light">{t("privacyTitle")}</h3></div>
                <button onClick={() => setShowPrivacy(false)} className="text-white/30 hover:text-white/60"><X className="w-5 h-5" /></button>
              </div>
              <div className="text-xs text-white/50 leading-relaxed space-y-3">
                <p><strong className="text-white/70">1. Collection</strong><br/>Email (auth), hashed password, conversation content, persona config. No real name, ID, or payment info.</p>
                <p><strong className="text-white/70">2. Purpose</strong><br/>Content is used for: personalized replies, companion memory, AI quality improvement. All encrypted.</p>
                <p><strong className="text-white/70">3. Storage</strong><br/>Supabase secure database. TLS transmission + AES-256 storage. Strict access control.</p>
                <p><strong className="text-white/70">4. Sharing</strong><br/>No selling, renting, or trading of personal data. KIMI API receives only conversation context, no identity.</p>
                <p><strong className="text-white/70">5. Cookies</strong><br/>Only functional cookies for login state. No third-party tracking or advertising.</p>
                <p><strong className="text-white/70">6. Retention</strong><br/>Data deleted after account deletion or 2 years of inactivity. Users may request export or deletion anytime.</p>
                <p><strong className="text-white/70">7. Rights</strong><br/>Access, correction, deletion (right to be forgotten), restriction, portability.</p>
                <p><strong className="text-white/70">8. Minors</strong><br/>We do not knowingly collect data from under 18. Discovered accounts are deleted immediately.</p>
                <p><strong className="text-white/70">9. Updates</strong><br/>Changes posted prominently for 30 days and emailed for major updates.</p>
              </div>
              <button onClick={() => { setAgreedPrivacy(true); setShowPrivacy(false); }}
                className="w-full mt-4 py-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl text-[#FF1493] text-sm hover:bg-[#FF1493]/30">{t("agreeBtn")}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
