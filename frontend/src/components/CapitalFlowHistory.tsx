"use client";
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

interface FundFlowItem {
    date: string;
    main_net_inflow: number;
    main_net_pct: number;
    super_net_inflow: number;
    super_net_pct: number;
    large_net_inflow: number;
    large_net_pct: number;
}

interface CapitalFlowProps {
    data: FundFlowItem[];
    loading: boolean;
}

export default function CapitalFlowHistory({ data, loading }: CapitalFlowProps) {
    if (loading) {
        return (
            <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <div className="spinner-small" style={{ marginRight: '10px' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>正在加载历史资金流向分布...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-secondary)' }}>
                暂无历史资金流向数据
            </div>
        );
    }

    // 处理数据，使图表更美观
    // 取近10天数据
    const chartData = [...data].slice(-10).map(item => ({
        ...item,
        // 将数字转换成万元为单位，保留两位小数
        main_net_inflow_w: Number((item.main_net_inflow / 10000).toFixed(2)),
        // 格式化日期，只显示月-日
        shortDate: item.date.substring(5)
    }));

    // 计算流入流出的总额来提供汇总分析
    const totalInflow = chartData.reduce((acc, curr) => acc + curr.main_net_inflow_w, 0);
    const positiveDays = chartData.filter(d => d.main_net_inflow_w > 0).length;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const val = payload[0].value;
            const isPositive = val >= 0;
            return (
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>{label}</p>
                    <p style={{ margin: 0, color: isPositive ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: '600' }}>
                        主力净流入: {val > 0 ? '+' : ''}{val} 万元
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card" style={{ padding: '24px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🌊</span>
                    近10日主力资金流向
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    近10日主力共计净流入: <span style={{
                        fontWeight: '700',
                        color: totalInflow >= 0 ? 'var(--accent-red)' : 'var(--accent-green)'
                    }}>{totalInflow > 0 ? '+' : ''}{totalInflow.toFixed(2)} 万元</span>
                    <span style={{ marginLeft: '12px', background: 'var(--bg-base)', padding: '4px 8px', borderRadius: '4px' }}>
                        流入: <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>{positiveDays}天</span> /
                        流出: <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{10 - positiveDays}天</span>
                    </span>
                </div>
            </div>

            <div style={{ width: '100%', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="shortDate"
                            axisLine={true}
                            tickLine={false}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            tickFormatter={(value) => `${value}`}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                            width={60}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Bar dataKey="main_net_inflow_w" radius={[4, 4, 0, 0]}>
                            {
                                chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.main_net_inflow_w >= 0 ? 'var(--accent-red)' : 'var(--accent-green)'} opacity={0.8} />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

