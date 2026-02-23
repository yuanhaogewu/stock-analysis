"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
    const router = useRouter();

    useEffect(() => {
        // 这里的逻辑通常是等待 3 秒后跳转回首页
        setTimeout(() => {
            router.push('/');
        }, 3000);
    }, [router]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0c10',
            color: 'white'
        }}>
            <CheckCircle size={80} color="#10b981" />
            <h1 style={{ marginTop: '24px', fontSize: '28px', fontWeight: 'bold' }}>支付成功！</h1>
            <p style={{ marginTop: '12px', color: '#94a3b8' }}>您的会员权益已激活，正在为您跳转回首页...</p>
        </div>
    );
}
