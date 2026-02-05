"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // If already logged in, go to home
        if (localStorage.getItem('user_token')) {
            router.push('/');
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            const res = await fetch('http://localhost:8000/api/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('user_token', JSON.stringify(data.user));
                router.push('/');
            } else {
                // Here we handle the specific messages requested by the user
                // The backend returns these in the 'detail' field
                setErrorMessage(data.detail || '登录过程中发生错误');
            }
        } catch (err) {
            setErrorMessage('网络连接失败，请检查后端服务是否运行');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '40px',
                background: '#1e293b',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid #334155'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>🚀 股票分析中心</h1>
                    <p style={{ color: '#94a3b8' }}>专业 A 股数据终端 · 智能诊断系统</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontSize: '14px' }}>用户名 (姓名)</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="请输入管理员分配的姓名"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none',
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                        <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontSize: '14px' }}>登录密码</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="请输入登录密码"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none',
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.1s',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? '身份校验中...' : '立即开启专业分析'}
                    </button>
                </form>

                {errorMessage && (
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px',
                        color: '#f87171',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        textAlign: 'center'
                    }}>
                        {errorMessage}
                    </div>
                )}

                <div style={{ marginTop: '32px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    未授权? 请联系开发者咨询开通
                </div>
            </div>
        </div>
    );
}
