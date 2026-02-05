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
        <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: type === 'up' ? 'var(--accent-red)' : 'var(--accent-green)' }}></span>
                {type === 'up' ? '涨幅榜' : '跌幅榜'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {list.map((item) => (
                    <div key={item.代码} className="ranking-item" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        alignItems: 'center'
                    }} onClick={() => window.location.href = `/stock/${item.代码}`}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                            <button
                                onClick={(e) => toggleWatchlist(item.代码, e)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title={watchlist.includes(item.代码) ? "取消自选" : "添加自选"}
                            >
                                {watchlist.includes(item.代码) ? '⭐' : '☆'}
                            </button>
                            <span style={{ fontWeight: '500' }}>{item.名称}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.代码}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontWeight: 'bold' }}>
                            <span>{item.最新价.toFixed(2)}</span>
                            <span className={type === 'up' ? "stock-up" : "stock-down"}>
                                {item.涨跌幅 > 0 ? '+' : ''}{item.涨跌幅.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <section>
                <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    市场指数
                    {loading && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>更新中...</span>}
                </h2>
                <div className="index-grid">
                    {Object.entries(indices).map(([key, data]) => (
                        <div key={key} className="card" style={{ borderTop: `4px solid ${data && data.涨跌幅 >= 0 ? 'var(--accent-red)' : 'var(--accent-green)'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{data?.名称 || "---"}</span>
                                <span className={data && data.涨跌额 >= 0 ? "stock-up" : "stock-down"} style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                    {data ? (data.涨跌额 >= 0 ? "▲" : "▼") : ""}
                                </span>
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '900', marginBottom: '8px', letterSpacing: '-1px' }}>
                                {data?.最新价?.toFixed(2) || "---"}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontWeight: '600' }}>
                                <span className={data && data.涨跌额 >= 0 ? "stock-up" : "stock-down"}>
                                    {data ? (data.涨跌额 >= 0 ? "+" : "") + data.涨跌额.toFixed(2) : "---"}
                                </span>
                                <span className={data && data.涨跌幅 >= 0 ? "stock-up" : "stock-down"} style={{ backgroundColor: data && data.涨跌幅 >= 0 ? 'rgba(255,82,82,0.1)' : 'rgba(0,200,83,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                    {data ? (data.涨跌幅 >= 0 ? "+" : "") + data.涨跌幅.toFixed(2) + "%" : "---"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card" style={{ flex: 1, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>🔥 市场动态</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>实时监测全市场异动，捕捉多头与空头主战场。</p>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {mounted ? `实时更新：${new Date().toLocaleTimeString()}` : '实时更新'}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '32px' }}>
                    {loading && rankings.gainers?.length === 0 ? (
                        <div style={{ width: '100%', padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            数据加载中...
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
