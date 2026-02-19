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
        short_summary?: string;
        detailed_summary?: string;
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
        trend_judgment?: Array<{
            period: string;
            trend: string;
            explanation: string;
        }>;
    };
    indicators: {
        vol_ratio: number;
        price_change: number;
        pe?: number;
        pb?: number;
        eps?: number;
        roe?: number;
        debt_ratio?: number;
    };
}

interface NewsItem {
    title: string;
    time: string;
    source: string;
    url: string;
}

export default function StockDetailPage({ params }: { params: { code: string } }) {
    const [quote, setQuote] = useState<StockQuote | null>(null);
    const [kline, setKline] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [news, setNews] = useState<NewsItem[]>([]);

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
        // 1. Fetch Quote (High Priority)
        async function fetchQuote() {
            try {
                const userToken = localStorage.getItem('user_token');
                let uid = "";
                if (userToken) {
                    try { uid = JSON.parse(userToken).id; } catch (e) { }
                }
                const res = await fetch(`http://localhost:8000/api/stock/quote/${params.code}${uid ? `?user_id=${uid}` : ''}`);

                if (res.status === 429) {
                    const errorData = await res.json();
                    alert(`🚫 访问受限\n\n${errorData.detail}`);
                    setError(errorData.detail);
                    setLoading(false);
                    return;
                }

                if (res.ok) setQuote(await res.json());
            } catch (e) {
                console.error("Quote fetch error:", e);
                setError("获取行情数据失败，请检查网络连接");
                setLoading(false);
            }
        }

        // 2. Fetch K-Line
        async function fetchKline() {
            try {
                const res = await fetch(`http://localhost:8000/api/stock/kline/${params.code}`);
                if (res.ok) setKline(await res.json());
            } catch (e) { console.error("Kline fetch error:", e); }
        }

        // 3. Fetch AI Analysis (Low Priority, Slow)
        async function fetchAnalysis() {
            try {
                const res = await fetch(`http://localhost:8000/api/stock/analysis/${params.code}`);
                if (res.ok) {
                    setAnalysis(await res.json());
                } else if (res.status === 429) {
                    setError("您查询太频繁了，请稍后再试。");
                    setLoading(false);
                } else {
                    const data = await res.json();
                    setError(data.detail || "智能诊断获取失败，请重试。");
                }
            } catch (e) {
                console.error("Analysis fetch error:", e);
                setError("由于网络波动，智能诊断生成失败，请刷新页面。");
            } finally {
                setLoading(false);
            }
        }

        // 4. Fetch Influential News
        async function fetchNews() {
            try {
                const res = await fetch(`http://localhost:8000/api/stock/influential_news/${params.code}`);
                if (res.ok) setNews(await res.json());
            } catch (e) {
                console.error("News fetch error:", e);
            }
        }

        fetchQuote();
        fetchKline();
        fetchAnalysis();
        fetchNews();
    }, [params.code]);

    if (!quote && loading) return (
        <div style={{ padding: '60px', textAlign: 'center', fontSize: '18px', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ marginBottom: '20px' }}>正在连接数据终端...</div>
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

    const indicatorInterpretations: any = {
        vol_ratio: {
            title: "量比 —— 衡量相对成交量的指标",
            content: [
                "定义：当前每分钟的成交量 / 过去 5 个交易日平均每分钟成交量。",
                "用法：量比大于 1 说明当前交易活跃，数值越大说明资金参与度越高。",
                "技巧：量比大于 1.5 - 2.5 倍通常是放量突破的信号。"
            ]
        },
        price_change: {
            title: "涨跌幅 —— 个股最直观的强弱",
            content: [
                "含义：过去 24 小时或最近一个交易日价格变动的百分比。",
                "通俗理解：价格的波动方向，反映了市场短期的买卖意愿。",
                "注意：需配合成交量观察，放量上涨才是最扎实的走势。"
            ]
        },
        intensity: {
            title: "资金流入评分 —— 洞察主力动向",
            content: [
                "含义：基于逐笔成交数据计算出的资金主动参与强度（0-100分）。",
                "规则：> 70 分代表主力强势扫货；30-70 分为存量博弈；< 30 分说明卖盘占据主导。",
                "用法：寻找分值持续上升的标的，通常意味着机构或大资金正在吸筹。"
            ]
        },
        signal: {
            title: "建议评级 —— AI 综合诊断结论",
            content: [
                "含义：DeepSeek 引擎结合量价关系、趋势和筹码给出的决策建议。",
                "标签：‘看多’（多头占优）、‘看空’（空头占优）、‘博弈’（多空对峙）。",
                "策略：在‘看多’且评分高时关注，‘博弈’期应保持轻仓或观望。"
            ]
        },
        pe: {
            title: "市盈率 (PE) —— 最核心的指标",
            content: [
                "含义：你为了公司每赚 1 块钱，愿意出多少价格购买。",
                "通俗理解：假设公司每年赚的钱分给你，你需要多少年才能回本。PE = 10 倍，意味着理论上 10 年回本。",
                "新手用法：低 PE (5-15) 通常代表便宜；高 PE (50+) 代表高预期高风险。注意同行业对比。"
            ]
        },
        pb: {
            title: "市净率 (PB) —— 资产的“打折”程度",
            content: [
                "公式：股价 / 每股净资产。",
                "含义：衡量股价相对于公司家底（资产）的溢价程度。",
                "新手用法：PB < 1 称为“破净”，通常极度悲观。重资产行业看 PB 更准，轻资产行业意义不大。"
            ]
        },
        eps: {
            title: "每股收益 (EPS) —— 赚钱能力的体现",
            content: [
                "含义：公司净利润 / 总股本。",
                "通俗理解：假如你买了一股，这一年公司为你赚了多少钱。",
                "新手用法：首选 EPS 持续增长的公司。突然大增需警惕一次性收益，持续下降说明生意难做。"
            ]
        },
        roe: {
            title: "净资产收益率 (ROE) —— 巴菲特最看重",
            content: [
                "含义：净利润 / 净资产。",
                "通俗理解：投入 100 块钱能赚回多少利润，衡量管理层能力的核心指标。",
                "新手用法：ROE > 15% 是优秀门槛，< 10% 效率一般。尽量选连续多年保持在 15% 以上的公司。"
            ]
        },
        debt_ratio: {
            title: "资产负债率 —— 财务风险“报警器”",
            content: [
                "含义：总负债 / 总资产。",
                "通俗理解：公司借的钱占总资产的比例。",
                "新手用法：40%-60% 适中且风险可控；80% 以上风险高，易断裂（除银行/地产外）。"
            ]
        }
    };

    const renderIndicatorCard = (label: string, value: string | number | undefined, color: string, key?: string, align: 'left' | 'right' | 'center' = 'center') => {
        const interpretation = key ? indicatorInterpretations[key] : null;

        return (
            <div
                className="card interactive indicator-tooltip-trigger"
                style={{
                    padding: '20px',
                    background: 'var(--bg-base)',
                    textAlign: 'center',
                    boxShadow: 'none',
                    position: 'relative'
                }}
            >
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600' }}>{label}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: color }}>
                    {value !== undefined ? value : (loading ? <span className="spinner-small" style={{ display: 'inline-block', width: '20px', height: '20px' }}></span> : '---')}
                </div>

                {interpretation && (
                    <div className={`indicator-tooltip ${align === 'left' ? 'tooltip-left' : align === 'right' ? 'tooltip-right' : ''}`}>
                        <div style={{ fontWeight: '700', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', fontSize: '13px' }}>
                            {interpretation.title}
                        </div>
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '12px', textAlign: 'left', lineHeight: '1.6' }}>
                            {interpretation.content.map((c: string, idx: number) => (
                                <li key={idx} style={{ marginBottom: '6px', display: 'flex', gap: '6px' }}>
                                    <span style={{ color: 'var(--accent-blue)' }}>▶</span>
                                    <span>{c}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    const renderAnalysisSection = () => {
        if (!analysis?.structured_analysis) return (
            <div style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>
                <div className="spinner-small" style={{ margin: '0 auto 12px' }}></div>
                正在为您生成深度研报...
            </div>
        );

        const { structured_analysis } = analysis;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 核心结论 - 结构升级版 */}
                <div
                    className="card interactive fadeInUp"
                    style={{
                        backgroundColor: 'var(--bg-base)',
                        padding: '20px 24px',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        position: 'relative',
                        boxShadow: 'none'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                    }}>
                        <span style={{ fontSize: '18px' }}>🎯</span>
                        <span style={{
                            color: '#ff4d4f',
                            fontSize: '16.5px',
                            fontWeight: '800'
                        }}>一句话结论</span>
                    </div>

                    <div style={{
                        fontSize: '18.5px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        lineHeight: '1.5',
                        marginBottom: '16px'
                    }}>
                        {structured_analysis.short_summary || structured_analysis.conclusion}
                    </div>

                    <div style={{
                        height: '1px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        marginBottom: '12px'
                    }} />

                    <div style={{
                        fontSize: '13.5px',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.7',
                        fontWeight: '400',
                        opacity: 0.8
                    }}>
                        {structured_analysis.detailed_summary || analysis.detail_advice}
                    </div>
                </div>

                {/* 趋势判断 - 重新设计：合并列、动态配色与交互增强 */}
                {structured_analysis.trend_judgment && (
                    <div className="card interactive fadeInUp" style={{
                        padding: '0',
                        backgroundColor: 'var(--bg-base)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden',
                        borderRadius: '16px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '20px 24px',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'linear-gradient(90deg, rgba(0,122,255,0.05) 0%, transparent 100%)'
                        }}>
                            <span style={{ fontSize: '24px' }}>📉</span>
                            <span style={{ color: 'var(--accent-blue)', fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>趋势判断</span>
                        </div>
                        <div style={{ width: '100%', fontSize: '13px' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '150px 1fr',
                                padding: '12px 24px',
                                backgroundColor: 'rgba(0,122,255,0.03)',
                                color: 'var(--text-secondary)',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                fontSize: '11px',
                                letterSpacing: '1px'
                            }}>
                                <div>周期</div>
                                <div>判断结果</div>
                            </div>
                            {structured_analysis.trend_judgment?.map((item: any, idx: number, arr: any[]) => {
                                // 动态配色与高级视觉效果
                                const getTrendStyle = (text: string) => {
                                    const isPositive = /涨|强|突破|向好|支撑|回归|多方/.test(text);
                                    const isNegative = /跌|弱|风险|偏弱|压力|空头|离场/.test(text);
                                    const isUnclear = /不明|不确定|观望|观察/.test(text);

                                    if (isPositive) return {
                                        bg: 'linear-gradient(135deg, #ff4e50 0%, #f92a3c 100%)',
                                        glow: '0 4px 15px rgba(255,78,80,0.4)',
                                        icon: '📈',
                                        light: 'rgba(255,78,80,0.08)'
                                    };
                                    if (isNegative) return {
                                        bg: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                                        glow: '0 4px 15px rgba(82,196,26,0.4)',
                                        icon: '📉',
                                        light: 'rgba(82,196,26,0.08)'
                                    };
                                    if (isUnclear) return {
                                        bg: 'linear-gradient(135deg, #8c8c8c 0%, #595959 100%)',
                                        glow: '0 4px 15px rgba(140,140,140,0.4)',
                                        icon: '🔍',
                                        light: 'rgba(140,140,140,0.08)'
                                    };
                                    // 默认/不好不坏 (蓝色)
                                    return {
                                        bg: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)',
                                        glow: '0 4px 15px rgba(24,144,255,0.4)',
                                        icon: '⚖️',
                                        light: 'rgba(24,144,255,0.08)'
                                    };
                                };

                                const style = getTrendStyle(item.trend);

                                return (
                                    <div key={idx} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '120px 1fr',
                                        padding: '16px 20px',
                                        borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)',
                                        alignItems: 'center',
                                        transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
                                        cursor: 'default',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.06)';
                                            const box = e.currentTarget.querySelector('.exp-box') as HTMLElement;
                                            if (box) box.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            const box = e.currentTarget.querySelector('.exp-box') as HTMLElement;
                                            if (box) box.style.transform = 'translateY(0)';
                                        }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
                                            <div style={{ color: 'var(--text-primary)', fontWeight: '800', fontSize: '14px' }}>{item.period}</div>
                                            <div style={{ display: 'flex' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    background: style.bg,
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: '900',
                                                    boxShadow: style.glow,
                                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                                    whiteSpace: 'nowrap',
                                                    letterSpacing: '0.3px'
                                                }}>
                                                    {style.icon} {item.trend}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="exp-box" style={{
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            lineHeight: '1.6',
                                            padding: '10px 16px',
                                            backgroundColor: style.light,
                                            backdropFilter: 'blur(8px)',
                                            borderRadius: '12px',
                                            border: `1px solid ${style.light.replace('0.08', '0.15')}`,
                                            fontWeight: '400',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                                            marginLeft: '8px',
                                            transition: 'all 0.3s ease',
                                            zIndex: 1
                                        }}>
                                            {item.explanation}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="card interactive" style={{ padding: '16px', backgroundColor: 'var(--bg-base)', boxShadow: 'none' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', fontWeight: '600' }}>技术形态</div>
                        <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}>{structured_analysis.tech_status}</div>
                    </div>
                    <div className="card interactive" style={{ padding: '16px', backgroundColor: 'var(--bg-base)', boxShadow: 'none' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', fontWeight: '600' }}>资金行为推断</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: getIntensityColor(analysis.intensity), marginBottom: '8px' }}>
                            {structured_analysis.main_force.inference}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            当前阶段：<span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{structured_analysis.main_force.stage}</span>
                        </div>
                    </div>
                </div>

                <div className="card interactive" style={{ padding: '16px', backgroundColor: 'var(--bg-base)', boxShadow: 'none' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '12px', fontWeight: '600' }}>资金行为证据链</div>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, listStyle: 'none' }}>
                        {structured_analysis.main_force.evidence.map((item: string, i: number) => (
                            <li key={i} style={{
                                fontSize: '12px',
                                color: 'var(--text-primary)',
                                backgroundColor: 'var(--bg-card)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                • {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="card interactive" style={{ padding: '16px', backgroundColor: 'var(--bg-base)', borderTop: '2px solid #ed8936', boxShadow: 'none' }}>
                    <div style={{ color: '#ed8936', fontSize: '11px', fontWeight: 'bold', marginBottom: '12px' }}>操盘建议 (条件触发)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                            <span style={{ color: 'var(--accent-red)', fontWeight: 'bold', marginRight: '4px' }}>[买入触发]</span>
                            {structured_analysis.trading_plan.buy}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                            <span style={{ color: 'var(--accent-green)', fontWeight: 'bold', marginRight: '4px' }}>[卖出风控]</span>
                            {structured_analysis.trading_plan.sell}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '12px', padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>仓位策略：</span>
                            <span style={{ color: 'var(--text-primary)' }}>{structured_analysis.trading_plan.position}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {Object.entries(structured_analysis.scenarios).map(([key, value]) => (
                        <div key={key} className="card interactive" style={{ padding: '10px', backgroundColor: 'var(--bg-base)', boxShadow: 'none', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>
                                {key === 'optimistic' ? '🚀 乐观' : key === 'neutral' ? '⚖️ 中性' : '⚠️ 悲观'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{value as string}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <header className="card fadeInUp" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-card)',
                padding: '32px 40px'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '12px' }}>
                        <h1 style={{ fontSize: '32px', margin: 0, fontWeight: '700', letterSpacing: '-1px' }}>
                            {quote?.名称}
                            <span style={{ color: 'var(--text-secondary)', fontSize: '18px', marginLeft: '12px', fontWeight: '400' }}>{params.code}</span>
                        </h1>
                        <button
                            onClick={toggleWatchlist}
                            style={{
                                padding: '6px 16px',
                                background: isInWatchlist ? 'rgba(255,193,7,0.1)' : 'rgba(0,122,255,0.05)',
                                border: `1px solid ${isInWatchlist ? '#ffc107' : 'var(--accent-blue)'}`,
                                borderRadius: '20px',
                                color: isInWatchlist ? '#ffc107' : 'var(--accent-blue)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span>{isInWatchlist ? '⭐' : '☆'}</span>
                            {isInWatchlist ? '已自选' : '加入自选'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '42px', fontWeight: '800', lineHeight: 1, letterSpacing: '-1px' }} className={quote && quote.最新价 >= quote.昨收 ? "stock-up" : "stock-down"}>
                            {quote?.最新价.toFixed(2)}
                        </span>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                            <span className={quote && quote.最新价 >= quote.昨收 ? "stock-up" : "stock-down"} style={{ fontWeight: '700', fontSize: '20px' }}>
                                {quote && (
                                    <>
                                        {quote.最新价 >= quote.昨收 ? '+' : ''}
                                        {(quote.最新价 - quote.昨收).toFixed(2)}
                                    </>
                                )}
                            </span>
                            <span className={quote && quote.最新价 >= quote.昨收 ? "stock-up" : "stock-down"} style={{ fontSize: '20px', fontWeight: '600' }}>
                                {quote && (((quote.最新价 - quote.昨收) / quote.昨收) * 100).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px 48px',
                    fontSize: '14px',
                    borderLeft: '1px solid var(--border-color)',
                    paddingLeft: '48px'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="secondary-text">成交量</span>
                        <span style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-primary)' }}>
                            {quote ? (quote.成交量 / 1000000).toFixed(2) : '0.00'}万手
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="secondary-text">成交额</span>
                        <span style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-primary)' }}>
                            {quote ? (quote.成交额 / 100000000).toFixed(2) : '0.00'}亿元
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="secondary-text">最高价</span>
                        <span className="stock-up" style={{ fontWeight: '600', fontSize: '16px' }}>{quote?.最高}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="secondary-text">最低价</span>
                        <span className="stock-down" style={{ fontWeight: '600', fontSize: '16px' }}>{quote?.最低}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="secondary-text">今开盘</span>
                        <span style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-primary)' }}>{quote?.开盘}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="secondary-text">昨收盘</span>
                        <span style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-primary)' }}>{quote?.昨收}</span>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card" style={{ padding: '32px', borderTop: '4px solid var(--accent-blue)' }}>
                        <KLineChart data={kline} symbol={quote?.名称 || params.code} />
                    </div>

                    <div className="card" style={{ padding: '32px', overflow: 'visible', borderTop: '4px solid var(--accent-green)' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>📊 指标综合监测</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {renderIndicatorCard("量比", analysis?.indicators.vol_ratio, analysis?.indicators.vol_ratio! > 1.2 ? 'var(--accent-red)' : 'var(--text-primary)', 'vol_ratio', 'left')}
                            {renderIndicatorCard("24H 涨跌", analysis?.indicators.price_change !== undefined ? `${analysis.indicators.price_change}%` : '---', analysis?.indicators.price_change! >= 0 ? "stock-up" : "stock-down", 'price_change')}
                            {renderIndicatorCard(
                                "建议评级",
                                !analysis ? '---' : (analysis.signal === 'Buy' ? '看多' : analysis.signal === 'Sell' ? '看空' : '博弈'),
                                !analysis ? 'var(--text-secondary)' : (analysis.signal === 'Buy' ? 'var(--accent-red)' : analysis.signal === 'Sell' ? 'var(--accent-green)' : 'var(--accent-blue)'),
                                'signal',
                                'right'
                            )}

                            {renderIndicatorCard("市盈率 (PE)", analysis?.indicators.pe, 'var(--text-primary)', 'pe', 'left')}
                            {renderIndicatorCard("市净率 (PB)", analysis?.indicators.pb, 'var(--text-primary)', 'pb')}
                            {renderIndicatorCard("每股收益 (EPS)", analysis?.indicators.eps, 'var(--text-primary)', 'eps')}
                            {renderIndicatorCard("净资产收益率 (ROE)", analysis?.indicators.roe !== undefined ? `${analysis.indicators.roe}%` : '---', 'var(--text-primary)', 'roe', 'right')}
                            {renderIndicatorCard("资产负债率", analysis?.indicators.debt_ratio !== undefined ? `${analysis.indicators.debt_ratio}%` : '---', 'var(--text-primary)', 'debt_ratio', 'left')}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '32px', borderTop: '4px solid #ed8936' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>📰</span>
                            核心影响事件监测
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {news.length > 0 ? (
                                news.map((item, idx) => (
                                    <a
                                        key={idx}
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="interactive"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px',
                                            padding: '8px 16px',
                                            background: 'var(--bg-base)',
                                            borderRadius: '8px',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            transition: 'all 0.2s ease',
                                            border: '1px solid transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--accent-blue)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'transparent';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                            {item.title}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span>{item.source}</span>
                                                <span>{item.time}</span>
                                            </div>
                                            <span style={{ color: 'var(--accent-blue)', opacity: 0.8 }}>查看详情 →</span>
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    暂未在大数据池中监测到显著影响股价的实控人相关事件
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card glass" style={{ padding: '28px', borderTop: `4px solid ${analysis?.signal === 'Buy' ? 'var(--accent-red)' : analysis?.signal === 'Sell' ? 'var(--accent-green)' : 'var(--accent-blue)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>🚀 智能诊断报告</h3>
                            <span style={{ fontSize: '10px', color: 'var(--accent-blue)', backgroundColor: 'rgba(0,122,255,0.1)', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', letterSpacing: '0.05em' }}>AI 实时计算</span>
                        </div>

                        {renderAnalysisSection()}

                        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', lineHeight: '1.8' }}>
                                * 本报告基于历史量价行为概率模型推断，不构成投资建议。股市具有高度不确定性，请决策前充分评估风险。
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ background: 'var(--bg-base)', border: '1px dashed var(--border-color)', borderTop: '4px solid var(--accent-blue)', boxShadow: 'none' }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>📊 投研纪律提示</h3>
                        <ul className="secondary-text" style={{ paddingLeft: '20px', lineHeight: '2' }}>
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
