"use client";
import { useEffect, useState } from "react";

interface RecommendStock {
    name: string;
    code: string;
    reason: string;
    change?: number;
}

interface SectorData {
    name: string;
    change: number;
    leaders: string[];
    recommendations: RecommendStock[];
}

export default function SectorsPage() {
    const [sectors, setSectors] = useState<SectorData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSector, setExpandedSector] = useState<string | null>(null);

    // 获取板块列表
    useEffect(() => {
        const fetchSectors = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/market/sectors`);
                const data = await response.json();
                if (Array.isArray(data)) {
                    // 初始化板块数据，recommendations 先留空
                    const formattedSectors: SectorData[] = data.map(item => ({
                        name: item.name,
                        change: item.change,
                        leaders: item.leaders,
                        recommendations: []
                    }));
                    setSectors(formattedSectors);
                }
            } catch (error) {
                console.error("Failed to fetch sectors:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSectors();
        // 设置定时刷新 (5分钟)
        const timer = setInterval(fetchSectors, 300000);
        return () => clearInterval(timer);
    }, []);

    // 切换板块展开状态并按需加载成分股
    const toggleSector = async (name: string) => {
        if (expandedSector === name) {
            setExpandedSector(null);
            return;
        }

        setExpandedSector(name);

        // 检查是否已经加载过推荐股票
        const sector = sectors.find(s => s.name === name);
        if (sector && sector.recommendations.length === 0) {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/market/sector_stocks/${encodeURIComponent(name)}`);
                const stocks = await response.json();
                if (Array.isArray(stocks)) {
                    setSectors(prev => prev.map(s =>
                        s.name === name ? { ...s, recommendations: stocks } : s
                    ));
                }
            } catch (error) {
                console.error(`Failed to fetch stocks for sector ${name}:`, error);
            }
        }
    };

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '600' }}>📊 板块热点</h1>
                <p className="secondary-text" style={{ marginTop: '2px' }}>实时监测 A 股热门赛道资金动向</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="spinner-small" style={{ margin: '0 auto 12px' }}></div>
                    <p className="secondary-text">深度研读板块数据...</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {sectors.map((sector) => (
                            <div key={sector.name}
                                className={`sector-card ${expandedSector === sector.name ? 'active' : ''}`}
                                style={{ padding: 0, cursor: 'pointer' }}>
                                <div
                                    onClick={() => toggleSector(sector.name)}
                                    style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{sector.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <span
                                                className={sector.change >= 0 ? "stock-up" : "stock-down"}
                                                style={{ fontSize: '18px', fontWeight: '700' }}
                                            >
                                                {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
                                            </span>
                                            <span style={{
                                                fontSize: '12px',
                                                transform: expandedSector === sector.name ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.3s ease-in-out',
                                                color: 'var(--text-secondary)'
                                            }}>▼</span>
                                        </div>
                                    </div>
                                    <div className="secondary-text">
                                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>领涨表现：</span>
                                        {sector.leaders.join('、') || '正在计算...'}
                                    </div>
                                </div>

                                <div style={{
                                    maxHeight: expandedSector === sector.name ? '2500px' : '0',
                                    opacity: expandedSector === sector.name ? 1 : 0,
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: 'rgba(0,0,0,0.03)',
                                    borderTop: expandedSector === sector.name ? '1px solid var(--border-color)' : 'none',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '24px' }}>
                                        <h4 style={{
                                            color: 'var(--accent-blue)',
                                            fontSize: '14px',
                                            marginBottom: '20px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            🎯 AI 智能推荐池 (Top 21)
                                        </h4>
                                        {sector.recommendations.length > 0 ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                                {sector.recommendations.map((stock, idx) => (
                                                    <div key={idx} className="card" style={{
                                                        padding: '16px',
                                                        background: 'var(--bg-base)',
                                                        border: '1px solid var(--border-color)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                                                <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>{stock.name}</span>
                                                                <span className="secondary-text" style={{
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px'
                                                                }}>{stock.code}</span>
                                                            </div>
                                                            <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                                                                <span className="secondary-text">当前涨跌</span>
                                                                <span className={(stock.change || 0) >= 0 ? "stock-up" : "stock-down"} style={{
                                                                    marginLeft: '8px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)}%
                                                                </span>
                                                            </div>
                                                            <p className="secondary-text" style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '16px', textAlign: 'justify' }}>
                                                                {stock.reason}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.location.href = `/stock/${stock.code}`;
                                                            }}
                                                            className="btn-primary"
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px',
                                                                background: 'rgba(0, 122, 255, 0.1)',
                                                                color: 'var(--accent-blue)',
                                                                fontSize: '12px',
                                                                border: '1px solid rgba(0, 122, 255, 0.15)'
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.background = 'var(--accent-blue)';
                                                                e.currentTarget.style.color = 'white';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.background = 'rgba(0, 122, 255, 0.1)';
                                                                e.currentTarget.style.color = 'var(--accent-blue)';
                                                            }}
                                                        >
                                                            🚀 查看深度分析
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                                <div className="spinner-small" style={{ margin: '0 auto 12px' }}></div>
                                                <p className="secondary-text">正在精准匹配优质标的...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div style={{
                marginTop: '32px',
                padding: '20px',
                textAlign: 'center'
            }} className="secondary-text">
                💡 监控提示：板块数据每 5 分钟自动刷新
            </div>
        </div>
    );
}
