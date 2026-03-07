"use client";
import { useEffect, useState, useMemo } from "react";
import KLineChart from "@/components/KLineChart";
import FundFlowTable from "@/components/FundFlowTable";
import RiskAuditor from "@/components/RiskAuditor";
import ValuationWaterline from "@/components/ValuationWaterline";

export default function RetailLabPage({ params }: { params: { code: string } }) {
    const [quote, setQuote] = useState<any>(null);
    const [indicators, setIndicators] = useState<any>(null);
    const [kline, setKline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [qRes, iRes, kRes] = await Promise.all([
                    fetch(`http://localhost:8000/api/stock/quote/${params.code}`),
                    fetch(`http://localhost:8000/api/stock/visual_indicators/${params.code}`),
                    fetch(`http://localhost:8000/api/stock/kline/${params.code}`)
                ]);
                if (qRes.ok) setQuote(await qRes.json());
                if (iRes.ok) setIndicators(await iRes.json());
                if (kRes.ok) setKline(await kRes.json());
            } catch (e) {
                console.error("Fetch error", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [params.code]);

    if (loading) return <div style={{ padding: '40px', color: 'white' }}>正在实验室中加载数据...</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '900' }}>{quote?.名称 || params.code} <span style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>零售增强实验室</span></h1>
                <div style={{ padding: '4px 12px', background: 'var(--accent-blue)', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>TESTING VERSION</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                {/* 左侧主栏 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* 1. 估值水位线 (新) */}
                    <ValuationWaterline percentile={indicators?.valuation_percentile || 50} />

                    {/* 2. K线图 */}
                    <div className="card" style={{ padding: '24px', borderRadius: '20px' }}>
                        <KLineChart data={kline} symbol={quote?.名称 || params.code} />
                    </div>

                    {/* 3. 筹码与意愿 (新，整合在主栏下方) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="card" style={{ padding: '24px', borderRadius: '20px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>短线博弈热度</div>
                            <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--accent-blue)' }}>{indicators?.sentiment_score || 0}</div>
                            <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
                                <div style={{ width: `${indicators?.sentiment_score || 0}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 1.5s ease' }} />
                            </div>
                        </div>
                        <div className="card" style={{ padding: '24px', borderRadius: '20px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>筹码意愿强度</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '4px' }}>{indicators?.chip_status || '计算中...'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--accent-green)', marginTop: '10px' }}>● 资金正在寻机入场</div>
                        </div>
                    </div>
                </div>

                {/* 右侧边栏 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* 4. 风险探测器 (新) */}
                    <RiskAuditor riskLabels={indicators?.risk_labels || ["暂无数据"]} />

                    {/* 5. 实时行情与原本组件 */}
                    <div className="card" style={{ padding: '20px', borderRadius: '20px' }}>
                        <h4 style={{ marginBottom: '16px', fontSize: '14px' }}>实时概览</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>最新价</div>
                                <div style={{ fontSize: '20px', fontWeight: '800' }}>{quote?.最新价}</div>
                            </div>
                            <div style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>涨跌幅</div>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: quote?.涨跌幅 >= 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                    {quote?.涨跌幅}%
                                </div>
                            </div>
                        </div>
                    </div>

                    <FundFlowTable code={params.code} />
                </div>
            </div>
        </div>
    );
}
