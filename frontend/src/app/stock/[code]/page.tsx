"use client";
import { useEffect, useState } from "react";
import KLineChart from "@/components/KLineChart";

interface StockQuote {
    名称: string;
    最新价: number;
    成交量: number;
    成交额: number;
    最高: number;
    最低: number;
    开盘: number;
    昨收: number;
    换手率: number;
}

interface Analysis {
    advice: string;
    signal: string;
    intensity: number;
    main_force: string;
    detail_advice: string;
    structured_analysis?: {
        conclusion: string;
        tech_status: string;
        main_force: {
            inference: string;
            stage: string;
            evidence: string[];
        };
        trading_plan: {
            buy: string;
            sell: string;
            position: string;
        };
        scenarios: {
            optimistic: string;
            neutral: string;
            pessimistic: string;
        };
    };
    indicators: {
        vol_ratio: number;
        price_change: number;
    };
}

export default function StockDetailPage({ params }: { params: { code: string } }) {
    const [quote, setQuote] = useState<StockQuote | null>(null);
    const [kline, setKline] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);

    useEffect(() => {
        const userToken = localStorage.getItem('user_token');
        if (userToken) {
            try {
                const user = JSON.parse(userToken);
                setUserId(user.id);
                checkWatchlist(user.id);
            } catch (e) {
                console.error("Failed to parse user token:", e);
            }
        }
    }, [params.code]);

    const checkWatchlist = async (uid: number) => {
        try {
            const res = await fetch(`http://localhost:8000/api/user/watchlist/${uid}`);
            if (res.ok) {
                const codes: string[] = await res.json();
                setIsInWatchlist(codes.includes(params.code));
            }
        } catch (e) {
            console.error("Failed to check watchlist:", e);
        }
    };

    const toggleWatchlist = async () => {
        if (!userId) {
            alert("请先登录以使用自选功能");
            return;
        }

        const url = `http://localhost:8000/api/user/watchlist/${isInWatchlist ? 'remove' : 'add'}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, stock_code: params.code })
            });

            if (res.ok) {
                setIsInWatchlist(!isInWatchlist);
            }
        } catch (e) {
            console.error("Watchlist action failed:", e);
        }
    };

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const responses = await Promise.all([
                    fetch(`http://localhost:8000/api/stock/quote/${params.code}`),
                    fetch(`http://localhost:8000/api/stock/kline/${params.code}`),
                    fetch(`http://localhost:8000/api/stock/analysis/${params.code}`)
                ]);

                for (const res of responses) {
                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.detail || "请求失败");
                    }
                }

                const [quoteData, klineData, analysisData] = await Promise.all(responses.map(r => r.json()));

                setQuote(quoteData);
                setKline(klineData);
                setAnalysis(analysisData);
            } catch (error: any) {
                console.error("Error fetching stock data:", error);
                setError(error.message || "获取股票数据超时，请稍后重试");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [params.code]);

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center', fontSize: '18px', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ marginBottom: '20px' }}>正在获取实时行情与技术指标...</div>
        </div>
    );

    if (error) return (
        <div className="card" style={{ padding: '40px', textAlign: 'center', borderColor: 'var(--accent-red)' }}>
            <h2 style={{ color: 'var(--accent-red)', marginBottom: '16px' }}>数据加载失败</h2>
            <p style={{ marginBottom: '24px' }}>{error}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>重试</button>
        </div>
    );

    const getIntensityColor = (intensity: number) => {
        if (intensity >= 70) return 'var(--accent-red)';
        if (intensity <= 30) return 'var(--accent-green)';
        return 'var(--accent-blue)';
    };

    const renderAnalysisSection = () => {
        if (!analysis?.structured_analysis) return (
            <div style={{ color: 'var(--text-secondary)', padding: '20px' }}>正在为您生成深度诊断报告...</div>
        );

        const { structured_analysis } = analysis;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ backgroundColor: '#1a222c', padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--accent-blue)' }}>
                    <div style={{ color: 'var(--accent-blue)', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>核心结论</div>
                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#fff' }}>{structured_analysis.conclusion}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="glass" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #2d3748' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '10px' }}>技术形态</div>
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{structured_analysis.tech_status}</div>
                    </div>
                    <div className="glass" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #2d3748' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '10px' }}>资金行为推断</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: getIntensityColor(analysis.intensity), marginBottom: '8px' }}>
                            {structured_analysis.main_force.inference}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            当前阶段：<span style={{ color: '#fff' }}>{structured_analysis.main_force.stage}</span>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px', border: '1px solid #2d3748', borderRadius: '12px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>资金行为证据链</div>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, listStyle: 'none' }}>
                        {structured_analysis.main_force.evidence.map((item: string, i: number) => (
                            <li key={i} style={{ fontSize: '13px', color: '#cbd5e0', backgroundColor: '#1c252e', padding: '8px 12px', borderRadius: '6px' }}>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ padding: '16px', border: '1px solid #2d3748', borderRadius: '12px', borderTop: '2px solid #ed8936' }}>
                    <div style={{ color: '#ed8936', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>操盘建议 (条件触发)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '13px' }}><span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>[买入触发]</span> {structured_analysis.trading_plan.buy}</div>
                        <div style={{ fontSize: '13px' }}><span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>[卖出风控]</span> {structured_analysis.trading_plan.sell}</div>
                        <div style={{ marginTop: '4px', fontSize: '13px', padding: '8px', background: '#2d3748', borderRadius: '6px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>仓位策略：</span>{structured_analysis.trading_plan.position}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {Object.entries(structured_analysis.scenarios).map(([key, value]) => (
                        <div key={key} style={{ padding: '10px', background: '#171d25', borderRadius: '8px', border: '1px solid #2d3748' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'capitalize' }}>
                                {key === 'optimistic' ? '🚀 乐观推演' : key === 'neutral' ? '⚖️ 中性推演' : '⚠️ 悲观推演'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#a0aec0', lineHeight: '1.4' }}>{value as string}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
                        <h1 style={{ fontSize: '32px', margin: 0 }}>{quote?.名称} <span style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>{params.code}</span></h1>
                        <button
                            onClick={toggleWatchlist}
                            style={{
                                padding: '8px 16px',
                                background: isInWatchlist ? 'rgba(255,193,7,0.1)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${isInWatchlist ? '#ffc107' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '6px',
                                color: isInWatchlist ? '#ffc107' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span style={{ fontSize: '16px' }}>{isInWatchlist ? '⭐' : '☆'}</span>
                            {isInWatchlist ? '已自选' : '添加自选'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 'bold' }} className={quote && quote.最新价 >= quote.昨收 ? "stock-up" : "stock-down"}>
                            {quote?.最新价.toFixed(2)}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span className={quote && quote.最新价 >= quote.昨收 ? "stock-up" : "stock-down"} style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                {quote && (quote.最新价 >= quote.昨收 ? '+' : '')}{(quote!.最新价 - quote!.昨收).toFixed(2)}
                            </span>
                            <span className={quote && quote.最新价 >= quote.昨收 ? "stock-up" : "stock-down"} style={{ fontSize: '14px' }}>
                                {quote && ((quote.最新价 - quote.昨收) / quote.昨收 * 100).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', fontSize: '14px', borderLeft: '1px solid #2d3748', paddingLeft: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>成交量</span> <span style={{ fontWeight: 'bold' }}>{(quote?.成交量 || 0).toFixed(2)}万</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>成交额</span> <span style={{ fontWeight: 'bold' }}>{(quote?.成交额 || 0 / 100000000).toFixed(2)}万</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>最高价</span> <span className="stock-up" style={{ fontWeight: 'bold' }}>{quote?.最高}</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>最低价</span> <span className="stock-down" style={{ fontWeight: 'bold' }}>{quote?.最低}</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>今开盘</span> <span style={{ fontWeight: 'bold' }}>{quote?.开盘}</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>昨收盘</span> <span style={{ fontWeight: 'bold' }}>{quote?.昨收}</span></div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card" style={{ padding: '24px' }}>
                        <KLineChart data={kline} symbol={quote?.名称 || params.code} />
                    </div>

                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '16px' }}>指标综合监测</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>量比</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: analysis?.indicators.vol_ratio! > 1.2 ? 'var(--accent-red)' : '#fff' }}>{analysis?.indicators.vol_ratio}</div>
                            </div>
                            <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>24H 涨跌</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }} className={analysis?.indicators.price_change! >= 0 ? "stock-up" : "stock-down"}>{analysis?.indicators.price_change}%</div>
                            </div>
                            <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>资金流入评分</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: getIntensityColor(analysis?.intensity || 50) }}>{analysis?.intensity}</div>
                            </div>
                            <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>建议评级</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: analysis?.signal === 'Buy' ? 'var(--accent-red)' : analysis?.signal === 'Sell' ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                                    {analysis?.signal === 'Buy' ? '看多' : analysis?.signal === 'Sell' ? '看空' : '博弈'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card glass" style={{ padding: '24px', borderColor: analysis?.signal === 'Buy' ? 'rgba(255,82,82,0.3)' : analysis?.signal === 'Sell' ? 'rgba(0,200,83,0.3)' : 'var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>智能诊断报告</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: '#2d3748', padding: '2px 8px', borderRadius: '10px' }}>AI 实时计算</span>
                        </div>

                        {renderAnalysisSection()}

                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #2d3748' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', lineHeight: '1.6' }}>
                                * 本报告基于历史量价行为概率模型推断，不构成投资建议。股市具有高度不确定性，请决策前充分评估风险。
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ background: '#1a1d21', border: '1px dashed #2d3748' }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>📊 投研纪律提示</h3>
                        <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.8' }}>
                            <li>拒绝冲动交易，仅在触发条件满足时执行；</li>
                            <li>严格执行止损，保护本金是生存的第一法则；</li>
                            <li>不预测底部，不幻想顶部，顺势而为；</li>
                            <li>仓位管理决定生存质量，切勿单仓重仓。</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
