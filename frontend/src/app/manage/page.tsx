"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showReset, setShowReset] = useState(false);
    const [resetAnswer, setResetAnswer] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:8000/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                localStorage.setItem("admin_logged_in", "true");
                router.push("/manage/dashboard");
            } else {
                setError("用户名或密码错误");
            }
        } catch (err) {
            setError("登录失败,请稍后重试");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        setError("");
        try {
            const response = await fetch("http://localhost:8000/api/admin/password-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answer: resetAnswer })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`您的登录密码是: ${data.password}`);
                setShowReset(false);
                setResetAnswer("");
            } else {
                setError("答案错误,请重试");
            }
        } catch (err) {
            setError("找回密码失败");
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '40px',
                background: 'rgba(26, 32, 44, 0.95)',
                backdropFilter: 'blur(10px)'
            }}>
                <h1 style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center' }}>
                    🔐 管理员登录
                </h1>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
                    股票分析系统后台管理
                </p>

                {!showReset ? (
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                                用户名
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                                密码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                                required
                            />
                        </div>

                        {error && (
                            <div style={{
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                color: '#ef4444',
                                fontSize: '14px',
                                marginBottom: '20px'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? '登录中...' : '登录'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => setShowReset(true)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-blue)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    textDecoration: 'underline'
                                }}
                            >
                                忘记密码?
                            </button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                                回答问题找回密码
                            </label>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                                这个系统的开发者是谁?
                            </p>
                            <input
                                type="text"
                                value={resetAnswer}
                                onChange={(e) => setResetAnswer(e.target.value)}
                                placeholder="请输入答案"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                color: '#ef4444',
                                fontSize: '14px',
                                marginBottom: '20px'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setShowReset(false);
                                    setResetAnswer("");
                                    setError("");
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                取消
                            </button>
                            <button
                                onClick={handlePasswordReset}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                确认
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
