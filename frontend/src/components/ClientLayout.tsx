"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import StockSearch from "@/components/StockSearch";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
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
    }, [pathname, router]);

    const handleLogout = () => {
        localStorage.removeItem("user_token");
        router.push("/login");
    };

    if (!isReady) return null;

    // Sidebar should be hidden on login page or admin portal
    const hideSidebar = pathname === "/login" || pathname?.startsWith("/manage");

    if (hideSidebar) {
        return <div style={{ minHeight: '100vh', background: '#0f172a' }}>{children}</div>;
    }

    const navItems = [
        { name: "市场概览", path: "/" },
        { name: "板块热点", path: "/sectors" },
        { name: "我的自选", path: "/watchlist" }
    ];

    return (
        <div className="dashboard-container">
            <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>股票分析工具</h2>
                    <StockSearch />
                    <nav style={{ marginTop: '20px' }}>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {navItems.map((item) => (
                                <li
                                    key={item.path}
                                    onClick={() => router.push(item.path)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #263238',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        marginBottom: '4px',
                                        backgroundColor: pathname === item.path ? 'rgba(79, 195, 247, 0.1)' : 'transparent',
                                        color: pathname === item.path ? '#4fc3f7' : '#94a3b8',
                                        fontWeight: pathname === item.path ? '600' : 'normal',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {item.name}
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* User section at bottom */}
                <div style={{ padding: '20px', borderTop: '1px solid #263238', marginTop: 'auto' }}>
                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#fff' }}>
                        👤 {user?.username || '用户'}
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        退出系统
                    </button>
                </div>
            </aside>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
