"use client";
import { useEffect, useState } from "react";

interface IndexData {
    名称: string;
    最新价: number;
    涨跌额: number;
    涨跌幅: number;
    成交额: number;
}

interface RankingItem {
    代码: string;
    名称: string;
    最新价: number;
    涨跌幅: number;
}

interface Rankings {
    gainers: RankingItem[];
    losers: RankingItem[];
}

export default function Home() {
    const [indices, setIndices] = useState<{ [key: string]: IndexData | null }>({
        sse: null,
        szse: null,
        csi300: null,
    });
    const [rankings, setRankings] = useState<Rankings>({ gainers: [], losers: [] });
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [userId, setUserId] = useState<number | null>(null);

    useEffect(() => {
        setMounted(true);
        // Get user info from token
        const userToken = localStorage.getItem('user_token');
        if (userToken) {
            try {
                const user = JSON.parse(userToken);
                setUserId(user.id);
                fetchUserWatchlist(user.id);
            } catch (e) {
                console.error("Failed to parse user token:", e);
            }
        }
    }, []);

    const fetchUserWatchlist = async (uid: number) => {
        try {
            const res = await fetch(`http://localhost:8000/api/user/watchlist/${uid}`);
            if (res.ok) {
                const codes = await res.json();
                setWatchlist(codes);
            }
        } catch (e) {
            console.error("Failed to fetch watchlist:", e);
        }
    };

    useEffect(() => {
        async function fetchData() {
            try {
                const [idxRes, rankRes] = await Promise.all([
                    fetch("http://localhost:8000/api/market/indices"),
                    fetch("http://localhost:8000/api/market/rankings")
                ]);
                const idxData = await idxRes.json();
                const rankData = await rankRes.json();
                setIndices(idxData);
                setRankings(rankData);
            } catch (error) {
                console.error("Failed to fetch market data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
        const interval = setInterval(fetchData, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const toggleWatchlist = async (code: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!userId) {
            alert("请先登录以使用自选功能");
            return;
        }

        const isInWatchlist = watchlist.includes(code);
        const url = `http://localhost:8000/api/user/watchlist/${isInWatchlist ? 'remove' : 'add'}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, stock_code: code })
            });

            if (res.ok) {
                setWatchlist(prev =>
                    isInWatchlist ? prev.filter(c => c !== code) : [...prev, code]
                );
            }
        } catch (e) {
            console.error("Watchlist action failed:", e);
        }
    };

    const renderRankingList = (list: RankingItem[], type: 'up' | 'down') => (
        <div style={{ flex: 1 }} className={`animate-fadeInUp ranking-list-${type}`}>
            <h4 style={{
                marginBottom: '16px',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600'
            }}>
                <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    backgroundColor: type === 'up' ? 'var(--accent-green)' : 'var(--accent-red)',
                }}></span>
                {type === 'up' ? '行情领涨榜' : '行情领跌榜'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <table className="mac-table">
                    <tbody>
                        {list.map((item) => (
                            <tr key={item.代码} onClick={() => window.location.href = `/stock/${item.代码}`} style={{ cursor: 'pointer' }}>
                                <td style={{ width: '40px' }}>
                                    <button
                                        onClick={(e) => toggleWatchlist(item.代码, e)}
                                        style={{
                                            background: 'none',
                                            fontSize: '16px',
                                            padding: '4px',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        {watchlist.includes(item.代码) ? '⭐' : '☆'}
                                    </button>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className="stock-name">{item.名称}</span>
                                        <span className="secondary-text">{item.代码}</span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.最新价.toFixed(2)}</div>
                                    <div className={type === 'up' ? "stock-up" : "stock-down"} style={{ fontSize: '12px' }}>
                                        {item.涨跌幅 > 0 ? '+' : ''}{item.涨跌幅.toFixed(2)}%
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '32px' }}>
            <section className="animate-fadeInUp">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            市场中心
                        </h2>
                        <p className="secondary-text">实时监测 A 股核心指数运行态势</p>
                    </div>
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontSize: '13px' }}>
                            <div className="spinner-small" style={{ borderColor: 'rgba(0, 122, 255, 0.1)', borderTopColor: 'var(--accent-blue)' }}></div>
                            数据同步中...
                        </div>
                    )}
                </div>

                <div className="index-grid">
                    {Object.entries(indices).map(([key, data]) => (
                        <div key={key} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span className="secondary-text" style={{ fontWeight: '600' }}>{data?.名称 || "---"}</span>
                                <div style={{
                                    background: data && data.涨跌幅 >= 0 ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: data && data.涨跌幅 >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                                }}>
                                    {data ? (data.涨跌幅 >= 0 ? "BULL" : "BEAR") : "---"}
                                </div>
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                                {data?.最新价?.toFixed(2) || "---"}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span className={data && data.涨跌额 >= 0 ? "stock-up" : "stock-down"} style={{ fontSize: '14px' }}>
                                    {data ? (data.涨跌额 >= 0 ? "+" : "") + data.涨跌额.toFixed(2) : "---"}
                                </span>
                                <span style={{
                                    fontSize: '12px',
                                    padding: '1px 8px',
                                    borderRadius: '10px',
                                    background: data && data.涨跌幅 >= 0 ? 'rgba(50, 215, 75, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                                    color: data && data.涨跌幅 >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                                    fontWeight: '600'
                                }}>
                                    {data ? (data.涨跌幅 >= 0 ? "+" : "") + data.涨跌幅.toFixed(2) + "%" : "---"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>🚀 市场动态风向标</h3>
                        <p className="secondary-text" style={{ marginTop: '2px' }}>
                            实时捕捉全资本市场流量异动，洞察主力资金进攻方向。
                        </p>
                    </div>
                    <div className="secondary-text" style={{
                        background: 'var(--bg-base)',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)'
                    }}>
                        {mounted ? `数据最后同步：${new Date().toLocaleTimeString()}` : '实时同步中'}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '32px' }}>
                    {loading && rankings.gainers?.length === 0 ? (
                        <div style={{ width: '100%', padding: '60px', textAlign: 'center' }}>
                            <div className="spinner-small" style={{ margin: '0 auto 12px', width: '24px', height: '24px' }}></div>
                            <p className="secondary-text">深度扫描市场数据中...</p>
                        </div>
                    ) : (
                        <>
                            {renderRankingList(rankings.gainers || [], 'up')}
                            {renderRankingList(rankings.losers || [], 'down')}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
