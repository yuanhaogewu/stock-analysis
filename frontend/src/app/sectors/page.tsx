"use client";
import { useEffect, useState } from "react";

interface SectorData {
    name: string;
    change: number;
    leaders: string[];
}

export default function SectorsPage() {
    const [sectors, setSectors] = useState<SectorData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 模拟板块数据
        const mockSectors: SectorData[] = [
            { name: "半导体", change: 3.45, leaders: ["北方华创", "中微公司", "长电科技"] },
            { name: "新能源汽车", change: 2.18, leaders: ["比亚迪", "宁德时代", "赣锋锂业"] },
            { name: "人工智能", change: 1.92, leaders: ["科大讯飞", "海康威视", "商汤科技"] },
            { name: "医药生物", change: -0.85, leaders: ["恒瑞医药", "迈瑞医疗", "药明康德"] },
            { name: "白酒", change: -1.23, leaders: ["贵州茅台", "五粮液", "泸州老窖"] },
        ];

        setTimeout(() => {
            setSectors(mockSectors);
            setLoading(false);
        }, 500);
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>📊 板块热点</h1>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                    加载中...
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {sectors.map((sector) => (
                        <div key={sector.name} className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', margin: 0 }}>{sector.name}</h3>
                                <span
                                    className={sector.change >= 0 ? "stock-up" : "stock-down"}
                                    style={{ fontSize: '20px', fontWeight: 'bold' }}
                                >
                                    {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
                                </span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                <strong>领涨个股：</strong>
                                {sector.leaders.join('、')}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="card" style={{ marginTop: '24px', padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                💡 提示：板块数据每5分钟更新一次
            </div>
        </div>
    );
}
