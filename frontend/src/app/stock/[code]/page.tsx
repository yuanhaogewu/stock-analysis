"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import KLineChart from "@/components/KLineChart";
import FundFlowTable from "@/components/FundFlowTable";
import CapitalFlowHistory from "@/components/CapitalFlowHistory";
import PeerRadarChart from "@/components/PeerRadarChart";

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
    总市值: number;
    振幅: number;
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
        inst_consensus?: string;

        trend_judgment?: Array<{
            period: string;
            trend: string;
            explanation: string;
        }>;
        support_price?: string | number;
        resistance_price?: string | number;
        chart_signals?: Array<{
            date: string;
            type: 'buy' | 'sell';
            price: number;
            title: string;
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
        rsi?: number;
    };
    key_events?: Array<{
        event: string;
        interpretation: string;
        source_url?: string;
    }>;
}

interface NewsItem {
    title: string;
    time: string;
    source: string;
    url: string;
    interpretation?: string;
    tag?: string;
}

export default function StockDetailPage({ params }: { params: { code: string } }) {
    const router = useRouter();
    const [quote, setQuote] = useState<StockQuote | null>(null);
    const [kline, setKline] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [isNewsLoading, setIsNewsLoading] = useState(true);
    const [platformInfo, setPlatformInfo] = useState({ name: '芯思维', en: 'MindNode', slogan: '多维度股票AI分析系统' });
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [visualIndicators, setVisualIndicators] = useState<any>(null);
    const [showIntensityTooltip, setShowIntensityTooltip] = useState(false);
    const [fundFlow, setFundFlow] = useState<any>(null);
    const [fundFlowLoading, setFundFlowLoading] = useState(true);
    const [capitalFlowData, setCapitalFlowData] = useState<any[]>([]);
    const [capitalFlowLoading, setCapitalFlowLoading] = useState(true);
    const [peerRadarData, setPeerRadarData] = useState<any>(null);
    const [peerRadarLoading, setPeerRadarLoading] = useState(true);

    // 性能优化：缓存 K线数据和图表参数，避免父组件重绘导致的图表闪烁/重复加载
    const klineData = useMemo(() => {
        if (!kline || kline.length === 0) return [];
        const d = [...kline];
        // 将 AI 信号平滑植入 K线数据中 (如果有)
        if (analysis?.structured_analysis?.chart_signals) {
            (d as any).signals = analysis.structured_analysis.chart_signals;
        }
        return d;
    }, [kline, analysis]);

    const chartSymbol = useMemo(() => {
        return quote?.名称 || params.code;
    }, [quote?.名称, params.code]);

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
        fetchPlatformInfo();
    }, [params.code]);

    useEffect(() => {
        if (quote?.名称) {
            document.title = `${quote.名称} - ${platformInfo.name}(${platformInfo.en}) - ${platformInfo.slogan}`;
        }
    }, [quote, platformInfo]);

    const fetchPlatformInfo = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/admin/config');
            if (res.ok) {
                const data = await res.json();
                setPlatformInfo({
                    name: data.platform_name || '芯思维',
                    en: data.platform_name_en || 'MindNode',
                    slogan: data.platform_slogan || '多维度股票AI分析系统'
                });
            }
        } catch (e) { console.error('Error fetching platform info'); }
    };

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
        let active = true;

        // 请求开始前，彻底清空旧状态，防止闪现或双重显示旧数据
        setLoading(true);
        setQuote(null);
        setAnalysis(null);
        setVisualIndicators(null);
        setAnalysisError(null);
        setNews([]);
        setKline([]);
        setError(null);

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
                    if (active) {
                        alert(`🚫 访问受限\n\n${errorData.detail}`);
                        setError(errorData.detail);
                        setLoading(false);
                    }
                    return;
                }

                if (active && res.ok) {
                    setQuote(await res.json());
                    // 只要行情回来了，就让骨架屏消失，优先显示基础界面
                    setLoading(false);
                }
            } catch (e) {
                console.error("Quote fetch error:", e);
                if (active) {
                    setError("获取行情数据失败，请检查网络连接");
                    setLoading(false);
                }
            }
        }

        // 2. Fetch Visual Indicators (Fast Path - Numerical Only)
        async function fetchVisualIndicators() {
            try {
                const res = await fetch(`http://localhost:8000/api/stock/visual_indicators/${params.code}`);
                if (active && res.ok) {
                    setVisualIndicators(await res.json());
                    // 视觉指标回来也确保 loading 结束
                    setLoading(false);
                }
            } catch (e) { console.error("Visual indicators fetch error:", e); }
        }

        // 3. Fetch K-Line
        async function fetchKline() {
            try {
                const res = await fetch(`http://localhost:8000/api/stock/kline/${params.code}`);
                if (active && res.ok) {
                    setKline(await res.json());
                    // K线回来也确保 loading 结束
                    setLoading(false);
                }
            } catch (e) { console.error("Kline fetch error:", e); }
        }

        // 4. Fetch AI Analysis (Low Priority, Slow)
        async function fetchAnalysis() {
            try {
                const userToken = localStorage.getItem('user_token');
                let uid = "";
                if (userToken) {
                    try { uid = JSON.parse(userToken).id; } catch (e) { }
                }
                const res = await fetch(`http://localhost:8000/api/stock/analysis/${params.code}${uid ? `?user_id=${uid}` : ''}`);
                if (res.ok) {
                    const data = await res.json();
                    if (active) {
                        setAnalysis(data);
                        setAnalysisError(null);
                    }
                } else if (res.status === 429) {
                    const data = await res.json();
                    const detail = data.detail || "";
                    if (active) {
                        if (detail.includes("每小时 20 次")) {
                            setAnalysisError(`📊 已达到分析限额\n\n${detail}\n\nVip 会员每小时可享 20 次深度诊断权益。`);
                        } else {
                            setAnalysisError(detail || "访问太频繁了，请稍后再试。");
                        }
                    }
                } else {
                    try {
                        const data = await res.json();
                        if (active) setAnalysisError(data.detail || "智能诊断获取失败，请重试。");
                    } catch (e) {
                        if (active) setAnalysisError("服务器响应异常，请稍后重试。");
                    }
                }
            } catch (e) {
                console.error("Analysis fetch error:", e);
                if (active) setAnalysisError("由于网络不稳定，智能诊断加载失败。");
            }
        }

        // 5. Fetch Influential News
        async function fetchNews() {
            if (active) setIsNewsLoading(true);
            try {
                const res = await fetch(`http://localhost:8000/api/stock/influential_news/${params.code}`);
                if (active && res.ok) setNews(await res.json());
            } catch (e) {
                console.error("News fetch error:", e);
            } finally {
                if (active) setIsNewsLoading(false);
            }
        }

        // 6. Fetch Fund Flow
        async function fetchFundFlow() {
            try {
                if (active) setFundFlowLoading(true);
                const res = await fetch(`http://localhost:8000/api/stock/fund_flow/${params.code}`);
                if (active && res.ok) {
                    setFundFlow(await res.json());
                }
            } catch (e) {
                console.error("Fund flow fetch error:", e);
            } finally {
                if (active) setFundFlowLoading(false);
            }
        }

        // 7. Fetch Capital Flow History
        async function fetchCapitalFlowHistory() {
            try {
                if (active) setCapitalFlowLoading(true);
                const res = await fetch(`http://localhost:8000/api/stock/capital_flow/${params.code}`);
                if (active && res.ok) {
                    setCapitalFlowData(await res.json());
                }
            } catch (e) {
                console.error("Capital flow history fetch error:", e);
            } finally {
                if (active) setCapitalFlowLoading(false);
            }
        }

        // 8. Fetch Peer Radar
        async function fetchPeerRadar() {
            try {
                if (active) setPeerRadarLoading(true);
                const res = await fetch(`http://localhost:8000/api/stock/peer_radar/${params.code}`);
                if (active && res.ok) {
                    setPeerRadarData(await res.json());
                }
            } catch (e) {
                console.error("Peer radar fetch error:", e);
            } finally {
                if (active) setPeerRadarLoading(false);
            }
        }

        fetchQuote();
        fetchVisualIndicators();
        fetchKline();
        fetchAnalysis();
        fetchNews();
        fetchFundFlow();
        fetchCapitalFlowHistory();
        fetchPeerRadar();

        return () => {
            active = false;
        };
    }, [params.code]);

    if (!quote && loading) return (
        <div style={{ padding: '60px', textAlign: 'center', fontSize: '18px', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ marginBottom: '20px' }}>正在连接数据终端...</div>
        </div>
    );

    if (error && !quote) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '100px auto' }}>
            <div className="card" style={{ padding: '40px', textAlign: 'center', borderColor: 'var(--accent-red)', background: 'rgba(255, 69, 58, 0.05)' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                <h2 style={{ color: 'var(--accent-red)', marginBottom: '16px', fontSize: '20px' }}>加载受限</h2>
                <div style={{ marginBottom: '24px', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{error}</div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="btn-primary" onClick={() => window.location.reload()} style={{ padding: '10px 24px' }}>重试</button>
                    <button
                        onClick={() => router.push('/pay')}
                        style={{
                            padding: '10px 24px',
                            background: 'var(--accent-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        开通/续费会员
                    </button>
                </div>
            </div>
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
        rsi: {
            title: "RSI 指标 —— 衡量买卖力量强弱",
            content: [
                "原理：比较一段时期内的平均收盘涨幅和跌幅，取值 0-100。",
                "规则：> 70 为“超买区”，买方力量过强需警惕回调；< 30 为“超卖区”，跌势过猛可能反弹。",
                "新手用法：主要看是否背离。若价格新高而 RSI 低于前高，说明涨不动了，可能要跌。"
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

        // 处理负数及异常值显示
        let displayValue: any = value;
        let displayColor = color;

        if (typeof value === 'number') {
            if (key === 'pe' && value <= 0) {
                displayValue = '亏损';
                displayColor = 'var(--accent-red)';
            } else if (key === 'pb' && value <= 0) {
                displayValue = '资不抵债';
                displayColor = 'var(--accent-red)';
            }
        }

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
                <div style={{ fontSize: displayValue === '资不抵债' ? '18px' : '24px', fontWeight: '800', color: displayColor }}>
                    {displayValue !== undefined ? displayValue : (loading ? <span className="spinner-small" style={{ display: 'inline-block', width: '20px', height: '20px' }}></span> : '---')}
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
        if (analysisError) return (
            <div className="card" style={{ padding: '30px', textAlign: 'center', background: 'rgba(255, 69, 58, 0.05)', borderColor: 'var(--accent-red)' }}>
                <div style={{ fontSize: '30px', marginBottom: '15px' }}>⚠️</div>
                <div style={{ color: 'var(--accent-red)', fontWeight: 'bold', marginBottom: '8px' }}>智能诊断受限</div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '20px' }}>{analysisError}</div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button className="btn-primary" onClick={() => window.location.reload()} style={{ padding: '6px 16px', fontSize: '12px' }}>重试</button>
                    <button onClick={() => router.push('/pay')} style={{ padding: '6px 16px', fontSize: '12px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>开通会员</button>
                </div>
            </div>
        );

        if (!analysis?.structured_analysis) return (
            <div className="generating-report-box animate-fadeInUp">
                <div className="ai-icon-pulse">🤖</div>
                <div className="generating-text">
                    正在为您生成深度研报
                    <div className="loading-dots">
                        <span>.</span><span>.</span><span>.</span>
                    </div>
                </div>
            </div>
        );

        const { structured_analysis } = analysis;
        const fullText = (structured_analysis.detailed_summary || '').trim();
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);

        // 1. 结构化提取内容库
        const topLogicPoints: string[] = [];
        const additionalDescription: string[] = [];
        const futureTrendStages: string[] = [];
        const strategicInsights: string[] = [];
        let mainAnalysisTitle = "";
        let inTrendSection = false;

        const statusLine = lines[0] || "";

        lines.slice(1).forEach(line => {
            if (line.includes('技术面分析')) {
                mainAnalysisTitle = line.replace(/[:：]/g, '').trim();
                inTrendSection = false;
            } else if (line.includes('未来趋势演判') || line.includes('未来走势推演')) {
                inTrendSection = true;
            } else if (inTrendSection) {
                if (line.match(/^[🔵🔴🟢🟡•\-📌阶段]/) || line.trim()) {
                    const cleaned = line.replace(/^[•\-]\s*/, '').trim();
                    if (cleaned) {
                        if (cleaned.match(/(短期|中期|长期)/)) {
                            futureTrendStages.push(cleaned);
                        } else if (cleaned.match(/(风险|空仓|持有|不建议|操作策略)/)) {
                            strategicInsights.push(cleaned);
                        } else {
                            futureTrendStages.push(cleaned);
                        }
                    }
                }
            } else if (/^(关键点|要点|[1-9]️⃣)/.test(line) || (/^[1-9][.、\s]/.test(line))) {
                if (!line.includes('分析')) {
                    const cleanedPoint = line.replace(/^(关键点[一二三]|要点|操盘|实战|[1-9]️⃣|[1-9][.、\s])[:：]?/, '').trim();
                    if (cleanedPoint) topLogicPoints.push(cleanedPoint);
                }
            } else if (!line.includes('结论') && !line.startsWith('•') && !line.startsWith('-')) {
                additionalDescription.push(line);
            }
        });

        const pillarConfig = [
            { key: '大结构分析', icon: '🏗️', color: 'var(--accent-red)' },
            { key: '均线结构分析', icon: '📈', color: 'var(--accent-blue)' },
            { key: '资金面分析', icon: '💰', color: '#fadb14' }
        ];

        const pillars = pillarConfig.map(config => {
            let contentLines: string[] = [];
            let startIndex = lines.findIndex(l => l.includes(config.key));
            if (startIndex !== -1) {
                for (let j = startIndex + 1; j < lines.length; j++) {
                    const line = lines[j];
                    if (pillarConfig.some(c => line.includes(c.key))) break;
                    if (line.includes('未来走势推演') || line.includes('未来趋势推演')) break;
                    contentLines.push(line);
                }
            }
            return startIndex !== -1 ? { ...config, content: contentLines } : null;
        }).filter((p): p is (typeof pillarConfig[0] & { content: string[] }) => p !== null);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. 核心综述卡片 */}
                <div
                    style={{
                        background: `linear-gradient(135deg, ${analysis?.signal === 'Buy' ? 'rgba(255, 69, 58, 0.08)' : analysis?.signal === 'Sell' ? 'rgba(50, 215, 75, 0.08)' : 'rgba(0, 122, 255, 0.08)'} 0%, var(--bg-card) 100%)`,
                        padding: '24px',
                        borderRadius: '20px',
                        border: `1px solid ${analysis?.signal === 'Buy' ? 'rgba(255, 69, 58, 0.2)' : analysis?.signal === 'Sell' ? 'rgba(50, 215, 75, 0.2)' : 'rgba(0, 122, 255, 0.2)'}`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
                        cursor: 'default'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                    }}
                >
                    {statusLine && (
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            {statusLine}
                        </div>
                    )}

                    {analysis?.structured_analysis?.inst_consensus && analysis.structured_analysis.inst_consensus !== "暂无近期机构评级数据" && (
                        <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--accent-red)',
                            background: 'rgba(255, 69, 58, 0.05)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            borderLeft: '4px solid var(--accent-red)',
                            marginTop: '4px'
                        }}>
                            🏦 机构视野：{analysis.structured_analysis.inst_consensus}
                        </div>
                    )}

                    {(topLogicPoints.length > 0 || additionalDescription.length > 0) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            {additionalDescription.slice(0, 1).map((desc, idx) => (
                                <div key={`desc-${idx}`} style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600', marginBottom: '4px' }}>
                                    💡 {desc}
                                </div>
                            ))}
                            {topLogicPoints.map((point, idx) => {
                                const isUnentered = point.includes('未进场') || point.includes('左侧客') || point.includes('【未进场】');
                                const isChase = point.includes('追涨') || point.includes('右侧客') || point.includes('【已进场】');
                                const isTrapped = point.includes('套牢') || point.includes('持股客') || point.includes('【已套牢】');

                                let icon = '•';
                                let textColor = 'var(--text-secondary)';
                                let bgColor = 'transparent';
                                let padding = '0';
                                let bRadius = '0';

                                if (isUnentered) { icon = '🛡️'; textColor = 'var(--accent-blue)'; bgColor = 'rgba(0,122,255,0.05)'; padding = '8px 12px'; bRadius = '8px'; }
                                if (isChase) { icon = '⚔️'; textColor = 'var(--accent-red)'; bgColor = 'rgba(255,69,58,0.05)'; padding = '8px 12px'; bRadius = '8px'; }
                                if (isTrapped) { icon = '🔒'; textColor = 'var(--accent-green)'; bgColor = 'rgba(50,215,75,0.05)'; padding = '8px 12px'; bRadius = '8px'; }

                                return (
                                    <div
                                        key={`point-${idx}`}
                                        style={{
                                            fontSize: '14px',
                                            lineHeight: '1.6',
                                            color: textColor,
                                            fontWeight: '600',
                                            display: 'flex',
                                            gap: '12px',
                                            background: bgColor,
                                            padding: padding,
                                            borderRadius: bRadius,
                                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                            cursor: 'default',
                                            border: '1px solid transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateX(8px) scale(1.01)';
                                            e.currentTarget.style.boxShadow = `0 8px 20px ${bgColor}`;
                                            e.currentTarget.style.borderColor = textColor.replace(')', ', 0.3)').replace('var(--', 'rgba(0, 122, 255');
                                            // 这里的 replace 是为了处理 var 变量，如果 var 不好处理，可以简化为简单的阴影
                                            e.currentTarget.style.borderColor = 'currentColor';
                                            e.currentTarget.style.opacity = '1';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateX(0) scale(1)';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.borderColor = 'transparent';
                                        }}
                                    >
                                        <span style={{
                                            color: textColor,
                                            minWidth: '20px',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>{icon}</span>
                                        <span style={{ flex: 1 }}>{point.trim()}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* B. 深度技术维度分析 (横排子卡) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                    {mainAnalysisTitle && (
                        <div style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            color: 'var(--text-secondary)',
                            paddingLeft: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            opacity: 0.6,
                            marginBottom: '2px'
                        }}>
                            {mainAnalysisTitle}
                        </div>
                    )}
                    {pillars.map((pillar) => (
                        <div
                            key={pillar.key}
                            style={{
                                padding: '16px 20px',
                                background: 'var(--bg-base)',
                                borderLeft: `5px solid ${pillar.color}`,
                                borderRadius: '14px',
                                border: '1px solid var(--border-color)',
                                borderLeftWidth: '5px',
                                transition: 'all 0.3s ease',
                                cursor: 'default'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.12)';
                                e.currentTarget.style.borderColor = pillar.color;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                            }}
                        >
                            <div style={{
                                fontSize: '13px',
                                fontWeight: '800',
                                color: pillar.color,
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>{pillar.icon}</span>
                                {pillar.key}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {pillar.content.map((text, idx) => {
                                    const isBullet = text.startsWith('•') || text.startsWith('-');
                                    const isConclusion = text.includes('结论');
                                    return (
                                        <div key={idx} style={{
                                            fontSize: isConclusion ? '14.5px' : '14px',
                                            lineHeight: '1.8',
                                            color: isConclusion ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: isConclusion ? '700' : '400',
                                            paddingLeft: isBullet ? '12px' : '0',
                                            marginTop: isConclusion ? '6px' : '0'
                                        }}>
                                            {text.replace(/^[1-3]️⃣\s*/, '')}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 4. 战术执行区间 (支撑/阻力) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div
                        style={{
                            background: 'rgba(50, 215, 75, 0.06)',
                            padding: '18px',
                            borderRadius: '16px',
                            border: '1px solid rgba(50, 215, 75, 0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                            e.currentTarget.style.background = 'rgba(50, 215, 75, 0.1)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(50, 215, 75, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.background = 'rgba(50, 215, 75, 0.06)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '700', marginBottom: '4px' }}>🛡️ 支撑防御区</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--accent-green)' }}>{structured_analysis.support_price || '--'}</div>
                    </div>
                    <div
                        style={{
                            background: 'rgba(255, 69, 58, 0.06)',
                            padding: '18px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 69, 58, 0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                            e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 69, 58, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.background = 'rgba(255, 69, 58, 0.06)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: '700', marginBottom: '4px' }}>⚡ 阻力预警区</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--accent-red)' }}>{structured_analysis.resistance_price || '--'}</div>
                    </div>
                </div>



                {/* 6. 未来走势推演 (高清路线图) */}
                {futureTrendStages.length > 0 && (
                    <div style={{
                        marginTop: '12px',
                        padding: '24px',
                        background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.05) 0%, var(--bg-card) 100%)',
                        border: '1px solid rgba(0, 122, 255, 0.15)',
                        borderRadius: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px',
                        transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 122, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(0, 122, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'rgba(0, 122, 255, 0.15)';
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span style={{ fontSize: '18px' }}>🧭</span> 趋势预判高清路线图
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {futureTrendStages.filter(s => s.match(/(短期|中期|长期)/)).map((stage, idx, arr) => {
                                const [title, ...detailParts] = stage.split(/[：:]/);
                                const detail = detailParts.join('：');
                                const isBlue = title.includes('🔵') || title.match(/(短期|中期|长期|1周|3个月|1年)/);

                                return (
                                    <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
                                            <div className="roadmap-step-number" style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '12px',
                                                background: 'var(--accent-blue)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                color: '#fff',
                                                zIndex: 2,
                                                boxShadow: `0 4px 10px rgba(0, 122, 255, 0.2)`
                                            }}>
                                                {idx + 1}
                                            </div>
                                            {idx < arr.length - 1 && (
                                                <div style={{ width: '2px', flex: 1, background: `linear-gradient(180deg, var(--accent-blue) 0%, var(--border-color) 100%)`, margin: '4px 0', opacity: 0.3 }}></div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: idx === arr.length - 1 ? '0' : '24px' }}>
                                            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--accent-blue)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(0, 122, 255, 0.1)',
                                                    fontSize: '11px',
                                                    fontWeight: '900',
                                                    border: '1px solid rgba(0, 122, 255, 0.2)'
                                                }}>
                                                    {title.includes('短期') ? 'Tactical' : title.includes('中期') ? 'Strategic' : 'Visionary'}
                                                </span>
                                                {title}
                                            </div>
                                            {detail && (
                                                <div className="roadmap-text-box" style={{
                                                    fontSize: '13.5px',
                                                    color: 'var(--text-secondary)',
                                                    lineHeight: '1.7',
                                                    background: 'var(--bg-base)',
                                                    padding: '16px 20px',
                                                    borderRadius: '16px',
                                                    border: '1px solid var(--border-color)',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                                }}>
                                                    {detail.trim().split(/[；;。]/).filter(t => t.trim()).map((p, i) => {
                                                        const text = p.trim();
                                                        const isLogic = text.includes('📌');
                                                        const isTarget = text.includes('🎯');

                                                        return (
                                                            <div key={i} style={{
                                                                marginBottom: i === detail.split(/[；;。]/).length - 1 ? 0 : '10px',
                                                                display: 'flex',
                                                                flexDirection: (isLogic || isTarget) ? 'column' : 'row',
                                                                gap: '8px',
                                                                padding: (isLogic || isTarget) ? '10px 14px' : '0',
                                                                background: isLogic ? 'rgba(50, 215, 75, 0.05)' : isTarget ? 'rgba(255, 159, 10, 0.05)' : 'transparent',
                                                                borderRadius: '10px',
                                                                borderLeft: isLogic ? '3px solid #32d74b' : isTarget ? '3px solid #ff9f0a' : 'none'
                                                            }}>
                                                                {!isLogic && !isTarget && <span style={{ opacity: 0.5, marginTop: '2px' }}>•</span>}
                                                                <span style={{
                                                                    fontWeight: (isLogic || isTarget) ? '700' : '400',
                                                                    color: isLogic ? '#32d74b' : isTarget ? '#ff9f0a' : 'inherit',
                                                                    fontSize: (isLogic || isTarget) ? '13px' : '13.5px'
                                                                }}>
                                                                    {text}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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
                    gap: '12px 48px',
                    fontSize: '14px',
                    borderLeft: '1px solid var(--border-color)',
                    paddingLeft: '48px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">成交量</span>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>
                            {quote && quote.成交量 > 0 ? (quote.成交量 / 1000000).toFixed(2) + '万手' : '---'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">成交额</span>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>
                            {quote && quote.成交额 > 0 ? (quote.成交额 / 100000000).toFixed(2) : '---'}亿元
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">总市值</span>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>
                            {quote && quote.总市值 > 0 ? quote.总市值 + '亿元' : '---'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">换手率</span>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>
                            {quote && quote.换手率 > 0 ? quote.换手率.toFixed(2) + '%' : '---'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">振幅</span>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>
                            {quote && quote.振幅 > 0 ? quote.振幅.toFixed(2) + '%' : '---'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">昨收盘</span>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>{quote?.昨收 || '---'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">今开盘</span>
                        <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>
                            {quote && quote.开盘 > 0 ? quote.开盘 : '---'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">最高价</span>
                        <span className="stock-up" style={{ fontWeight: '600', fontSize: '15px' }}>
                            {quote && quote.最高 > 0 ? quote.最高 : '---'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="secondary-text">最低价</span>
                        <span className="stock-down" style={{ fontWeight: '600', fontSize: '15px' }}>
                            {quote && quote.最低 > 0 ? quote.最低 : '---'}
                        </span>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '24px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                        {kline.length > 0 ? (
                            <KLineChart
                                data={klineData}
                                symbol={chartSymbol}
                                supportPrice={analysis?.structured_analysis?.support_price}
                                resistancePrice={analysis?.structured_analysis?.resistance_price}
                            />
                        ) : (
                            <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                <div className="loading-spinner" style={{ marginRight: '10px' }}></div>
                                加载行情数据中...
                            </div>
                        )}
                    </div>

                    <FundFlowTable data={fundFlow} loading={fundFlowLoading} />

                    <CapitalFlowHistory data={capitalFlowData} loading={capitalFlowLoading} />

                    <div className="card" style={{ padding: '32px', overflow: 'visible', borderTop: '4px solid var(--accent-green)' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>📊 指标综合监测</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {renderIndicatorCard(
                                "量比",
                                analysis?.indicators.vol_ratio ?? visualIndicators?.vol_ratio,
                                (analysis?.indicators.vol_ratio ?? visualIndicators?.vol_ratio) > 1.2 ? 'var(--accent-red)' : 'var(--text-primary)',
                                'vol_ratio',
                                'left'
                            )}
                            {renderIndicatorCard(
                                "24H 涨跌",
                                (analysis?.indicators.price_change ?? visualIndicators?.price_change) !== undefined ? `${analysis?.indicators.price_change ?? visualIndicators?.price_change}%` : '---',
                                (analysis?.indicators.price_change ?? visualIndicators?.price_change) >= 0 ? "stock-up" : "stock-down",
                                'price_change'
                            )}
                            {renderIndicatorCard(
                                "RSI (14)",
                                (analysis?.indicators.rsi ?? visualIndicators?.rsi) ?? '---',
                                (analysis?.indicators.rsi ?? visualIndicators?.rsi) > 70 ? 'var(--accent-red)' : ((analysis?.indicators.rsi ?? visualIndicators?.rsi) < 30 ? 'var(--accent-green)' : 'var(--text-primary)'),
                                'rsi',
                                'right'
                            )}

                            {renderIndicatorCard("市盈率 (PE)", analysis?.indicators.pe ?? visualIndicators?.pe, 'var(--text-primary)', 'pe', 'left')}
                            {renderIndicatorCard("市净率 (PB)", analysis?.indicators.pb ?? visualIndicators?.pb, 'var(--text-primary)', 'pb')}
                            {renderIndicatorCard("每股收益 (EPS)", analysis?.indicators.eps ?? visualIndicators?.eps, 'var(--text-primary)', 'eps')}
                            {renderIndicatorCard(
                                "净资产收益率 (ROE)",
                                (analysis?.indicators.roe ?? visualIndicators?.roe) !== undefined ? `${analysis?.indicators.roe ?? visualIndicators?.roe}%` : '---',
                                'var(--text-primary)',
                                'roe',
                                'right'
                            )}
                            {renderIndicatorCard(
                                "资产负债率",
                                (analysis?.indicators.debt_ratio ?? visualIndicators?.debt_ratio) !== undefined ? `${analysis?.indicators.debt_ratio ?? visualIndicators?.debt_ratio}%` : '---',
                                'var(--text-primary)',
                                'debt_ratio',
                                'left'
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '32px', borderTop: '4px solid #ed8936' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>📰</span>
                            重要新闻事件
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <style>{`
                                @keyframes spin { 100% { transform: rotate(360deg); } }
                                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
                                .interpretation-text {
                                    color: var(--text-primary);
                                    white-space: nowrap;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    display: block;
                                    flex: 1;
                                    min-width: 0;
                                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                                }
                                .interpretation-text:hover {
                                    white-space: normal;
                                    overflow: visible;
                                    font-size: 15px;
                                    font-weight: 700;
                                    color: var(--accent-blue);
                                    line-height: 1.6;
                                    word-break: break-all;
                                }
                            `}</style>
                            {isNewsLoading ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                                    <div className="news-loading-animation" style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: 'rgba(0,122,255,0.05)',
                                        padding: '12px 24px',
                                        borderRadius: '30px',
                                        border: '1px solid rgba(0,122,255,0.1)'
                                    }}>
                                        <div className="spinner" style={{
                                            width: '18px', height: '18px',
                                            border: '2px solid rgba(0,122,255,0.2)',
                                            borderTopColor: 'var(--accent-blue)',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            background: 'linear-gradient(90deg, var(--accent-blue), #8b5cf6)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            animation: 'pulse 2s infinite ease-in-out'
                                        }}>新闻事件正在加载分析中……</span>
                                    </div>
                                </div>
                            ) : news.length > 0 ? (
                                [...news].sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, 10).map((item, idx) => (
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
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.4', marginBottom: '8px' }}>
                                            {item.title}
                                        </div>
                                        {item.interpretation && (
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '8px', padding: '10px', background: 'var(--bg-card)', borderRadius: '6px', borderLeft: item.tag?.includes('利好') ? '3px solid #e53e3e' : item.tag?.includes('利空') ? '3px solid #38a169' : '3px solid #a0aec0', display: 'flex', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box' }}>
                                                <span style={{
                                                    flexShrink: 0,
                                                    display: 'inline-block',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    marginRight: '8px',
                                                    marginTop: '3px',
                                                    color: item.tag?.includes('利好') ? '#c53030' : item.tag?.includes('利空') ? '#2f855a' : 'var(--text-secondary)',
                                                    background: item.tag?.includes('利好') ? '#fed7d7' : item.tag?.includes('利空') ? '#c6f6d5' : 'var(--bg-body)'
                                                }}>
                                                    {item.tag || '中性'}
                                                </span>
                                                <span className="interpretation-text" title={item.interpretation}>
                                                    {item.interpretation}
                                                </span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifySelf: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span>{item.time}</span>
                                            </div>
                                            <span style={{ color: 'var(--accent-blue)', opacity: 0.8 }}>查看详情 →</span>
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    暂未在大数据池中监测到足以显著影响股价的重大新闻事件
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <PeerRadarChart data={peerRadarData} loading={peerRadarLoading} symbol={quote?.名称 || params.code} />

                    <div className="card" style={{ padding: '20px', borderTop: `4px solid ${analysis?.signal === 'Buy' ? 'var(--accent-red)' : analysis?.signal === 'Sell' ? 'var(--accent-green)' : 'var(--accent-blue)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>🚀</span>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>AI 智能分析报告</h3>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--accent-blue)', backgroundColor: 'rgba(0,122,255,0.08)', padding: '4px 12px', borderRadius: '20px', fontWeight: '700' }}>Deepseek实时分析</span>
                        </div>

                        {renderAnalysisSection()}

                        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', lineHeight: '1.8' }}>
                                * 本报告基于历史量价行为概率模型推断，不构成投资建议。股市具有高度不确定性，请决策前充分评估风险。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
