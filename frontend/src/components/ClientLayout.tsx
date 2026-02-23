"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import StockSearch from "@/components/StockSearch";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/utils/imageUtils';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [platformName, setPlatformName] = useState('芯思维');
    const [platformNameEn, setPlatformNameEn] = useState('MindNode');
    const [platformSlogan, setPlatformSlogan] = useState('多维度股票AI分析系统');
    const [platformLogo, setPlatformLogo] = useState('');
    const [devInfo, setDevInfo] = useState({ name: '', phone: '', email: '', qr: '' });
    const [announcement, setAnnouncement] = useState('');
    const [showAnnouncement, setShowAnnouncement] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [profileData, setProfileData] = useState({
        username: '',
        avatar: '',
        phone: '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Cropping states
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

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
        fetchPlatformBasic();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [pathname, router]);

    useEffect(() => {
        if (!isReady) return;

        const baseTitle = `${platformName}(${platformNameEn}) - ${platformSlogan}`;

        const pathMap: Record<string, string> = {
            '/': '',
            '/sectors': '板块热点',
            '/watchlist': '我的自选',
            '/login': '登录',
            '/manage': '管理员登录',
            '/manage/dashboard': '管理后台',
        };

        if (pathname === '/') {
            document.title = baseTitle;
        } else if (pathname?.startsWith('/stock/')) {
            // 股票详情页由其页面内部根据股票名设置，此处仅做兜底
            if (document.title.indexOf(platformName) === -1) {
                document.title = `股票详情 - ${baseTitle}`;
            }
        } else {
            const pageName = pathMap[pathname || ''] || '';
            document.title = pageName ? `${pageName} - ${baseTitle}` : baseTitle;
        }
    }, [pathname, platformName, platformNameEn, platformSlogan, isReady]);

    const fetchPlatformBasic = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/config');
            if (res.ok) {
                const data = await res.json();
                setPlatformName(data.platform_name || '芯思维');
                setPlatformNameEn(data.platform_name_en || 'MindNode');
                setPlatformSlogan(data.platform_slogan || '多维度股票AI分析系统');
                setPlatformLogo(data.platform_logo || '');
                setDevInfo({
                    name: data.dev_name || '',
                    phone: data.dev_phone || '',
                    email: data.dev_email || '',
                    qr: data.dev_wechat_qr || ''
                });
                setAnnouncement(data.announcement_content || '');
            }
        } catch (e) { console.error('Error fetching platform basic info'); }
    };

    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                username: user.username || '',
                avatar: user.avatar || '',
                phone: user.phone || ''
            }));
        }
    }, [user]);

    const handleProfileUpdate = async () => {
        if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
            alert("两次输入的新密码不一致");
            return;
        }

        try {
            const res = await fetch(`http://localhost:8000/api/user/profile/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: profileData.username,
                    avatar: profileData.avatar,
                    phone: profileData.phone,
                    old_password: profileData.oldPassword,
                    new_password: profileData.newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert("资料更新成功");
                setUser(data.user);
                localStorage.setItem("user_token", JSON.stringify(data.user));
                setShowProfile(false);
                setProfileData(prev => ({ ...prev, oldPassword: '', newPassword: '', confirmPassword: '' }));
            } else {
                alert(data.detail || "更新失败");
            }
        } catch (e) {
            alert("网络错误，请稍后重试");
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setTempImageSrc(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
        // Reset input to allow same file selection
        e.target.value = '';
    };

    const handleCropSave = async () => {
        if (!tempImageSrc || !croppedAreaPixels) return;

        setIsUploading(true);
        try {
            const croppedBlob = await getCroppedImg(tempImageSrc, croppedAreaPixels, 200);
            const formData = new FormData();
            formData.append('file', croppedBlob, 'avatar.jpg');

            // 1. Upload to server
            const uploadRes = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (uploadRes.ok) {
                const newAvatarUrl = uploadData.url;

                // 2. Immediately update user profile in database to make it persistent/timely
                const profileRes = await fetch(`http://localhost:8000/api/user/profile/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avatar: newAvatarUrl })
                });
                const profileDataRes = await profileRes.json();

                if (profileRes.ok) {
                    const updatedUser = { ...profileDataRes.user };
                    // 3. Update local states and sync localStorage
                    setUser(updatedUser);
                    localStorage.setItem("user_token", JSON.stringify(updatedUser));

                    // Dispatch storage event to notify other potential listeners
                    window.dispatchEvent(new Event('storage'));

                    setShowCropper(false);
                    setTempImageSrc(null);
                } else {
                    alert(profileDataRes.detail || "头像同步失败");
                }
            } else {
                alert("头像上传失败");
            }
        } catch (e) {
            console.error(e);
            alert("裁切设置出错");
        } finally {
            setIsUploading(false);
        }
    };

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {platformLogo && (
                                <img
                                    src={platformLogo}
                                    alt="logo"
                                    style={{
                                        height: '32px',
                                        width: '32px',
                                        objectFit: 'contain',
                                        borderRadius: '4px',
                                        transform: 'translateY(-1px)'
                                    }}
                                />
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', whiteSpace: 'nowrap' }}>
                                    <h2 style={{
                                        fontSize: '19px',
                                        color: 'var(--text-primary)',
                                        fontWeight: '700',
                                        letterSpacing: '-0.3px',
                                        lineHeight: '1.2'
                                    }}>{platformName}</h2>
                                    <span style={{
                                        fontSize: '14px',
                                        color: 'var(--text-secondary)',
                                        fontWeight: '500',
                                        opacity: 0.7
                                    }}>{platformNameEn}</span>
                                </div>
                                <p style={{
                                    fontSize: '13.5px',
                                    color: 'var(--accent-blue)',
                                    opacity: 1,
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    letterSpacing: '0.01em',
                                    marginTop: '1px'
                                }}>{platformSlogan}</p>
                            </div>
                        </div>
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
                            <li
                                onClick={() => setShowAnnouncement(true)}
                                className="nav-item"
                                style={{ cursor: 'pointer' }}
                            >
                                <span style={{ fontSize: '16px' }}>📢</span>
                                平台公告
                            </li>
                            <li
                                onClick={() => setShowContact(true)}
                                className="nav-item"
                                style={{ cursor: 'pointer' }}
                            >
                                <span style={{ fontSize: '16px' }}>📞</span>
                                联系我们
                            </li>
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
                    <div
                        onClick={() => setShowProfile(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '16px',
                            padding: '10px 8px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div
                            key={`sidebar-avatar-${user?.avatar}`}
                            style={{
                                width: '40px',
                                height: '40px',
                                background: user?.avatar ? `url("${user.avatar}")` : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                border: '1px solid var(--border-color)',
                                flexShrink: 0,
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}>
                            {!user?.avatar && '👤'}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                                {user?.username || '演示用户'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div
                                    className="secondary-text"
                                    style={{
                                        color: (user?.expires_at && new Date(user.expires_at) > new Date()) ? 'var(--accent-blue)' : '#64748b',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        letterSpacing: '0.02em'
                                    }}
                                >
                                    {(user?.expires_at && new Date(user.expires_at) > new Date()) ? '🌟 PRO 会员' : '普通成员'}
                                </div>
                                {(user?.expires_at && new Date(user.expires_at) > new Date()) && (
                                    <div style={{ fontSize: '10px', color: '#64748b', opacity: 0.8 }}>
                                        {new Date(user.expires_at).toLocaleDateString()}到期
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/pay')}
                        style={{
                            width: '100%',
                            padding: '10px',
                            marginBottom: '8px',
                            fontSize: '13px',
                            background: 'linear-gradient(135deg, var(--accent-blue) 0%, #0056b3 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        ⚡ 尊享 VIP 特权
                    </button>
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
            {/* Announcement Modal */}
            {showAnnouncement && (
                <div
                    onClick={() => setShowAnnouncement(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff', // 强制白天模式底色
                            color: '#1d1d1f',      // 强制深色文字
                            width: '90%',
                            maxWidth: '600px',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0,0,0,0.05)',
                            position: 'relative',
                            '--text-primary': '#1d1d1f',
                            '--text-secondary': '#86868b',
                            '--border-color': 'rgba(0,0,0,0.1)'
                        } as any}
                    >
                        <button onClick={() => setShowAnnouncement(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                        <h2 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>📢 平台公告</h2>
                        <div style={{
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            color: 'var(--text-primary)',
                            lineHeight: '1.8',
                            fontSize: '15px'
                        }}>
                            {announcement.split('\n').map((line, i) => {
                                // Inline formatting parser helper
                                const formatInline = (text: string) => {
                                    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
                                    return parts.map((part, index) => {
                                        if (part.startsWith('**') && part.endsWith('**')) {
                                            return <strong key={index} style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
                                        }
                                        if (part.startsWith('`') && part.endsWith('`')) {
                                            return <code key={index} style={{ backgroundColor: 'rgba(59,130,246,0.1)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9em', color: 'var(--accent-blue)' }}>{part.slice(1, -1)}</code>;
                                        }
                                        return part;
                                    });
                                };

                                if (line.startsWith('# ')) return <h1 key={i} style={{ fontSize: '26px', fontWeight: '800', margin: '24px 0 16px 0', borderBottom: '2px solid var(--accent-blue)', paddingBottom: '8px', color: 'var(--text-primary)' }}>{line.slice(2)}</h1>;
                                if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '20px', fontWeight: '700', margin: '20px 0 12px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--text-primary)' }}>{line.slice(3)}</h2>;
                                if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '18px', fontWeight: '600', margin: '16px 0 8px 0', color: 'var(--text-primary)' }}>{line.slice(4)}</h3>;
                                if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ display: 'flex', gap: '8px', marginLeft: '12px', marginBottom: '8px' }}><span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>•</span><span>{formatInline(line.slice(2))}</span></div>;
                                if (line.startsWith('> ')) return <div key={i} style={{ borderLeft: '4px solid var(--accent-blue)', paddingLeft: '16px', margin: '12px 0', fontStyle: 'italic', opacity: 0.8 }}>{formatInline(line.slice(2))}</div>;
                                if (!line.trim()) return <div key={i} style={{ height: '16px' }}></div>;
                                return <p key={i} style={{ margin: '8px 0', textAlign: 'justify' }}>{formatInline(line)}</p>;
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Modal */}
            {showContact && (
                <div
                    onClick={() => setShowContact(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff', // 强制白天模式底色
                            color: '#1d1d1f',      // 强制深色文字
                            width: '90%',
                            maxWidth: '400px',
                            borderRadius: '24px',
                            padding: '32px',
                            boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0,0,0,0.05)',
                            position: 'relative',
                            textAlign: 'center',
                            '--text-primary': '#1d1d1f',
                            '--text-secondary': '#86868b',
                            '--border-color': 'rgba(0,0,0,0.1)'
                        } as any}
                    >
                        <button onClick={() => setShowContact(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                        <h2 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>📞 联系开发者</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(59,130,246,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>👨‍💻</div>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{devInfo.name}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>平台开发者</div>
                            </div>
                            <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '8px 0' }}></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ opacity: 0.6 }}>📱 手机:</span>
                                    <span style={{ fontWeight: '600' }}>{devInfo.phone}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ opacity: 0.6 }}>📧 邮箱:</span>
                                    <span style={{ fontWeight: '600' }}>{devInfo.email}</span>
                                </div>
                            </div>
                            {devInfo.qr && (
                                <div style={{ marginTop: '16px', padding: '12px', background: 'white', borderRadius: '12px' }}>
                                    <img src={devInfo.qr} alt="WeChat QR" style={{ width: '160px', height: '160px', objectFit: 'contain' }} />
                                    <div style={{ color: '#000', fontSize: '12px', marginTop: '8px', fontWeight: '600' }}>微信扫一扫</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Cropper Modal Overlay */}
            {showCropper && tempImageSrc && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', zIndex: 20000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '90%', maxWidth: '500px', height: '400px', background: '#000', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
                        <Cropper
                            image={tempImageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div style={{ marginTop: '32px', textAlign: 'center', color: 'white', opacity: 0.8, fontSize: '14px', marginBottom: '16px' }}>使用鼠标滚轮缩放，拖拽调整位置</div>
                    <div style={{ display: 'flex', gap: '16px', width: '90%', maxWidth: '500px' }}>
                        <button
                            onClick={() => { setShowCropper(false); setTempImageSrc(null); }}
                            style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                        >取消</button>
                        <button
                            onClick={handleCropSave}
                            disabled={isUploading}
                            style={{ flex: 2, padding: '14px', background: 'var(--accent-blue)', border: 'none', borderRadius: '16px', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,122,255,0.3)' }}
                        >{isUploading ? '正在压缩上传...' : '更新头像'}</button>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {showProfile && (
                <div
                    onClick={() => setShowProfile(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff', // 强制白天模式底色
                            color: '#1d1d1f',      // 强制深色文字
                            width: '90%',
                            maxWidth: '440px',
                            borderRadius: '28px',
                            padding: '0',
                            boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0,0,0,0.05)',
                            position: 'relative',
                            overflow: 'hidden',
                            '--text-primary': '#1d1d1f',
                            '--text-secondary': '#86868b',
                            '--border-color': 'rgba(0,0,0,0.1)'
                        } as any}
                    >
                        <div style={{ padding: '32px' }}>
                            <button onClick={() => setShowProfile(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', zIndex: 1 }}>&times;</button>

                            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>👤 个人资料</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>管理您的个人信息、头像及账户安全</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Avatar Upload Section */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            key={`modal-avatar-${profileData.avatar}`}
                                            onClick={() => document.getElementById('avatar-input')?.click()}
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: '20px',
                                                border: '2px solid var(--accent-blue)',
                                                background: profileData.avatar ? `url("${profileData.avatar}")` : 'rgba(255,255,255,0.05)',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '32px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.2) contrast(0.9)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                            {!profileData.avatar && '👤'}
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', padding: '2px 0', textAlign: 'center', opacity: 0.8 }}>点击修改</div>
                                        </div>
                                        <input id="avatar-input" type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>个人头像</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>点击预览图启动手动裁切及压缩</div>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>显示姓名</label>
                                            <input
                                                type="text"
                                                value={profileData.username}
                                                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                                placeholder="请输入您的姓名"
                                                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', marginLeft: '4px' }}>手机号码</label>
                                            <input
                                                type="text"
                                                value={profileData.phone}
                                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                placeholder="请输入手机号"
                                                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '8px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-blue)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, var(--accent-blue), transparent)' }}></div>
                                            修改密码 (不填则不修改)
                                            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, var(--accent-blue), transparent)' }}></div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <input
                                                type="password"
                                                placeholder="旧密码"
                                                value={profileData.oldPassword}
                                                onChange={(e) => setProfileData({ ...profileData, oldPassword: e.target.value })}
                                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px' }}
                                            />
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <input
                                                    type="password"
                                                    placeholder="新密码"
                                                    value={profileData.newPassword}
                                                    onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                                                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px' }}
                                                />
                                                <input
                                                    type="password"
                                                    placeholder="确认新密码"
                                                    value={profileData.confirmPassword}
                                                    onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                                                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    <button
                                        onClick={() => setShowProfile(false)}
                                        style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
                                    >取消</button>
                                    <button
                                        onClick={handleProfileUpdate}
                                        style={{ flex: 2, padding: '14px', background: 'var(--accent-blue)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,122,255,0.25)' }}
                                    >保存更新</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
