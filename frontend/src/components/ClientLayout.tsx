"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import StockSearch from "@/components/StockSearch";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');

    useEffect(() => {
        // Initialize theme
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;
            document.documentElement.style.setProperty('--mouse-x', `${x}%`);
            document.documentElement.style.setProperty('--mouse-y', `${y}%`);
        };

        window.addEventListener('mousemove', handleMouseMove);

        const checkAuth = () => {
            const userToken = localStorage.getItem("user_token");
            const adminToken = localStorage.getItem("admin_logged_in");

            // Define public routes
            const isLoginPage = pathname === "/login";
            const isAdminRoute = pathname?.startsWith("/manage");

            if (!userToken && !adminToken && !isLoginPage && !isAdminRoute) {
                router.push("/login");
            } else if (userToken) {
                try {
                    setUser(JSON.parse(userToken));
                } catch (e) {
                    localStorage.removeItem("user_token");
                }
            }
            setIsReady(true);
        };

        checkAuth();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [pathname, router]);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const handleLogout = () => {
        localStorage.removeItem("user_token");
        router.push("/login");
    };

    if (!isReady) return null;

    // Sidebar should be hidden on login page or admin portal
    const hideSidebar = pathname === "/login" || pathname?.startsWith("/manage");

    if (hideSidebar) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
                <button
                    onClick={toggleTheme}
                    className="theme-toggle"
                    title="切换视觉风格"
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                {children}
            </div>
        );
    }

    const navItems = [
        { name: "市场概览", path: "/" },
        { name: "板块热点", path: "/sectors" },
        { name: "我的自选", path: "/watchlist" }
    ];

    return (
        <div className="dashboard-container">
            <button
                onClick={toggleTheme}
                className="theme-toggle"
                title="切换视觉风格"
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <aside className="sidebar">
                <div style={{ flex: 1 }}>
                    <div style={{
                        padding: '8px 0 24px 0',
                        marginBottom: '24px'
                    }}>
                        <h2 style={{
                            fontSize: '20px',
                            color: 'var(--text-primary)',
                            fontWeight: '600',
                            letterSpacing: '-0.5px'
                        }}>智弈 (MindNode)</h2>
                        <p className="secondary-text" style={{ marginTop: '2px' }}>多维度专业股票分析系统</p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <StockSearch />
                    </div>

                    <nav>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {navItems.map((item) => (
                                <li
                                    key={item.path}
                                    onClick={() => router.push(item.path)}
                                    className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span style={{ fontSize: '16px' }}>
                                        {item.name === "市场概览" && "📈"}
                                        {item.name === "板块热点" && "🔥"}
                                        {item.name === "我的自选" && "⭐"}
                                    </span>
                                    {item.name}
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* User section at bottom */}
                <div
                    style={{
                        padding: '20px 0',
                        borderTop: '1px solid var(--border-color)',
                        marginTop: 'auto'
                    }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                        padding: '0 8px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            border: '1px solid var(--border-color)'
                        }}>
                            👤
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {user?.username || '演示用户'}
                            </div>
                            <div className="secondary-text">普通成员</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn-danger"
                        style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '13px',
                            background: 'rgba(255, 69, 58, 0.1)',
                            color: '#ff453a',
                            border: '1px solid rgba(255, 69, 58, 0.15)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = '#ff453a';
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)';
                            e.currentTarget.style.color = '#ff453a';
                        }}
                    >
                        退出账户
                    </button>
                </div>
            </aside>
            <main className="main-content">
                <div className="animate-fadeInUp" style={{ width: '100%', height: '100%' }}>
                    {children}
                </div>
            </main>
        </div >
    );
}
