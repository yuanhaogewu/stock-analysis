"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    username: string;
    phone: string;
    is_active: number;
    created_at: string;
    expires_at: string;
}

interface Config {
    deepseek_api_key: string;
    model_id: string;
    base_url: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [config, setConfig] = useState<Config>({
        deepseek_api_key: '',
        model_id: '',
        base_url: '',
    });

    const [activeTab, setActiveTab] = useState<'users' | 'model' | 'config' | 'subscription' | 'invites' | 'alipay' | 'finance' | 'password' | 'announcement'>('users');
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // 平台基本信息状态
    const [platformConfig, setPlatformConfig] = useState({
        platform_name: '',
        platform_name_en: '',
        platform_slogan: '',
        platform_logo: '',
        dev_name: '',
        dev_phone: '',
        dev_email: '',
        dev_wechat_qr: '',
        announcement_content: '',
        rate_limit_rules: '',
        rate_limit_msg: '',
        alert_msg_auth_required: '',
        alert_msg_vip_expired: '',
        rate_limit_count: '20',
        rate_limit_period: '1'
    });

    // 全局弹窗状态
    const [systemAlert, setSystemAlert] = useState<{ show: boolean, title: string, message: string, type: 'alert' | 'confirm', onConfirm?: () => void } | null>(null);
    const [systemPrompt, setSystemPrompt] = useState<{ show: boolean, title: string, message: string, subMessage?: string, defaultValue: string, onConfirm: (val: string) => void } | null>(null);

    // 套餐管理相关状态
    const [plans, setPlans] = useState<any[]>([]);
    const [newPlan, setNewPlan] = useState({ name: '', duration: 30, price: 0, desc: '', sort_order: 0 });
    const [editingPlan, setEditingPlan] = useState<any>(null);

    // 邀请码管理相关状态
    const [inviteCodes, setInviteCodes] = useState<any[]>([]);
    const [genCount, setGenCount] = useState(5);
    const [showDeleteModal, setShowDeleteModal] = useState<any>(null); // 存储待删除的套餐对象

    // 支付宝配置相关状态
    const [alipayConfig, setAlipayConfig] = useState({
        alipay_app_id: '',
        alipay_private_key: '',
        alipay_public_key: ''
    });

    // 财务流水相关状态
    const [paymentLogs, setPaymentLogs] = useState<any[]>([]);

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('admin_logged_in');
        if (!isLoggedIn) {
            router.push('/manage');
            return;
        }
        fetchUsers();
        fetchConfig();
        fetchPlans();
        fetchAlipayConfig();
        fetchInvites();
        fetchPaymentLogs();
        fetchPlatformConfig();
    }, []);

    const getPlatformTitle = () => {
        const { platform_name, platform_name_en, platform_slogan } = platformConfig;
        if (!platform_name) return '系统提示';
        return `${platform_name}(${platform_name_en}) - ${platform_slogan}`;
    };

    const showAlert = (message: string, title: string = getPlatformTitle()) => {
        setSystemAlert({ show: true, title, message, type: 'alert' });
    };

    const fetchPlatformConfig = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/config');
            if (res.ok) {
                const data = await res.json();
                setPlatformConfig({
                    platform_name: data.platform_name || '',
                    platform_name_en: data.platform_name_en || '',
                    platform_slogan: data.platform_slogan || '',
                    platform_logo: data.platform_logo || '',
                    dev_name: data.dev_name || '',
                    dev_phone: data.dev_phone || '',
                    dev_email: data.dev_email || '',
                    dev_wechat_qr: data.dev_wechat_qr || '',
                    announcement_content: data.announcement_content || '',
                    rate_limit_rules: data.rate_limit_rules || '',
                    rate_limit_msg: data.rate_limit_msg || '',
                    alert_msg_auth_required: data.alert_msg_auth_required || '',
                    alert_msg_vip_expired: data.alert_msg_vip_expired || '',
                    rate_limit_count: data.rate_limit_count || '20',
                    rate_limit_period: data.rate_limit_period || '1'
                });
                setConfig({
                    deepseek_api_key: data.deepseek_api_key || '',
                    model_id: data.model_id || 'deepseek-chat',
                    base_url: data.base_url || 'https://api.deepseek.com',
                });
            }
        } catch (e) { console.error('Error fetching platform config'); }
    };

    const handleFileUpload = async (file: File, type: 'logo' | 'wechat') => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                if (type === 'logo') {
                    setPlatformConfig(prev => ({ ...prev, platform_logo: data.url }));
                } else {
                    setPlatformConfig(prev => ({ ...prev, dev_wechat_qr: data.url }));
                }
                showAlert('文件上传成功');
            } else {
                showAlert('上传失败');
            }
        } catch (e) { showAlert('上传服务异常'); }
    };

    const handleUpdatePlatformInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...platformConfig,
                    api_key: config.deepseek_api_key,
                    model_id: config.model_id,
                    base_url: config.base_url
                }),
            });
            if (res.ok) {
                showAlert('系统配置已全局更新');
                fetchPlatformConfig();
            } else {
                showAlert('更新失败');
            }
        } catch (e) { showAlert('请求服务器失败'); }
    };

    const fetchInvites = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/invite/codes');
            if (res.ok) setInviteCodes(await res.json());
            else console.error('Failed to fetch invites');
        } catch (e) { console.error('Network error fetching invites'); }
    };

    const fetchPaymentLogs = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/payment/logs');
            if (res.ok) setPaymentLogs(await res.json());
            else console.error('Failed to fetch payment logs');
        } catch (e) { console.error('Network error fetching payment logs'); }
    };

    const fetchPlans = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/subscription/plans');
            if (res.ok) setPlans(await res.json());
            else console.error('Failed to fetch plans');
        } catch (e) { console.error('Network error fetching plans'); }
    };

    const handleAddPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingPlan
            ? `http://localhost:8000/api/admin/subscription/plans/${editingPlan.id}`
            : 'http://localhost:8000/api/admin/subscription/plans';
        const method = editingPlan ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPlan.name,
                    duration_days: newPlan.duration,
                    price: newPlan.price,
                    description: newPlan.desc,
                    sort_order: newPlan.sort_order
                }),
            });
            if (res.ok) {
                showAlert(editingPlan ? '套餐更新成功' : '方案添加成功');
                setNewPlan({ name: '', duration: 30, price: 0, desc: '', sort_order: 0 });
                setEditingPlan(null);
                fetchPlans();
            } else {
                showAlert('操作失败');
            }
        } catch (e) { showAlert('请求后端失败'); }
    };

    const handleDeletePlan = async () => {
        if (!showDeleteModal) return;
        try {
            const res = await fetch(`http://localhost:8000/api/admin/subscription/plans/${showDeleteModal.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                showAlert(`已成功删除套餐: ${showDeleteModal.name}`);
                setShowDeleteModal(null);
                setEditingPlan(null);
                setNewPlan({ name: '', duration: 30, price: 0, desc: '', sort_order: 0 });
                fetchPlans();
            } else {
                const errData = await res.json();
                showAlert(`删除失败: ${errData.detail || '未知服务器错误'}`);
            }
        } catch (e) { showAlert('删除请求发送失败'); }
    };

    const handleGenerateCodes = async () => {
        if (!genCount || genCount <= 0) {
            showAlert('请输入有效的生成数量');
            return;
        }
        try {
            const res = await fetch('http://localhost:8000/api/admin/invite/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: genCount, duration_days: 30 }),
            });
            if (res.ok) {
                const data = await res.json();
                alert(`成功生成 ${data.codes.length} 个邀请码`);
                fetchInvites();
            } else {
                const errData = await res.json();
                alert(`生成失败: ${errData.detail || '接口异常'}`);
            }
        } catch (e) { alert('请求后端失败'); }
    };

    const fetchAlipayConfig = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/config');
            if (res.ok) {
                const data = await res.json();
                setAlipayConfig({
                    alipay_app_id: data.alipay_app_id || '',
                    alipay_private_key: data.alipay_private_key || '',
                    alipay_public_key: data.alipay_public_key || ''
                });
            }
        } catch (e) { }
    };

    const handleUpdateAlipay = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alipay_app_id: alipayConfig.alipay_app_id,
                    alipay_private_key: alipayConfig.alipay_private_key,
                    alipay_public_key: alipayConfig.alipay_public_key
                }),
            });
            if (res.ok) {
                alert('支付宝配置已就绪，系统将实时生效。');
            }
        } catch (e) { alert('更新失败'); }
    };
    const [newUsername, setNewUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');

    const [oldAdminPass, setOldAdminPass] = useState('');
    const [newAdminPass, setNewAdminPass] = useState('');



    const fetchUsers = async (query?: string) => {
        try {
            const url = query
                ? `http://localhost:8000/api/admin/users?query=${encodeURIComponent(query)}`
                : 'http://localhost:8000/api/admin/users';
            const res = await fetch(url);
            if (res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers(searchQuery);
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/config');
            if (res.ok) {
                const data = await res.json();
                setConfig({
                    deepseek_api_key: data.deepseek_api_key || '',
                    model_id: data.model_id || 'deepseek-chat',
                    base_url: data.base_url || 'https://api.deepseek.com',
                });
            }
        } catch (e) { console.error(e); }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUsername,
                    password: newUserPassword,
                    phone: newUserPhone
                }),
            });
            if (res.ok) {
                alert('用户创建成功');
                setNewUsername('');
                setNewUserPassword('');
                setNewUserPhone('');
                fetchUsers();
            } else {
                const error = await res.json();
                alert(error.detail);
            }
        } catch (e) { alert('操作失败'); }
    };

    const toggleUserStatus = async (user: User) => {
        try {
            const res = await fetch(`http://localhost:8000/api/admin/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !user.is_active }),
            });
            if (res.ok) fetchUsers(searchQuery);
        } catch (e) { alert('操作失败'); }
    };

    const deleteUser = async (id: number) => {
        setSystemAlert({
            show: true,
            title: getPlatformTitle(),
            message: '确定要删除该用户吗？此操作不可恢复！',
            type: 'confirm',
            onConfirm: async () => {
                try {
                    const res = await fetch(`http://localhost:8000/api/admin/users/${id}`, { method: 'DELETE' });
                    if (res.ok) fetchUsers(searchQuery);
                    else showAlert('删除失败');
                } catch (e) { showAlert('删除失败'); }
            }
        });
    };

    const resetPassword = async (id: number) => {
        setSystemPrompt({
            show: true,
            title: getPlatformTitle(),
            message: '请输入该用户的新密码:',
            defaultValue: '',
            onConfirm: async (newPass) => {
                if (!newPass) return;
                try {
                    const res = await fetch(`http://localhost:8000/api/admin/users/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: newPass }),
                    });
                    if (res.ok) showAlert('密码更新成功');
                    else showAlert('更新失败');
                } catch (e) { showAlert('操作失败'); }
            }
        });
    };

    const editExpiry = async (user: User) => {
        const currentExp = new Date(user.expires_at).toISOString().split('T')[0];
        setSystemPrompt({
            show: true,
            title: getPlatformTitle(),
            message: '请输入新的到期日期:',
            subMessage: '(格式: YYYY-MM-DD)',
            defaultValue: currentExp,
            onConfirm: async (newDate) => {
                if (!newDate) return;
                try {
                    const expDate = new Date(newDate);
                    if (isNaN(expDate.getTime())) {
                        showAlert('日期格式错误');
                        return;
                    }
                    const res = await fetch(`http://localhost:8000/api/admin/users/${user.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ expires_at: expDate.toISOString() }),
                    });
                    if (res.ok) fetchUsers(searchQuery);
                    else showAlert('日期更新失败');
                } catch (e) { showAlert('日期更新失败'); }
            }
        });
    };

    const handleUpdateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: config.deepseek_api_key,
                    model_id: config.model_id,
                    base_url: config.base_url
                }),
            });
            if (res.ok) alert('模型配置已更新');
        } catch (e) { alert('保存失败'); }
    };

    const handleChangeAdminPass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/admin/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_password: oldAdminPass, new_password: newAdminPass }),
            });
            if (res.ok) {
                alert('密码修改成功，请重新登录');
                localStorage.removeItem('admin_logged_in');
                router.push('/manage');
            } else {
                const error = await res.json();
                alert(error.detail);
            }
        } catch (e) { alert('操作失败'); }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_logged_in');
        router.push('/manage');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '40px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff' }}>
                            🛡️ {platformConfig.platform_name || '芯思维'} ({platformConfig.platform_name_en || 'MindNode'})
                        </h1>
                        <p style={{ fontSize: '15px', color: '#94a3b8', fontWeight: '400' }}>
                            {platformConfig.platform_slogan || '多维度股票AI分析系统'} | 管理后台
                        </p>
                    </div>
                    <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer' }}>退出登录</button>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'users' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >用户管理</button>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'subscription' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >会员系统</button>
                    <button
                        onClick={() => setActiveTab('invites')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'invites' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >邀请码管理</button>
                    <button
                        onClick={() => setActiveTab('alipay')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'alipay' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >支付配置</button>
                    <button
                        onClick={() => setActiveTab('finance')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'finance' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >营收流水</button>
                    <button
                        onClick={() => setActiveTab('announcement')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'announcement' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >平台公告</button>
                    <button
                        onClick={() => setActiveTab('model')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'model' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >模型配置</button>
                    <button
                        onClick={() => setActiveTab('config')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'config' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >系统设置</button>
                    <button
                        onClick={() => setActiveTab('password')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'password' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >安全认证</button>
                </div>

                {activeTab === 'users' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '20px' }}>➕ 添加新用户</h3>
                            <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                <input
                                    placeholder="用户名 (姓名)"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    style={{ flex: 1, minWidth: '150px', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    required
                                />
                                <input
                                    placeholder="手机号码"
                                    value={newUserPhone}
                                    onChange={e => setNewUserPhone(e.target.value)}
                                    style={{ flex: 1, minWidth: '150px', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="登录密码"
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    style={{ flex: 1, minWidth: '150px', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    required
                                />
                                <button type="submit" style={{ padding: '10px 25px', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>创建用户</button>
                            </form>
                        </div>

                        <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>👥 用户列表</h3>
                                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="搜索姓名、手机号..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '14px' }}
                                    />
                                    <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '14px' }}>查询</button>
                                </form>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
                                            <th style={{ padding: '15px' }}>姓名</th>
                                            <th style={{ padding: '15px' }}>手机号</th>
                                            <th style={{ padding: '15px' }}>创建时间</th>
                                            <th style={{ padding: '15px' }}>到期时间</th>
                                            <th style={{ padding: '15px' }}>状态</th>
                                            <th style={{ padding: '15px' }}>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>未找到相关用户</td></tr>
                                        ) : (
                                            users.map(user => (
                                                <tr key={user.id} style={{ borderBottom: '1px solid #334155' }}>
                                                    <td style={{ padding: '15px', fontWeight: '600' }}>{user.username}</td>
                                                    <td style={{ padding: '15px', color: '#94a3b8' }}>{user.phone || '---'}</td>
                                                    <td style={{ padding: '15px', color: '#94a3b8', fontSize: '13px' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                                                    <td style={{ padding: '15px', color: '#94a3b8', fontSize: '13px' }}>{new Date(user.expires_at).toLocaleDateString()}</td>
                                                    <td style={{ padding: '15px' }}>
                                                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: user.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: user.is_active ? '#10b981' : '#ef4444', border: `1px solid ${user.is_active ? '#10b981' : '#ef4444'}` }}>
                                                            {user.is_active ? '正常' : '已禁用'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => toggleUserStatus(user)}
                                                            style={{ padding: '6px 12px', background: user.is_active ? '#7f1d1d' : '#065f46', border: 'none', borderRadius: '4px', color: 'white', fontSize: '12px', cursor: 'pointer' }}
                                                        >
                                                            {user.is_active ? '禁用' : '通过'}
                                                        </button>
                                                        <button
                                                            onClick={() => resetPassword(user.id)}
                                                            style={{ padding: '6px 12px', background: '#475569', border: 'none', borderRadius: '4px', color: 'white', fontSize: '12px', cursor: 'pointer' }}
                                                        >
                                                            改密
                                                        </button>
                                                        <button
                                                            onClick={() => editExpiry(user)}
                                                            style={{ padding: '6px 12px', background: '#334155', border: 'none', borderRadius: '4px', color: 'white', fontSize: '12px', cursor: 'pointer' }}
                                                        >
                                                            有效期
                                                        </button>
                                                        <button
                                                            onClick={() => deleteUser(user.id)}
                                                            style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
                                                        >
                                                            删除
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'subscription' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '20px' }}>{editingPlan ? '📝 修改套餐信息' : '✨ 添加付费套餐'}</h3>
                            <form onSubmit={handleAddPlan} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <input
                                    placeholder="套餐名称 (如: 月度、年度)"
                                    value={newPlan.name}
                                    onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                                    style={adminInputStyle}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="有效天数 (30, 365)"
                                    value={newPlan.duration}
                                    onChange={e => setNewPlan({ ...newPlan, duration: parseInt(e.target.value) })}
                                    style={adminInputStyle}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="价格 (元)"
                                    value={newPlan.price}
                                    onChange={e => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) })}
                                    style={adminInputStyle}
                                    required
                                />
                                <input
                                    placeholder="简单描述"
                                    value={newPlan.desc}
                                    onChange={e => setNewPlan({ ...newPlan, desc: e.target.value })}
                                    style={adminInputStyle}
                                />
                                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>排序权重:</span>
                                    <input
                                        type="number"
                                        placeholder="数字越大越靠前 (默认 0)"
                                        value={newPlan.sort_order}
                                        onChange={e => setNewPlan({ ...newPlan, sort_order: parseInt(e.target.value) || 0 })}
                                        style={{ ...adminInputStyle, width: '100px' }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>* 权重数值越大，排序越靠前。</span>
                                </div>
                                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                                    <button
                                        type="submit"
                                        style={{ flex: 2, padding: '12px', background: editingPlan ? '#3b82f6' : '#10b981', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {editingPlan ? '确认更新' : '立即保存'}
                                    </button>
                                    {editingPlan && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingPlan(null);
                                                setNewPlan({ name: '', duration: 30, price: 0, desc: '', sort_order: 0 });
                                            }}
                                            style={{ flex: 1, padding: '12px', background: '#475569', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}
                                        >
                                            取消
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '20px' }}>📜 现有套餐列表</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                {plans.map(p => (
                                    <div key={p.id} style={{ padding: '15px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '10px', color: '#334155' }}>Order: {p.sort_order || 0}</div>
                                        <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>{p.duration_days} 天 | ¥{p.price}</div>
                                        <div style={{ fontSize: '11px', marginTop: '8px', color: '#64748b' }}>{p.description}</div>

                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <button
                                                onClick={() => {
                                                    setEditingPlan(p);
                                                    setNewPlan({ name: p.name, duration: p.duration_days, price: p.price, desc: p.description || '', sort_order: p.sort_order || 0 });
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                style={{ flex: 1, padding: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '4px', color: '#3b82f6', fontSize: '11px' }}
                                            >编辑</button>
                                            <button
                                                onClick={() => setShowDeleteModal(p)}
                                                style={{ flex: 1, padding: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', fontSize: '11px' }}
                                            >删除</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'invites' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div className="card" style={{ padding: '40px', background: '#1e293b', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎁</div>
                            <h3 style={{ marginBottom: '12px' }}>批量生成邀请码</h3>
                            <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '14px' }}>生成后的邀请码可用于 30 天 VIP 特权兑换，仅限一次性使用。</p>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px' }}>生成数量:</span>
                                <input
                                    type="number"
                                    value={genCount}
                                    onChange={e => {
                                        const v = parseInt(e.target.value);
                                        setGenCount(isNaN(v) ? 0 : v);
                                    }}
                                    style={{ width: '80px', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', textAlign: 'center' }}
                                />
                                <button
                                    onClick={handleGenerateCodes}
                                    style={{ padding: '10px 24px', background: '#8b5cf6', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    立即生成
                                </button>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '20px' }}>📋 邀请码发放历史</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '14px' }}>
                                            <th style={{ padding: '12px' }}>特权邀请码</th>
                                            <th style={{ padding: '12px' }}>天数</th>
                                            <th style={{ padding: '12px' }}>生成时间</th>
                                            <th style={{ padding: '12px' }}>状态</th>
                                            <th style={{ padding: '12px' }}>使用者</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inviteCodes.map(c => (
                                            <tr key={c.id} style={{ borderBottom: '1px solid #334155', fontSize: '13px' }}>
                                                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#8b5cf6', fontWeight: 'bold' }}>{c.code}</td>
                                                <td style={{ padding: '12px' }}>{c.duration_days}</td>
                                                <td style={{ padding: '12px', color: '#64748b' }}>{new Date(c.created_at).toLocaleString()}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{ color: c.is_used ? '#ef4444' : '#10b981' }}>{c.is_used ? '已失效' : '未使用'}</span>
                                                </td>
                                                <td style={{ padding: '12px' }}>{c.used_by_name || '---'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'alipay' && (
                    <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '20px' }}>💳 支付宝支付配置 (正式环境)</h3>
                        <form onSubmit={handleUpdateAlipay}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={adminLabelStyle}>APP ID</label>
                                <input
                                    value={alipayConfig.alipay_app_id}
                                    onChange={e => setAlipayConfig({ ...alipayConfig, alipay_app_id: e.target.value })}
                                    style={adminInputStyle}
                                    placeholder="202100xxxxxxxxxx"
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={adminLabelStyle}>应用私钥 (Private Key)</label>
                                <textarea
                                    value={alipayConfig.alipay_private_key}
                                    onChange={e => setAlipayConfig({ ...alipayConfig, alipay_private_key: e.target.value })}
                                    style={{ ...adminInputStyle, height: '100px', fontFamily: 'monospace', fontSize: '12px' }}
                                    placeholder="-----BEGIN RSA PRIVATE KEY-----"
                                />
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <label style={adminLabelStyle}>支付宝公钥 (Public Key)</label>
                                <textarea
                                    value={alipayConfig.alipay_public_key}
                                    onChange={e => setAlipayConfig({ ...alipayConfig, alipay_public_key: e.target.value })}
                                    style={{ ...adminInputStyle, height: '100px', fontFamily: 'monospace', fontSize: '12px' }}
                                    placeholder="-----BEGIN PUBLIC KEY-----"
                                />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '14px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>更新配置</button>
                        </form>
                    </div>
                )}
                {activeTab === 'finance' && (
                    <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '20px' }}>💰 营收流水明细</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '14px' }}>
                                        <th style={{ padding: '12px' }}>单号</th>
                                        <th style={{ padding: '12px' }}>用户</th>
                                        <th style={{ padding: '12px' }}>套餐</th>
                                        <th style={{ padding: '12px' }}>金额</th>
                                        <th style={{ padding: '12px' }}>状态</th>
                                        <th style={{ padding: '12px' }}>支付时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentLogs.map(l => (
                                        <tr key={l.id} style={{ borderBottom: '1px solid #334155', fontSize: '13px' }}>
                                            <td style={{ padding: '12px', fontFamily: 'monospace', color: '#94a3b8' }}>{l.out_trade_no}</td>
                                            <td style={{ padding: '12px', fontWeight: '600' }}>{l.username}</td>
                                            <td style={{ padding: '12px' }}>{l.plan_name}</td>
                                            <td style={{ padding: '12px', color: '#10b981' }}>¥{l.amount.toFixed(2)}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ padding: '2px 6px', borderRadius: '4px', background: l.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: l.status === 'PAID' ? '#10b981' : '#ef4444' }}>
                                                    {l.status === 'PAID' ? '交易成功' : '等待支付'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', color: '#64748b' }}>{l.paid_at || '---'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'model' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <form onSubmit={handleUpdatePlatformInfo}>
                            <h3 style={{ marginBottom: '24px', color: '#fff', fontSize: '20px' }}>🤖 模型配置</h3>
                            <div style={{ background: '#1e293b', padding: '32px', borderRadius: '12px', border: '1px solid #334155', maxWidth: '600px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={adminLabelStyle}>DeepSeek API Key</label>
                                        <input type="password" value={config.deepseek_api_key} onChange={e => setConfig({ ...config, deepseek_api_key: e.target.value })} style={adminInputStyle} placeholder="sk-..." />
                                    </div>
                                    <div>
                                        <label style={adminLabelStyle}>模型 ID</label>
                                        <input value={config.model_id} onChange={e => setConfig({ ...config, model_id: e.target.value })} style={adminInputStyle} placeholder="deepseek-chat" />
                                    </div>
                                    <div>
                                        <label style={adminLabelStyle}>Base URL</label>
                                        <input value={config.base_url} onChange={e => setConfig({ ...config, base_url: e.target.value })} style={adminInputStyle} placeholder="https://api.deepseek.com" />
                                    </div>
                                    <button type="submit" style={{ marginTop: '10px', padding: '14px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>保存模型配置</button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <form onSubmit={handleUpdatePlatformInfo}>
                            <h3 style={{ marginBottom: '24px', color: '#fff', fontSize: '20px' }}>⚙️ 系统设置</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>

                                {/* 平台信息 */}
                                <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                                    <h4 style={{ color: '#3b82f6', marginBottom: '20px' }}>🏷️ 平台信息配置</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <label style={adminLabelStyle}>平台名称</label>
                                            <input value={platformConfig.platform_name} onChange={e => setPlatformConfig({ ...platformConfig, platform_name: e.target.value })} style={adminInputStyle} />
                                        </div>
                                        <div>
                                            <label style={adminLabelStyle}>英文标识/ID</label>
                                            <input value={platformConfig.platform_name_en} onChange={e => setPlatformConfig({ ...platformConfig, platform_name_en: e.target.value })} style={adminInputStyle} />
                                        </div>
                                        <div>
                                            <label style={adminLabelStyle}>平台定位 (Slogan)</label>
                                            <input value={platformConfig.platform_slogan} onChange={e => setPlatformConfig({ ...platformConfig, platform_slogan: e.target.value })} style={adminInputStyle} />
                                        </div>
                                        <div>
                                            <label style={adminLabelStyle}>平台 LOGO</label>
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                {platformConfig.platform_logo ? (
                                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                                        <img
                                                            src={platformConfig.platform_logo}
                                                            alt="logo"
                                                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #475569', cursor: 'zoom-in', transition: 'transform 0.2s' }}
                                                            onMouseEnter={() => setZoomedImage(platformConfig.platform_logo)}
                                                            onMouseLeave={() => setZoomedImage(null)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #475569', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '18px', opacity: 0.5 }}>🖼️</span>
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <label style={{
                                                        display: 'inline-block',
                                                        padding: '8px 16px',
                                                        background: '#334155',
                                                        color: '#fff',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        border: '1px solid #475569'
                                                    }} className="upload-btn">
                                                        选择 LOGO 文件
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            hidden
                                                            onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                                                        />
                                                    </label>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        支持 JPG, PNG, WebP (建议 512x512)
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 开发者信息 */}
                                <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                                    <h4 style={{ color: '#10b981', marginBottom: '20px' }}>👨‍💻 开发者信息</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <label style={adminLabelStyle}>开发者姓名/团队</label>
                                            <input value={platformConfig.dev_name} onChange={e => setPlatformConfig({ ...platformConfig, dev_name: e.target.value })} style={adminInputStyle} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={adminLabelStyle}>手机号</label>
                                                <input value={platformConfig.dev_phone} onChange={e => setPlatformConfig({ ...platformConfig, dev_phone: e.target.value })} style={adminInputStyle} />
                                            </div>
                                            <div>
                                                <label style={adminLabelStyle}>联系邮箱</label>
                                                <input value={platformConfig.dev_email} onChange={e => setPlatformConfig({ ...platformConfig, dev_email: e.target.value })} style={adminInputStyle} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={adminLabelStyle}>微信收款码/二维码</label>
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
                                                {platformConfig.dev_wechat_qr ? (
                                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                                        <img
                                                            src={platformConfig.dev_wechat_qr}
                                                            alt="qr"
                                                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #475569', cursor: 'zoom-in', transition: 'transform 0.2s' }}
                                                            onMouseEnter={() => setZoomedImage(platformConfig.dev_wechat_qr)}
                                                            onMouseLeave={() => setZoomedImage(null)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #475569', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '18px', opacity: 0.5 }}>📱</span>
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <label style={{
                                                        display: 'inline-block',
                                                        padding: '8px 16px',
                                                        background: '#334155',
                                                        color: '#fff',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        border: '1px solid #475569'
                                                    }} className="upload-btn">
                                                        选择二维码图片
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            hidden
                                                            onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'wechat')}
                                                        />
                                                    </label>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        支持 JPG, PNG (微信收款二维码)
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI 频控与规则 */}
                                <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                                    <h4 style={{ color: '#f59e0b', marginBottom: '20px' }}>📊 股票分析频控规则</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={adminLabelStyle}>时间周期</label>
                                                <select
                                                    value={platformConfig.rate_limit_period}
                                                    onChange={e => setPlatformConfig({ ...platformConfig, rate_limit_period: e.target.value })}
                                                    style={adminInputStyle}
                                                >
                                                    <option value="1">每 1 小时</option>
                                                    <option value="24">每 24 小时</option>
                                                </select>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={adminLabelStyle}>最大分析次数 (频次)</label>
                                                <input
                                                    type="number"
                                                    value={platformConfig.rate_limit_count}
                                                    onChange={e => setPlatformConfig({ ...platformConfig, rate_limit_count: e.target.value })}
                                                    style={adminInputStyle}
                                                    placeholder="如：20"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={adminLabelStyle}>频控展示规则 (前端说明文本)</label>
                                            <input value={platformConfig.rate_limit_rules} onChange={e => setPlatformConfig({ ...platformConfig, rate_limit_rules: e.target.value })} style={adminInputStyle} placeholder="如：VIP会员每小时限20次" />
                                        </div>
                                        <div>
                                            <label style={adminLabelStyle}>频控上限提示语模板</label>
                                            <textarea
                                                value={platformConfig.rate_limit_msg}
                                                onChange={e => setPlatformConfig({ ...platformConfig, rate_limit_msg: e.target.value })}
                                                style={{ ...adminInputStyle, height: '100px', resize: 'vertical' }}
                                                placeholder="使用 {limit} 和 {resume_at} 占位符"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 全局弹窗话术定制 */}
                                <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
                                    <h4 style={{ color: '#8b5cf6', marginBottom: '20px' }}>💬 全局弹窗话术配置</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <label style={adminLabelStyle}>身份验证拦截提示</label>
                                            <textarea value={platformConfig.alert_msg_auth_required} onChange={e => setPlatformConfig({ ...platformConfig, alert_msg_auth_required: e.target.value })} style={{ ...adminInputStyle, height: '70px', resize: 'vertical' }} />
                                        </div>
                                        <div>
                                            <label style={adminLabelStyle}>权益到期/次数用尽提示</label>
                                            <textarea value={platformConfig.alert_msg_vip_expired} onChange={e => setPlatformConfig({ ...platformConfig, alert_msg_vip_expired: e.target.value })} style={{ ...adminInputStyle, height: '70px', resize: 'vertical' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>保存并同步全局配置</button>
                        </form>
                    </div>
                )}


                {activeTab === 'password' && (
                    <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '20px' }}>🔒 修改管理员密码</h3>
                        <form onSubmit={handleChangeAdminPass}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>当前密码</label>
                                <input
                                    type="password"
                                    value={oldAdminPass}
                                    onChange={e => setOldAdminPass(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>新密码</label>
                                <input
                                    type="password"
                                    value={newAdminPass}
                                    onChange={e => setNewAdminPass(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '14px', background: '#ef4444', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>更新安全认证</button>
                        </form>
                    </div>
                )}

                {activeTab === 'announcement' && (
                    <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '20px' }}>📢 平台公告编辑 (Markdown)</h3>
                        <div style={{ marginBottom: '20px' }}>
                            <textarea
                                value={platformConfig.announcement_content}
                                onChange={e => setPlatformConfig({ ...platformConfig, announcement_content: e.target.value })}
                                style={{
                                    width: '100%',
                                    height: '400px',
                                    padding: '16px',
                                    background: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: '#e2e8f0',
                                    fontFamily: 'monospace',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                                placeholder={'# 标题\n\n正文内容...\n\n- 列表项1\n- 列表项2'}
                            />
                        </div>
                        <button
                            onClick={(e) => handleUpdatePlatformInfo(e as any)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >保存公告并立即发布</button>
                    </div>
                )}

                {zoomedImage && (
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, pointerEvents: 'none' }}
                    >
                        <div style={{ position: 'relative', background: '#0f172a', padding: '10px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 0 100px rgba(59,130,246,0.3)' }}>
                            <img src={zoomedImage} alt="zoomed" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
                        </div>
                    </div>
                )}
                {showDeleteModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                    }}>
                        <div className="card" style={{ width: '400px', padding: '30px', textAlign: 'center', background: '#1e293b', border: '1px solid #ef4444' }}>
                            <div style={{ fontSize: '40px', marginBottom: '15px' }}>⚠️</div>
                            <p style={{ color: '#fff', fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>{getPlatformTitle()}</p>
                            <h3 style={{ color: '#fff', marginBottom: '10px' }}>确认删除套餐?</h3>
                            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '25px', lineHeight: '1.6' }}>
                                您确定要永久删除 <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{showDeleteModal.name}</span> 吗？<br />
                                此操作将导致该套餐从支付列表下架，且不可撤销。
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowDeleteModal(null)}
                                    style={{ flex: 1, padding: '12px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff' }}
                                >取消</button>
                                <button
                                    onClick={handleDeletePlan}
                                    style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                                >立即删除</button>
                            </div>
                        </div>
                    </div>
                )}

                {systemPrompt && systemPrompt.show && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                        <div style={{ background: '#1e293b', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid #334155' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>✏️</div>
                                <h4 style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '5px' }}>{systemPrompt.title}</h4>
                                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: systemPrompt.subMessage ? '4px' : '15px' }}>{systemPrompt.message}</h3>
                                {systemPrompt.subMessage && <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px', opacity: 0.8 }}>{systemPrompt.subMessage}</p>}
                                <input
                                    id="system-prompt-input"
                                    type="text"
                                    defaultValue={systemPrompt.defaultValue}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = (document.getElementById('system-prompt-input') as HTMLInputElement).value;
                                            systemPrompt.onConfirm(val);
                                            setSystemPrompt(null);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#0f172a',
                                        border: '1px solid #3b82f6',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '15px'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setSystemPrompt(null)}
                                    style={{ flex: 1, padding: '12px', background: '#334155', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
                                >取消</button>
                                <button
                                    onClick={() => {
                                        const val = (document.getElementById('system-prompt-input') as HTMLInputElement).value;
                                        systemPrompt.onConfirm(val);
                                        setSystemPrompt(null);
                                    }}
                                    style={{ flex: 1, padding: '12px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                >完成</button>
                            </div>
                        </div>
                    </div>
                )}

                {systemAlert && systemAlert.show && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                        <div style={{ background: '#1e293b', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid #334155', animation: 'modalShake 0.4s ease-out' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔔</div>
                                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>{systemAlert.title}</h3>
                                <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>{systemAlert.message}</p>
                            </div>
                            <button
                                onClick={() => setSystemAlert(null)}
                                style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >确定</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
const adminInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box'
};

const adminLabelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#94a3b8'
};
