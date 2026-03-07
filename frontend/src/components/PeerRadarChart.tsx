"use client";
import React from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';

interface RadarData {
    industry: string;
    dimensions: Array<{ name: string; max: number }>;
    stock_data: number[];
    industry_data: number[];
}

interface PeerRadarProps {
    data: RadarData | null;
    loading: boolean;
    symbol: string;
}

export default function PeerRadarChart({ data, loading, symbol }: PeerRadarProps) {
    if (loading) {
        return (
            <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <div className="spinner-small" style={{ marginRight: '10px' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>正在生成同业打分雷达...</span>
            </div>
        );
    }

    if (!data || !data.dimensions || data.dimensions.length === 0) {
        return (
            <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-secondary)' }}>
                暂无同业核心横评数据
            </div>
        );
    }

    // 格式化为 Recharts 需要的数组对象形式
    const chartData = data.dimensions.map((dim, idx) => ({
        subject: dim.name,
        A: data.stock_data[idx] || 50,
        B: data.industry_data[idx] || 50,
        fullMark: dim.max || 100
    }));

    // 计算综合得分
    const totalScore = Math.round(data.stock_data.reduce((a, b) => a + b, 0) / data.stock_data.length);
    const scoreColor = totalScore >= 70 ? 'var(--accent-red)' : totalScore <= 40 ? 'var(--accent-green)' : 'var(--accent-blue)';

    return (
        <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '20px' }}>🎯</span>
                        同业核心横评 (打分雷达)
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        多维基本面及市场情绪对标评分，越趋近边缘越优秀
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>雷达综合分</div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: scoreColor, lineHeight: 1 }}>{totalScore}</div>
                </div>
            </div>

            <div style={{ height: '320px', width: '100%', position: 'relative', marginTop: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                        <PolarGrid stroke="var(--border-color)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}
                            formatter={(value: any, name: any) => [`${value} 分`, name]}
                        />
                        <Radar
                            name="标的画像"
                            dataKey="A"
                            stroke="var(--accent-blue)"
                            fill="var(--accent-blue)"
                            fillOpacity={0.3}
                        />
                        <Radar
                            name={`行业均值 (${data.industry})`}
                            dataKey="B"
                            stroke="var(--text-secondary)"
                            fill="transparent"
                            fillOpacity={0}
                            strokeDasharray="3 3"
                        />
                    </RadarChart>
                </ResponsiveContainer>

                {/* 装饰性光晕 */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '120px', height: '120px',
                    background: 'var(--accent-blue)',
                    filter: 'blur(60px)',
                    opacity: 0.15,
                    pointerEvents: 'none',
                    zIndex: 0
                }}></div>
            </div>

            {/* 注释文明 */}
            <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                borderTop: '1px dashed var(--border-color)',
                paddingTop: '12px',
                lineHeight: '1.6'
            }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>💡 注明：</span>
                <br />
                <span style={{ fontWeight: '500' }}>数据来源：</span>综合提取权威金融数据终端（东方财富、新浪财经等）最近30日财务及量价基本面数据。
                <br />
                <span style={{ fontWeight: '500' }}>评分逻辑：</span>由 AI 系统自动结合该标的各项特征偏离度与所属行业均值（基线）加权测算得出，满分为100分。
            </div>
        </div>
    );
}

