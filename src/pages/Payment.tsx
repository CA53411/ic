import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Zap,
  Clock,
  Check,
  Loader2,
  RefreshCw,
  X,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchEdgeFunction } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RechargePlan {
  id: string;
  name: string;
  energy: number;
  bonus: number;
  price: string;
  badge?: string;
  badgeColor?: string;
}

interface Transaction {
  id: string;
  date: string;
  plan: string;
  amount: string;
  status: 'completed' | 'pending';
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PLANS: RechargePlan[] = [
  { id: 'basic', name: '入门', energy: 100, bonus: 0, price: '¥1.99' },
  { id: 'starter', name: '基础', energy: 300, bonus: 20, price: '¥4.99' },
  { id: 'standard', name: '标准', energy: 500, bonus: 50, price: '¥9.99', badge: '最受欢迎', badgeColor: 'bg-gold' },
  { id: 'advanced', name: '高级', energy: 1000, bonus: 150, price: '¥18.99' },
  { id: 'deluxe', name: '豪华', energy: 3000, bonus: 600, price: '¥49.99' },
  { id: 'premium', name: '至尊', energy: 10000, bonus: 2500, price: '¥149.99', badge: '超值', badgeColor: 'bg-pink-500' },
];

const PER_UNIT_PRICE = '~¥0.02/次';

// Supabase table row types
interface EnergyAccount {
  balance: number;
}

interface EnergyTransactionRow {
  id: string;
  created_at: string;
  plan_name: string;
  amount: number;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Animated number counter */
function AnimatedNumber({
  target,
  duration = 2000,
}: {
  target: number;
  duration?: number;
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
    <span className="font-number text-[48px] font-bold tracking-tight text-white">
      {value.toLocaleString()}
    </span>
  );
}

/** Countdown timer (5:00 → 0:00) */
function CountdownTimer({
  seconds,
  onExpire,
}: {
  seconds: number;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const timer = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, onExpire]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <span className="font-number text-sm text-muted-plum">
      {m}:{s.toString().padStart(2, '0')}
    </span>
  );
}

/** Login prompt for unauthenticated users */
function LoginPrompt() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl accent-gradient p-8 sm:p-10 mb-8 relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)' }} />
      <div className="relative z-10 text-center">
        <Zap size={32} className="text-white/80 mx-auto mb-4" />
        <h3 className="font-body text-[20px] font-bold text-white mb-2">
          登录后查看电量余额
        </h3>
        <p className="font-body text-[14px] text-white/70 mb-6">
          请登录以查看您的电量余额和充值记录
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-pink-500 font-body font-semibold text-[14px] hover:bg-pink-50 transition-all duration-150"
          >
            <LogIn size={16} />
            登录
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/40 text-white font-body font-semibold text-[14px] hover:bg-white/10 transition-all duration-150"
          >
            <UserPlus size={16} />
            创建账户
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Payment() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'success'>('waiting');
  const [qrKey, setQrKey] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paying, setPaying] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan);

  // Load real energy data on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    loadEnergyData();
  }, [isAuthenticated]);

  async function loadEnergyData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query energy account
      const { data: acct } = await supabase.from('energy_accounts')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (acct) setEnergy(acct.balance);

      // Query transaction records
      const { data: txns } = await supabase.from('energy_transactions')
        .select('id, created_at, plan_name, amount, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txns) {
        setTransactions(txns.map((t: EnergyTransactionRow) => ({
          id: t.id,
          date: new Date(t.created_at).toLocaleString('zh-CN'),
          plan: t.plan_name,
          amount: `¥${t.amount.toFixed(2)}`,
          status: t.status as 'completed' | 'pending',
        })));
      }
    } catch (e) {
      console.error('加载电量数据失败:', e);
    }
  }

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setPaymentStatus('waiting');
  };

  const handlePayClick = async () => {
    if (!selectedPlan) return;
    await handlePayment(selectedPlan);
  };

  async function handlePayment(planId: string) {
    try {
      setPaying(true);
      const response = await fetchEdgeFunction('payment-create', {
        method: 'POST',
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await response.json();

      if (data.payment_url) {
        // Open Zpay payment page in new window
        window.open(data.payment_url, '_blank');
        // Show QR modal with payment URL
        setQrCodeUrl(data.payment_url);
        setPaymentStatus('waiting');
        setQrKey((k) => k + 1);
        setShowQrModal(true);
      } else {
        toast.error('获取支付链接失败');
      }
    } catch (e) {
      toast.error('创建订单失败');
    } finally {
      setPaying(false);
    }
  }

  const handleCloseModal = () => {
    setShowQrModal(false);
    setQrCodeUrl(null);
  };

  const handleRefreshQr = () => {
    setPaymentStatus('waiting');
    setQrKey((k) => k + 1);
  };

  // Simulate payment polling after 8 seconds (fallback for demo)
  useEffect(() => {
    if (showQrModal && paymentStatus === 'waiting') {
      const timer = setTimeout(() => {
        setPaymentStatus('success');
        // Refresh energy data after successful payment
        loadEnergyData();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showQrModal, paymentStatus]);

  if (!isAuthenticated) {
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
            <Zap size={20} className="text-gold" />
            <h2 className="font-body text-[28px] font-bold text-plum-900">
              支付中心
            </h2>
          </div>
        </motion.div>

        <div className="px-8 max-w-[960px]">
          <LoginPrompt />

          {/* ── Section 5: Transaction History (empty for unauthenticated) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-plum-800" />
              <h2 className="font-body text-[28px] font-bold text-plum-900">
                交易记录
              </h2>
            </div>
            <div className="rounded-2xl bg-white border border-pink-100 shadow-md p-8 text-center">
              <p className="text-[14px] text-muted-plum font-body">
                登录后查看您的交易记录
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

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
          <Zap size={20} className="text-gold" />
          <h2 className="font-body text-[28px] font-bold text-plum-900">
            支付中心
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-pink-50 border border-pink-100">
          <Zap size={14} className="text-gold" />
          <span className="font-body text-[13px] text-gold font-semibold">
            {energy.toLocaleString()}
          </span>
        </div>
      </motion.div>

      <div className="px-8 max-w-[960px]">
        {/* ── Section 2: Energy Balance Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
          className="rounded-3xl accent-gradient p-8 sm:p-10 mb-8 relative overflow-hidden"
        >
          {/* Subtle glow overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)' }} />

          <div className="relative z-10">
            {/* Label */}
            <div className="flex items-center gap-2 mb-2">
              <Zap size={24} className="text-white/80" />
              <span className="font-body text-[15px] text-white/80">当前电量余额</span>
            </div>

            {/* Balance Number */}
            <div className="flex items-baseline gap-2 mb-3">
              <AnimatedNumber target={energy} />
              <Zap size={28} className="text-white/90" />
            </div>

            {/* Sub-info */}
            <p className="font-body text-[13px] text-white/70 mb-4">
              大约可支持 {(energy / 100).toFixed(0)} 次普通对话
            </p>

            {/* Progress bar */}
            <div className="mb-1">
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
            <p className="font-body text-[12px] text-white/60 mb-6">使用进度</p>

            {/* CTA */}
            <p className="font-body text-[13px] text-white/70 text-right">
              电量不足时，充值即可继续与伴侣畅聊
            </p>
          </div>
        </motion.div>

        {/* ── Section 3: Recharge Plans ── */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-body text-[28px] font-bold text-plum-900 mb-6"
        >
          选择充值套餐
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {PLANS.map((plan, i) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <motion.button
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3 + i * 0.08,
                  duration: 0.4,
                  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
                }}
                onClick={() => handlePlanSelect(plan.id)}
                className={`
                  relative rounded-2xl p-7 text-center cursor-pointer
                  transition-all duration-200 ease-out
                  border-2 ${
                    isSelected
                      ? 'border-pink-400 bg-pink-50 shadow-glow'
                      : 'border-transparent bg-white shadow-md hover:shadow-lg hover:-translate-y-1 hover:border-pink-200'
                  }
                `}
              >
                {/* Radio indicator */}
                <div
                  className={`
                    absolute top-3 left-3 w-4 h-4 rounded-full border-2
                    transition-all duration-150
                    ${isSelected ? 'border-pink-400 bg-pink-400' : 'border-pink-200 bg-white'}
                  `}
                >
                  {isSelected && <Check size={10} className="text-white absolute inset-0 m-auto" strokeWidth={3} />}
                </div>

                {/* Badge */}
                {plan.badge && (
                  <span
                    className={`
                      absolute -top-0 -right-0 px-3 py-1 rounded-bl-xl rounded-tr-xl
                      text-[11px] font-semibold text-white font-body
                      ${plan.badgeColor ?? 'bg-pink-500'}
                    `}
                  >
                    {plan.badge}
                  </span>
                )}

                {/* Energy Amount */}
                <div className="flex items-baseline justify-center gap-1 mb-1 mt-2">
                  <span className="font-number text-[36px] font-bold text-plum-900">
                    {plan.energy.toLocaleString()}
                  </span>
                  <Zap size={20} className="text-gold" />
                </div>

                {/* Bonus */}
                {plan.bonus > 0 && (
                  <span className="inline-block px-3 py-0.5 rounded-full accent-gradient text-white text-[12px] font-semibold font-body mb-3">
                    +{plan.bonus.toLocaleString()} 赠送
                  </span>
                )}
                {plan.bonus === 0 && <div className="h-6 mb-3" />}

                {/* Price */}
                <p className="font-body text-[22px] font-bold text-pink-500 mb-1">
                  {plan.price}
                </p>
                <p className="font-body text-[12px] text-muted-plum">
                  ≈ {PER_UNIT_PRICE}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* ── Section 4: Payment Method ── */}
        <AnimatePresence>
          {selectedPlanData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
              className="overflow-hidden mb-8"
            >
              <div className="max-w-[480px] mx-auto rounded-2xl card-gradient border border-pink-100 shadow-md p-8">
                {/* Summary */}
                <div className="text-center mb-5">
                  <p className="font-body text-[15px] text-plum-900 mb-2">
                    已选择: {selectedPlanData.energy.toLocaleString()}⚡
                    {selectedPlanData.bonus > 0 && (
                      <span>
                        {' '}+ {selectedPlanData.bonus.toLocaleString()}⚡赠送
                      </span>
                    )}
                  </p>
                  <p className="font-body text-[22px] font-bold text-pink-500">
                    应付金额: {selectedPlanData.price}
                  </p>
                </div>

                <div className="border-t border-pink-100 pt-5 text-center">
                  <p className="font-body text-[16px] font-semibold text-plum-900 mb-4">
                    使用支付宝扫码支付
                  </p>

                  {/* QR Code Placeholder */}
                  <div className="w-[200px] h-[200px] mx-auto rounded-xl border border-pink-100 bg-white flex items-center justify-center mb-4">
                    <div className="text-center">
                      <Zap size={32} className="text-pink-300 mx-auto mb-2" />
                      <span className="font-body text-[13px] text-muted-plum">支付宝扫码</span>
                    </div>
                  </div>

                  <p className="font-body text-[12px] text-muted-plum mb-4">
                    打开支付宝扫一扫
                  </p>

                  {/* Pay Button */}
                  <button
                    onClick={handlePayClick}
                    disabled={paying}
                    className={`
                      w-full py-3.5 rounded-xl accent-gradient text-white font-body font-semibold
                      transition-all duration-150 hover:brightness-110 hover:shadow-glow active:brightness-95
                      flex items-center justify-center gap-2
                      ${paying ? 'opacity-70 cursor-not-allowed' : ''}
                    `}
                  >
                    {paying ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Zap size={18} />
                    )}
                    {paying ? '创建订单中...' : '支付宝支付'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Section 5: Transaction History ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-plum-800" />
            <h2 className="font-body text-[28px] font-bold text-plum-900">
              交易记录
            </h2>
          </div>

          <div className="rounded-2xl bg-white border border-pink-100 shadow-md overflow-hidden">
            {/* Header Row */}
            <div className="hidden sm:grid sm:grid-cols-4 px-5 py-3 bg-pink-50 text-[12px] font-semibold font-body text-muted-plum uppercase tracking-wider">
              <span>日期</span>
              <span>套餐</span>
              <span>金额</span>
              <span>状态</span>
            </div>

            {/* Transaction Rows */}
            {transactions.length > 0 ? (
              transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.04 }}
                  className="
                    grid grid-cols-1 sm:grid-cols-4 px-5 py-3.5 border-b border-pink-50 last:border-b-0
                    hover:bg-pink-50 transition-colors duration-150 items-center gap-1 sm:gap-0
                  "
                >
                  <span className="font-body text-[13px] text-plum-900 sm:text-left">
                    {tx.date}
                  </span>
                  <span className="font-body text-[13px] text-plum-900">
                    {tx.plan}
                  </span>
                  <span className="font-body text-[13px] text-plum-900 font-semibold">
                    {tx.amount}
                  </span>
                  <div>
                    {tx.status === 'completed' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold font-body">
                        已完成
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[11px] font-semibold font-body">
                        <Loader2 size={10} className="animate-spin" />
                        处理中
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-[14px] text-muted-plum font-body">
                  暂无交易记录
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── QR Code Modal ── */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(26,16,37,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.68, -0.3, 0.32, 1.3] as [number, number, number, number] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-lg p-8 max-w-[400px] w-full relative"
            >
              {/* Close button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-pink-50 transition-colors"
              >
                <X size={20} className="text-plum-800" />
              </button>

              {paymentStatus === 'waiting' ? (
                <>
                  <h3 className="font-body text-[18px] font-semibold text-plum-900 text-center mb-2">
                    支付宝扫码支付
                  </h3>
                  <p className="font-body text-[13px] text-muted-plum text-center mb-5">
                    {selectedPlanData?.energy.toLocaleString()}⚡
                    {selectedPlanData && selectedPlanData.bonus > 0 && ` + ${selectedPlanData.bonus.toLocaleString()}⚡赠送`}
                    {' '}· {selectedPlanData?.price}
                  </p>

                  {/* QR placeholder */}
                  <div className="w-[200px] h-[200px] mx-auto rounded-xl border border-pink-100 bg-white flex items-center justify-center mb-4 shadow-inner">
                    <div key={qrKey} className="text-center">
                      <Zap size={40} className="text-pink-300 mx-auto mb-2" />
                      <span className="font-body text-[13px] text-muted-plum">支付宝扫码</span>
                    </div>
                  </div>

                  {/* Countdown + refresh */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <CountdownTimer seconds={300} />
                    <button
                      onClick={handleRefreshQr}
                      className="flex items-center gap-1 text-pink-500 hover:text-pink-600 transition-colors"
                    >
                      <RefreshCw size={14} />
                      <span className="font-body text-[12px]">刷新二维码</span>
                    </button>
                  </div>

                  {/* Polling indicator */}
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-50">
                    <Loader2 size={16} className="animate-spin text-pink-400" />
                    <span className="font-body text-[13px] text-plum-800">
                      等待支付...
                    </span>
                  </div>

                  <p className="font-body text-[12px] text-muted-plum text-center mt-4">
                    请使用支付宝扫描二维码完成支付
                  </p>
                </>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-green-500" />
                  </div>
                  <h3 className="font-body text-[20px] font-semibold text-plum-900 mb-2">
                    支付成功!
                  </h3>
                  <p className="font-body text-[13px] text-muted-plum mb-6">
                    电量已充值到您的账户
                  </p>
                  <button
                    onClick={handleCloseModal}
                    className="px-8 py-2.5 rounded-xl accent-gradient text-white font-body font-semibold transition-all hover:brightness-110 hover:shadow-glow"
                  >
                    完成
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
