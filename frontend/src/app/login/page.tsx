"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserLoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [captcha, setCaptcha] = useState({ id: '', svg: '' });
    const [captchaInput, setCaptchaInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchCaptcha = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/captcha');
            const data = await res.json();
            setCaptcha(data);
            setCaptchaInput('');
        } catch (err) {
            console.error('Failed to fetch captcha');
        }
    };

    useEffect(() => {
        if (localStorage.getItem('user_token')) {
            router.push('/');
        }
        fetchCaptcha();
    }, [router]);

    const handleModeSwitch = (newMode: 'login' | 'register' | 'forgot' | 'reset') => {
        setMode(newMode);
        setErrorMessage('');
        setSuccessMessage('');
        if (newMode === 'login' || newMode === 'register') {
            fetchCaptcha();
        }
        // Don't clear username if switching from login to forgot to keep context
        if (newMode !== 'forgot' && newMode !== 'reset') {
            setUsername('');
            setPassword('');
            setConfirmPassword('');
            setPhone('');
        }
    };

    const handleLogin = async () => {
        // Validation: Username should not be a phone number
        if (/^\d{8,}$/.test(username)) {
            setErrorMessage('用户名位置只能填写姓名，不能输入手机号');
            return;
        }

        try {
            const res = await fetch('http://localhost:8000/api/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    captcha_id: captcha.id,
                    captcha_code: captchaInput
                }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('user_token', JSON.stringify(data.user));
                router.push('/');
            } else {
                if (res.status === 404) {
                    setErrorMessage(`${data.detail}`);
                } else if (res.status === 401) {
                    setErrorMessage(`${data.detail}`);
                } else {
                    setErrorMessage(data.detail || '登录失败，请稍后重试');
                }
            }
        } catch (err) {
            setErrorMessage('网络连接失败，请检查服务器状态');
        } finally {
            if (errorMessage || loading) fetchCaptcha();
        }
    };

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            setErrorMessage('两次输入的密码不一致');
            return;
        }

        try {
            const res = await fetch('http://localhost:8000/api/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    phone,
                    captcha_id: captcha.id,
                    captcha_code: captchaInput
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccessMessage("注册完成！正在为您跳转到会员开通页面...");
                // 自动保存用户信息以便进入支付流程
                if (data.user) {
                    localStorage.setItem('user_token', JSON.stringify(data.user));
                    setTimeout(() => router.push('/pay'), 1500);
                } else {
                    setMode('login');
                }
            } else {
                setErrorMessage(data.detail || '注册失败');
            }
        } catch (err) {
            setErrorMessage('网络连接失败');
        } finally {
            fetchCaptcha();
        }
    };

    const handleVerifyIdentity = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/user/forgot-password/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, phone }),
            });

            const data = await res.json();

            if (res.ok) {
                setMode('reset');
                setErrorMessage('');
            } else {
                setErrorMessage(data.detail || '验证失败');
            }
        } catch (err) {
            setErrorMessage('操作超时，请重试');
        }
    };

    const handleResetPassword = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/user/forgot-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, phone, new_password: newPassword }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccessMessage('密码重置成功，请使用新密码登录');
                setMode('login');
                setPassword('');
            } else {
                setErrorMessage(data.detail || '重置失败');
            }
        } catch (err) {
            setErrorMessage('服务器异常');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        if (mode === 'login') await handleLogin();
        else if (mode === 'register') await handleRegister();
        else if (mode === 'forgot') await handleVerifyIdentity();
        else if (mode === 'reset') await handleResetPassword();

        setLoading(false);
    };

    const renderForm = () => {
        switch (mode) {
            case 'login':
                return (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>用户名 (姓名)</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="请输入您的姓名"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '28px' }}>
                            <label style={labelStyle}>登录密码</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="请输入登录密码"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </>
                );
            case 'register':
                return (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>真实姓名</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="请输入真实姓名"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>手机号码</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="请输入手机号码"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>设置密码</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="请设置登录密码"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '28px' }}>
                            <label style={labelStyle}>确认密码</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="请再次输入密码"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </>
                );
            case 'forgot':
                return (
                    <>
                        <div style={{ marginBottom: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                            请输入注册时的姓名与手机号以验证身份
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>姓名</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="请输入姓名"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '28px' }}>
                            <label style={labelStyle}>注册手机号</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="请输入手机号"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </>
                );
            case 'reset':
                return (
                    <>
                        <div style={{ marginBottom: '24px', textAlign: 'center', color: '#10b981', fontSize: '14px' }}>
                            验证成功！请设置您的新密码
                        </div>
                        <div style={{ marginBottom: '28px' }}>
                            <label style={labelStyle}>新密码</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="请输入新密码"
                                style={inputStyle}
                                required
                            />
                        </div>
                    </>
                );
        }
    };

    return (
        <div style={containerStyle}>
            <div className="card animate-fadeInUp" style={cardStyle}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <span style={{ fontSize: '32px' }}>📊</span>
                    </div>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '4px'
                    }}>智弈 (MindNode)</h1>
                    <p className="secondary-text">专业股票研投分析系统</p>
                </div>

                {(mode === 'login' || mode === 'register') && (
                    <div style={tabContainerStyle}>
                        <button
                            onClick={() => handleModeSwitch('login')}
                            style={{
                                ...tabStyle,
                                background: mode === 'login' ? 'var(--accent-blue)' : 'transparent',
                                color: mode === 'login' ? 'white' : 'var(--text-secondary)',
                            }}
                        >
                            用户登录
                        </button>
                        <button
                            onClick={() => handleModeSwitch('register')}
                            style={{
                                ...tabStyle,
                                background: mode === 'register' ? 'var(--accent-blue)' : 'transparent',
                                color: mode === 'register' ? 'white' : 'var(--text-secondary)',
                            }}
                        >
                            帐号注册
                        </button>
                    </div>
                )}

                {mode === 'forgot' && <h3 style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '18px', marginBottom: '24px' }}>🔑 找回密码</h3>}
                {mode === 'reset' && <h3 style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '18px', marginBottom: '24px' }}>🆕 重置密码</h3>}

                <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
                    {renderForm()}

                    {(mode === 'login' || mode === 'register') && (
                        <div style={{ marginBottom: '28px' }}>
                            <label style={labelStyle}>安全验证码</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={captchaInput}
                                    onChange={e => setCaptchaInput(e.target.value)}
                                    placeholder="代码"
                                    style={{ ...inputStyle, flex: 1 }}
                                    required
                                />
                                <div
                                    onClick={fetchCaptcha}
                                    style={{
                                        cursor: 'pointer',
                                        background: 'var(--bg-base)',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        height: '42px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        border: '1px solid var(--border-color)',
                                        transition: 'all 0.2s'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: captcha.svg }}
                                    title="点击刷新验证码"
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ ...submitButtonStyle, width: '100%', padding: '12px' }}
                    >
                        {loading ? '处理中...' : (
                            mode === 'login' ? '立即登录' :
                                mode === 'register' ? '完成注册' : '提交验证'
                        )}
                        {!loading && <span style={{ marginLeft: '4px' }}>→</span>}
                    </button>
                </form>

                {errorMessage && (
                    <div style={errorBoxStyle} className="animate-fadeInUp">
                        {errorMessage}
                        <div style={{ marginTop: '8px' }}>
                            {errorMessage.includes('不存在') && (
                                <button onClick={() => handleModeSwitch('register')} style={linkButtonStyle}>
                                    申请注册帐号
                                </button>
                            )}
                            {errorMessage.includes('密码错误') && (
                                <button onClick={() => handleModeSwitch('forgot')} style={linkButtonStyle}>
                                    密码自助找回
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div style={successBoxStyle} className="animate-fadeInUp">
                        {successMessage}
                    </div>
                )}

                <div style={{ marginTop: '28px', textAlign: 'center' }}>
                    {mode !== 'login' ? (
                        <button onClick={() => handleModeSwitch('login')} style={ghostLinkStyle}>
                            返回登录界面
                        </button>
                    ) : (
                        <button onClick={() => handleModeSwitch('forgot')} style={ghostLinkStyle}>
                            忘记登录密码？
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-base)',
    position: 'relative',
    overflow: 'hidden'
};

const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '400px',
    padding: '40px',
    zIndex: 1,
    background: 'var(--bg-card)',
    borderRadius: '18px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    border: '1px solid var(--border-color)'
};

const tabContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    marginBottom: '32px',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '3px',
    borderRadius: '10px'
};

const tabStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    fontSize: '12px',
    fontWeight: '600'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box'
};

const submitButtonStyle: React.CSSProperties = {
    marginTop: '8px'
};

const errorBoxStyle: React.CSSProperties = {
    marginTop: '24px',
    padding: '12px',
    background: 'rgba(255, 69, 58, 0.1)',
    borderRadius: '10px',
    color: 'var(--accent-red)',
    fontSize: '13px',
    textAlign: 'center',
    border: '1px solid rgba(255, 69, 58, 0.1)'
};

const successBoxStyle: React.CSSProperties = {
    marginTop: '24px',
    padding: '15px',
    background: 'rgba(50, 215, 75, 0.1)',
    borderRadius: '10px',
    color: 'var(--accent-green)',
    fontSize: '13px',
    textAlign: 'center',
    border: '1px solid rgba(50, 215, 75, 0.1)'
};

const linkButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    textDecoration: 'underline'
};

const ghostLinkStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '8px'
};
