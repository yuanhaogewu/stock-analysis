"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    username: string;
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
    const [config, setConfig] = useState<Config>({
        deepseek_api_key: '',
        model_id: '',
        base_url: '',
    });

    // Tab management
    const [activeTab, setActiveTab] = useState<'users' | 'config' | 'password'>('users');

    // User creation form
    const [newUsername, setNewUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');

    // Admin password change form
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

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/users');
            if (res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); }
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
                body: JSON.stringify({ username: newUsername, password: newUserPassword }),
            });
            if (res.ok) {
                alert('用户创建成功');
                setNewUsername('');
                setNewUserPassword('');
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
            if (res.ok) fetchUsers();
        } catch (e) { alert('操作失败'); }
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
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>🛡️ 系统管理后台</h1>
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
                            <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: '15px' }}>
                                <input
                                    placeholder="用户名 (姓名)"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    style={{ flex: 1, padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="登录密码"
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    style={{ flex: 1, padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    required
                                />
                                <button type="submit" style={{ padding: '10px 25px', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>创建用户</button>
                            </form>
                        </div>

                        <div className="card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '20px' }}>👥 用户列表</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
                                        <th style={{ padding: '15px' }}>姓名</th>
                                        <th style={{ padding: '15px' }}>创建时间</th>
                                        <th style={{ padding: '15px' }}>到期时间</th>
                                        <th style={{ padding: '15px' }}>状态</th>
                                        <th style={{ padding: '15px' }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid #334155' }}>
                                            <td style={{ padding: '15px' }}>{user.username}</td>
                                            <td style={{ padding: '15px', color: '#94a3b8', fontSize: '13px' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td style={{ padding: '15px', color: '#94a3b8', fontSize: '13px' }}>{new Date(user.expires_at).toLocaleDateString()}</td>
                                            <td style={{ padding: '15px' }}>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: user.is_active ? '#065f46' : '#7f1d1d', color: user.is_active ? '#34d399' : '#f87171' }}>
                                                    {user.is_active ? '正常' : '已禁用'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <button
                                                    onClick={() => toggleUserStatus(user)}
                                                    style={{ padding: '6px 12px', background: user.is_active ? '#7f1d1d' : '#065f46', border: 'none', borderRadius: '4px', color: 'white', fontSize: '12px', cursor: 'pointer' }}
                                                >
                                                    {user.is_active ? '禁用' : '启用'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>模型 ID</label>
                                <input
                                    value={config.model_id}
                                    onChange={e => setConfig({ ...config, model_id: e.target.value })}
                                    placeholder="e.g. deepseek-chat"
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Base URL (非必填)</label>
                                <input
                                    value={config.base_url}
                                    onChange={e => setConfig({ ...config, base_url: e.target.value })}
                                    placeholder="e.g. https://api.deepseek.com"
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
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
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>新密码</label>
                                <input
                                    type="password"
                                    value={newAdminPass}
                                    onChange={e => setNewAdminPass(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
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
