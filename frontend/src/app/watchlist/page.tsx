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
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: '600' }}>⭐ 我的自选</h1>
                    <p className="secondary-text" style={{ marginTop: '2px' }}>实时关注您的核心资产异动</p>
                </div>
                <div className="secondary-text" style={{
                    fontSize: '13px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                }}>
                    共 {watchlist.length} 只股票
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="spinner-small" style={{ margin: '0 auto 12px' }}></div>
                    <p className="secondary-text">正在同步自选数据...</p>
                </div>
            ) : watchlist.length === 0 ? (
                <div className="card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.8 }}>📋</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>您还没有添加自选股</h3>
                    <p className="secondary-text" style={{ marginBottom: '28px' }}>
                        添加自选股以实时监测您关注的标的运行态势。
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="btn-primary"
                        style={{ padding: '10px 32px', margin: '0 auto' }}
                    >
                        去市场概览添加
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                    <table className="mac-table">
                        <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <tr>
                                <th style={{ padding: '12px 16px' }}>股票资产</th>
                                <th style={{ textAlign: 'right' }}>最新价格</th>
                                <th style={{ textAlign: 'right' }}>今日涨跌</th>
                                <th style={{ textAlign: 'right' }}>日成交额</th>
                                <th style={{ textAlign: 'center', width: '80px' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {watchlist.map((stock) => (
                                <tr
                                    key={stock.代码}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => router.push(`/stock/${stock.代码}`)}
                                >
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stock.名称}</span>
                                            <span className="secondary-text">{stock.代码}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                        ¥{stock.最新价.toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className={stock.涨跌幅 >= 0 ? "stock-up" : "stock-down"} style={{ fontWeight: '600' }}>
                                            {stock.涨跌幅 >= 0 ? '+' : ''}{stock.涨跌幅.toFixed(2)}%
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }} className="secondary-text">
                                        {(stock.成交额 / 100000000).toFixed(2)}亿
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromWatchlist(stock.代码);
                                            }}
                                            style={{
                                                padding: '4px 10px',
                                                background: 'rgba(255, 69, 58, 0.1)',
                                                border: '1px solid rgba(255, 69, 58, 0.1)',
                                                borderRadius: '6px',
                                                color: 'var(--accent-red)',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                margin: '0 auto'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = 'var(--accent-red)';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)';
                                                e.currentTarget.style.color = 'var(--accent-red)';
                                            }}
                                        >
                                            移除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: '32px', textAlign: 'center' }} className="secondary-text">
                💡 监控提示：点击列表行可进入深度个股研报分析
            </div>
        </div>
    );
}
