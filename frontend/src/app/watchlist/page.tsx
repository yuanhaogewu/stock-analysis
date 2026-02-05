"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface WatchlistStock {
    代码: string;
    名称: string;
    最新价: number;
    涨跌幅: number;
    成交额: number;
}

export default function WatchlistPage() {
    const router = useRouter();
    const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<number | null>(null);

    useEffect(() => {
        const userToken = localStorage.getItem('user_token');
        if (userToken) {
            try {
                const user = JSON.parse(userToken);
                setUserId(user.id);
                loadWatchlist(user.id);
            } catch (e) {
                console.error("Failed to parse user token:", e);
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    async function loadWatchlist(uid: number) {
        try {
            const res = await fetch(`http://localhost:8000/api/user/watchlist/${uid}`);
            if (res.ok) {
                const codes: string[] = await res.json();
                if (codes.length > 0) {
                    const promises = codes.map(code =>
                        fetch(`http://localhost:8000/api/stock/quote/${code}`)
                            .then(res => res.json())
                            .catch(err => {
                                console.error(`Failed to fetch ${code}:`, err);
                                return null;
                            })
                    );

                    const results = await Promise.all(promises);
                    const validStocks = results.filter(stock => stock !== null).map(stock => ({
                        代码: stock.代码,
                        名称: stock.名称,
                        最新价: stock.最新价,
                        涨跌幅: ((stock.最新价 - stock.昨收) / stock.昨收 * 100),
                        成交额: stock.成交额 || 0
                    }));
                    setWatchlist(validStocks);
                }
            }
        } catch (e) {
            console.error("Failed to load watchlist:", e);
        }
        setLoading(false);
    }

    const removeFromWatchlist = async (code: string) => {
        if (!userId) return;

        try {
            const res = await fetch(`http://localhost:8000/api/user/watchlist/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, stock_code: code })
            });

            if (res.ok) {
                setWatchlist(prev => prev.filter(stock => stock.代码 !== code));
            }
        } catch (e) {
            console.error("Failed to remove from watchlist:", e);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', margin: 0 }}>⭐ 我的自选</h1>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    共 {watchlist.length} 只股票
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                    加载中...
                </div>
            ) : watchlist.length === 0 ? (
                <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        您还没有添加自选股
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            padding: '10px 24px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}
                    >
                        去市场概览添加
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {watchlist.map((stock) => (
                        <div
                            key={stock.代码}
                            className="card"
                            style={{
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => router.push(`/stock/${stock.代码}`)}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: '600' }}>{stock.名称}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{stock.代码}</span>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    成交额: {(stock.成交额 / 100000000).toFixed(2)}亿
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', marginRight: '20px' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
                                    ¥{stock.最新价.toFixed(2)}
                                </div>
                                <div className={stock.涨跌幅 >= 0 ? "stock-up" : "stock-down"} style={{ fontSize: '14px', fontWeight: '600' }}>
                                    {stock.涨跌幅 >= 0 ? '+' : ''}{stock.涨跌幅.toFixed(2)}%
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromWatchlist(stock.代码);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                移除
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="card" style={{ marginTop: '24px', padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                💡 提示：点击股票卡片可查看详细分析
            </div>
        </div>
    );
}
