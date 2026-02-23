"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Loader } from 'lucide-react';

export default function MockPaymentPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const outTrade_no = searchParams.get('no');
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');

    const handleConfirm = async () => {
        if (!outTrade_no) return;
        setStatus('PROCESSING');
        try {
            const res = await fetch(`http://localhost:8000/api/payment/mock_confirm?out_trade_no=${outTrade_no}`);
            const data = await res.json();
            if (data.success) {
                setStatus('SUCCESS');
                // 更新本地存储的过期时间
                const token = localStorage.getItem('user_token');
                if (token) {
                    const user = JSON.parse(token);
                    user.expires_at = data.new_expiry;
                    localStorage.setItem('user_token', JSON.stringify(user));
                }
                setTimeout(() => router.push('/'), 2000);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (!outTrade_no) return <div style={{ color: 'white', padding: '100px', textAlign: 'center' }}>订单异常</div>;

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div style={iconBox}>
                    <ShieldCheck size={48} color="#3b82f6" />
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>模拟支付演示</h1>
                <p style={{ color: '#94a3b8', marginBottom: '32px' }}>订单号: {outTrade_no}</p>

                {status === 'IDLE' ? (
                    <>
                        <div style={infoBox}>
                            <p>检测到系统未配置正式支付宝密钥，已进入开发演示模式。</p>
                            <p style={{ marginTop: '8px', fontSize: '13px' }}>点击下方按钮将模拟支付成功并自动开通 VIP。</p>
                        </div>
                        <button onClick={handleConfirm} style={btnStyle}>
                            确认模拟支付 <ArrowRight size={18} />
                        </button>
                    </>
                ) : status === 'PROCESSING' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <Loader style={{ animation: 'spin 1s linear infinite' }} />
                        <p>正在验证交易并同步权益...</p>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#10b981', fontSize: '20px', fontWeight: 'bold' }}>支付成功！</div>
                        <p style={{ marginTop: '12px' }}>会员权益已实时开通，正在进入系统...</p>
                    </div>
                )}
            </div>
            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0c10',
    color: 'white'
};

const cardStyle: React.CSSProperties = {
    padding: '40px',
    background: '#1a1d23',
    borderRadius: '24px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid rgba(255,255,255,0.05)'
};

const iconBox: React.CSSProperties = {
    width: '80px',
    height: '80px',
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px'
};

const infoBox: React.CSSProperties = {
    background: 'rgba(59, 130, 246, 0.05)',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#3b82f6',
    textAlign: 'left',
    marginBottom: '24px',
    lineHeight: '1.6'
};

const btnStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
};
