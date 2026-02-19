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

    const [activeTab, setActiveTab] = useState<'users' | 'config' | 'password'>('users');

    const [newUsername, setNewUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');

    const [oldAdminPass, setOldAdminPass] = useState('');
    const [newAdminPass, setNewAdminPass] = useState('');

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('admin_logged_in');
        if (!isLoggedIn) {
            router.push('/manage');
            return;
        }
        fetchUsers();
        fetchConfig();
    }, []);

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
        if (!confirm('确定要删除该用户吗？此操作不可恢复！')) return;
        try {
            const res = await fetch(`http://localhost:8000/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) fetchUsers(searchQuery);
        } catch (e) { alert('删除失败'); }
    };

    const resetPassword = async (id: number) => {
        const newPass = prompt('请输入该用户的新密码:');
        if (!newPass) return;
        try {
            const res = await fetch(`http://localhost:8000/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPass }),
            });
            if (res.ok) alert('密码更新成功');
        } catch (e) { alert('操作失败'); }
    };

    const editExpiry = async (user: User) => {
        const currentExp = new Date(user.expires_at).toISOString().split('T')[0];
        const newDate = prompt('请输入新的到期日期 (格式: YYYY-MM-DD):', currentExp);
        if (!newDate) return;
        try {
            // Ensure valid date
            const expDate = new Date(newDate);
            if (isNaN(expDate.getTime())) {
                alert('日期格式错误');
                return;
            }
            const res = await fetch(`http://localhost:8000/api/admin/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expires_at: expDate.toISOString() }),
            });
            if (res.ok) fetchUsers(searchQuery);
        } catch (e) { alert('日期更新失败'); }
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>🛡️ 智弈 (MindNode) 管理后台</h1>
                    <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer' }}>退出登录</button>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'users' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >用户管理</button>
                    <button
                        onClick={() => setActiveTab('config')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'config' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >大模型配置</button>
                    <button
                        onClick={() => setActiveTab('password')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'password' ? '#3b82f6' : '#1e293b', color: 'white' }}
                    >管理员安全</button>
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

                {activeTab === 'config' && (
                    <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '20px' }}>🤖 大模型参数更换</h3>
                        <form onSubmit={handleUpdateConfig}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>DeepSeek API Key</label>
                                <input
                                    type="password"
                                    value={config.deepseek_api_key}
                                    onChange={e => setConfig({ ...config, deepseek_api_key: e.target.value })}
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>模型 ID</label>
                                <input
                                    value={config.model_id}
                                    onChange={e => setConfig({ ...config, model_id: e.target.value })}
                                    placeholder="e.g. deepseek-chat"
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Base URL (非必填)</label>
                                <input
                                    value={config.base_url}
                                    onChange={e => setConfig({ ...config, base_url: e.target.value })}
                                    placeholder="e.g. https://api.deepseek.com"
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box' }}
                                />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '14px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>保存配置</button>
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
            </div>
        </div>
    );
}
