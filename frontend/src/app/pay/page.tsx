"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Gift, CheckCircle2, Crown, Zap, ShieldCheck } from 'lucide-react';

interface Plan {
    id: number;
    name: string;
    duration_days: number;
    price: number;
    description: string;
}

export default function PaymentPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [redeeming, setRedeeming] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const token = localStorage.getItem('user_token');
        if (!token) {
            router.push('/login');
            return;
        }

        let initialUser: any;
        try {
            initialUser = JSON.parse(token);
            if (!initialUser || (!initialUser.id && !initialUser.username)) {
                throw new Error('Invalid token');
            }
        } catch (e) {
            localStorage.removeItem('user_token');
            router.push('/login');
            return;
        }

        setUser(initialUser);
        fetchPlans();

        // Fetch latest data from server
        const syncUser = async () => {
            // Priority: use ID, fallback to username if ID is missing in old tokens
            const identifier = initialUser.id || initialUser.username;
            if (!identifier) return;

            try {
                const res = await fetch(`http://localhost:8000/api/user/info/${identifier}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.user) {
                        const updatedUser = { ...initialUser, ...data.user };
                        setUser(updatedUser);
                        localStorage.setItem('user_token', JSON.stringify(updatedUser));
                    }
                }
            } catch (err) {
                console.error('User sync failed', err);
            }
        };
        syncUser();
    }, [router]);

    const fetchPlans = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/subscription/plans');
            const data = await res.json();
            if (Array.isArray(data)) {
                setPlans(data);
                if (data.length > 0) setSelectedPlan(data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch plans');
        }
    };

    const handleCopy = (text: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => setMessage({ type: 'success', text: '邀请码已复制到剪贴板！' }))
                .catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setMessage({ type: 'success', text: '邀请码已复制！' });
        } catch (err) {
            setMessage({ type: 'error', text: '复制失败，请手动选择复制' });
        }
        document.body.removeChild(textArea);
    };

    const handlePay = async () => {
        if (!selectedPlan || !user) return;
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('http://localhost:8000/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    plan_id: selectedPlan
                }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data.url) {
                    window.location.href = data.url;
                }
            } else {
                setMessage({ type: 'error', text: data.detail || '支付请求失败' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: '网络请求失败' });
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (!inviteCode || !user) return;
        setRedeeming(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('http://localhost:8000/api/invite/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    code: inviteCode
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: '兑换成功！即将进入系统...' });
                // 更新本地过期时间
                const newUser = { ...user, expires_at: data.new_expiry };
                localStorage.setItem('user_token', JSON.stringify(newUser));
                setTimeout(() => router.push('/'), 2000);
            } else {
                setMessage({ type: 'error', text: data.detail || '兑换失败' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: '网络请求失败' });
        } finally {
            setRedeeming(false);
        }
    };

    return (
        <div style={containerStyle}>
            {/* Background Decorations */}
            <div style={blobStyle1}></div>
            <div style={blobStyle2}></div>

            <main style={mainStyle} className="animate-fadeIn">
                <header style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={titleStyle}>
                        <Crown size={32} style={{ marginRight: '12px', color: '#fbbf24' }} />
                        开通智弈 VIP 会员
                    </h1>
                    <p style={subtitleStyle}>获取专业 A 股量化诊断、AI 深度报告及全量数据访问权限</p>
                </header>

                <div style={gridContainer}>
                    {/* Left: Benefits */}
                    <section style={cardStyle}>
                        <h2 style={sectionTitleStyle}><ShieldCheck size={20} style={{ marginRight: '8px' }} />VIP 独享权益</h2>
                        <ul style={benefitList}>
                            <li style={benefitItem}>
                                <CheckCircle2 size={18} color="#10b981" />
                                <div>
                                    <div style={benefitTitle}>全量股票库访问</div>
                                    <div style={benefitDesc}>支持全市场 5000+ 股票实时行情与历史数据查询</div>
                                </div>
                            </li>
                            <li style={benefitItem}>
                                <CheckCircle2 size={18} color="#10b981" />
                                <div>
                                    <div style={benefitTitle}>AI 智能深度诊断</div>
                                    <div style={benefitDesc}>接入 DeepSeek 等顶尖大模型，提供结构化量价分析报告</div>
                                </div>
                            </li>
                            <li style={benefitItem}>
                                <CheckCircle2 size={18} color="#10b981" />
                                <div>
                                    <div style={benefitTitle}>高频 API 访问</div>
                                    <div style={benefitDesc}>每小时 20 次深度分析额度，满足专业投资者的研究需求</div>
                                </div>
                            </li>
                            <li style={benefitItem}>
                                <CheckCircle2 size={18} color="#10b981" />
                                <div>
                                    <div style={benefitTitle}>自选云同步</div>
                                    <div style={benefitDesc}>多设备实时同步自选池，第一时间捕捉市场动态</div>
                                </div>
                            </li>
                        </ul>
                    </section>

                    {/* Right: Payment Plans */}
                    <section style={cardStyle}>
                        <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>当前账号状态</div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{new Date(user?.expires_at) > new Date() ? 'VIP 会员 (生效中)' : 'VIP 已到期 / 未开通'}</span>
                                <span style={{ fontSize: '13px', fontWeight: 'normal', opacity: 0.8 }}>{user?.expires_at?.split(' ')[0]} 到期</span>
                            </div>
                        </div>

                        <h2 style={sectionTitleStyle}><Zap size={20} style={{ marginRight: '8px' }} />1. 选择套餐</h2>
                        <div style={plansContainer}>
                            {plans.map(plan => (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    style={{
                                        ...planCardStyle,
                                        borderColor: selectedPlan === plan.id ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                        background: selectedPlan === plan.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={planName}>{plan.name}</div>
                                        <div style={planDesc}>{plan.description}</div>
                                    </div>
                                    <div style={planPrice}>
                                        <span style={{ fontSize: '14px' }}>¥</span>
                                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{plan.price}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handlePay}
                            disabled={loading || !selectedPlan}
                            style={payButtonStyle}
                        >
                            {loading ? '准备支付中...' : '立即开通 (支付宝)'}
                        </button>

                        <div style={dividerStyle}>
                            <span style={dividerTextStyle}>使用兑换码</span>
                        </div>

                        <div style={inviteContainer}>
                            <Gift size={20} style={{ color: '#ec4899', position: 'absolute', left: '12px' }} />
                            <input
                                type="text"
                                placeholder="请输入 16 位系统兑换码"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                style={inviteInputStyle}
                            />
                            <button
                                onClick={handleRedeem}
                                disabled={redeeming || !inviteCode}
                                style={redeemButtonStyle}
                            >
                                {redeeming ? '...' : '兑换'}
                            </button>
                        </div>

                        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                            <h2 style={{ ...sectionTitleStyle, marginBottom: '16px' }}><ShieldCheck size={20} style={{ marginRight: '8px' }} />2. 邀请奖励</h2>
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
                                    邀请好友注册并成功购买，您将获得该套餐时长 <span style={{ color: '#fbbf24' }}>10% 的额外 VIP 天数</span>。
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: 'var(--bg-base)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-blue)', letterSpacing: '1px' }}>
                                        {user?.referral_code || '---'}
                                    </span>
                                    <button
                                        onClick={() => handleCopy(user?.referral_code || '')}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            color: 'var(--accent-blue)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        复制
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {
                    message.text && (
                        <div style={{
                            ...messageBoxStyle,
                            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: message.type === 'error' ? '#f87171' : '#34d399',
                            borderColor: message.type === 'error' ? '#ef4444' : '#10b981'
                        }}>
                            {message.text}
                        </div>
                    )
                }
            </main >

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div >
    );
}

// Styles
const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    padding: '60px 20px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'background-color 0.3s ease, color 0.3s ease'
};

const blobStyle1: React.CSSProperties = {
    position: 'fixed',
    top: '-10%',
    right: '-10%',
    width: '40%',
    height: '40%',
    background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)',
    opacity: 0.1,
    filter: 'blur(80px)',
    zIndex: 0
};

const blobStyle2: React.CSSProperties = {
    position: 'fixed',
    bottom: '-10%',
    left: '-10%',
    width: '40%',
    height: '40%',
    background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
    opacity: 0.1,
    filter: 'blur(80px)',
    zIndex: 0
};

const mainStyle: React.CSSProperties = {
    maxWidth: '900px',
    width: '100%',
    position: 'relative',
    zIndex: 1
};

const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    fontWeight: '800',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(to right, var(--text-primary), var(--text-secondary))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
};

const subtitleStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '16px'
};

const gridContainer: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: '40px'
};

const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: '24px',
    border: '1px solid var(--border-color)',
    padding: '32px',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-soft)'
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-primary)'
};

const benefitList: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
};

const benefitItem: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
};

const benefitTitle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px'
};

const benefitDesc: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5'
};

const plansContainer: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px'
};

const planCardStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderRadius: '16px',
    border: '2px solid',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
};

const planName: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)'
};

const planDesc: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '4px'
};

const planPrice: React.CSSProperties = {
    color: '#3b82f6',
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px'
};

const payButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)',
    transition: 'transform 0.2s active'
};

const dividerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
};

const dividerTextStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    padding: '0 12px',
    whiteSpace: 'nowrap'
};

const inviteContainer: React.CSSProperties = {
    display: 'flex',
    position: 'relative',
    alignItems: 'center',
    gap: '8px'
};

const inviteInputStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 12px 12px 40px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none'
};

const redeemButtonStyle: React.CSSProperties = {
    padding: '12px 16px',
    background: 'rgba(236, 72, 153, 0.1)',
    color: '#ec4899',
    border: '1px solid rgba(236, 72, 153, 0.2)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
};

const messageBoxStyle: React.CSSProperties = {
    marginTop: '24px',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid',
    textAlign: 'center',
    fontSize: '14px'
};
