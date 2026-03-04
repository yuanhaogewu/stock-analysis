import React from 'react';

interface FundFlowItem {
    type: string;
    net_amount: number;
    net_pct: number;
}

interface FundFlowData {
    date: string;
    items: FundFlowItem[];
    main_force: {
        net_amount: number;
        net_pct: number;
    };
}

interface Props {
    data: FundFlowData | null;
    loading: boolean;
}

const FundFlowTable: React.FC<Props> = ({ data, loading }) => {
    const [animate, setAnimate] = React.useState(false);

    React.useEffect(() => {
        if (!loading && data) {
            const timer = setTimeout(() => setAnimate(true), 100);
            return () => clearTimeout(timer);
        }
    }, [loading, data]);

    if (loading) {
        return (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ width: '150px', height: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }} className="skeleton" />
                <div style={{ width: '100%', height: '120px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }} className="skeleton" />
            </div>
        );
    }

    if (!data || !data.items || data.items.length === 0) {
        return (
            <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                暂未监测到当日详细资金流向数据
            </div>
        );
    }

    const formatAmount = (amount: number) => {
        const absAmount = Math.abs(amount);
        if (absAmount >= 100000000) {
            return (amount / 100000000).toFixed(2) + ' 亿';
        } else if (absAmount >= 10000) {
            return (amount / 10000).toFixed(2) + ' 万';
        }
        return amount.toFixed(2) + ' 元';
    };

    return (
        <div
            className="card"
            style={{
                padding: '20px',
                opacity: animate ? 1 : 0,
                transform: animate ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes bar-shine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(41, 98, 255, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(41, 98, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(41, 98, 255, 0); }
                }
                .flow-row:hover {
                    background: var(--bg-secondary) !important;
                    transform: translateX(4px);
                }
                .flow-row {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                .bar-container:hover .bar-shine {
                    animation: bar-shine 1s infinite linear;
                }
            `}} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px', filter: animate ? 'drop-shadow(0 0 8px rgba(255,215,0,0.4))' : 'none', transition: 'filter 1s' }}>💰</span>
                    资金流向分布
                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '4px' }}>({data.date})</span>
                </h3>
                <div style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    backgroundColor: data.main_force.net_amount >= 0 ? 'rgba(255, 82, 82, 0.1)' : 'rgba(0, 200, 83, 0.1)',
                    border: `1px solid ${data.main_force.net_amount >= 0 ? 'rgba(255, 82, 82, 0.2)' : 'rgba(0, 200, 83, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    animation: Math.abs(data.main_force.net_pct) > 10 ? 'pulse-glow 2s infinite' : 'none'
                }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>主力净流入</span>
                    <span style={{ fontSize: '16px', color: data.main_force.net_amount >= 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: '900' }}>
                        {data.main_force.net_amount >= 0 ? '+' : ''}{formatAmount(data.main_force.net_amount)}
                    </span>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '8px 4px', color: 'var(--text-secondary)', fontWeight: '600' }}>单型类型</th>
                            <th style={{ padding: '8px 4px', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>净流入额</th>
                            <th style={{ padding: '8px 4px', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>净占比</th>
                            <th style={{ padding: '8px 4px', color: 'var(--text-secondary)', fontWeight: '600', width: '35%', textAlign: 'center' }}>多空博弈可视化</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, index) => (
                            <tr key={index} className="flow-row" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                                <td style={{ padding: '12px 12px', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: index < 2 ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                            opacity: 0.8,
                                            boxShadow: index < 2 ? '0 0 8px var(--accent-blue)' : 'none'
                                        }} />
                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.type}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 4px', textAlign: 'right', color: item.net_amount >= 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: '800' }}>
                                    <span style={{ transition: 'all 0.3s', transform: animate ? 'scale(1)' : 'scale(0.8)', display: 'inline-block' }}>
                                        {item.net_amount >= 0 ? '+' : ''}{formatAmount(item.net_amount)}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 4px', textAlign: 'right', color: item.net_amount >= 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: '600' }}>
                                    {item.net_pct >= 0 ? '+' : ''}{item.net_pct}%
                                </td>
                                <td style={{ padding: '12px 12px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                                    <div className="bar-container" style={{ width: '100%', height: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <div style={{ position: 'absolute', left: '0', right: '0', top: '50%', height: '1px', backgroundColor: 'var(--border-color)', zIndex: 1 }} />

                                        <div style={{
                                            position: 'absolute',
                                            left: '50%',
                                            width: animate ? `${Math.min(Math.abs(item.net_pct) * 2, 50)}%` : '0%',
                                            height: '100%',
                                            backgroundColor: item.net_pct >= 0 ? 'var(--accent-red)' : 'var(--accent-green)',
                                            transform: item.net_pct >= 0 ? 'translateX(0)' : 'translateX(-100%)',
                                            borderRadius: '2px',
                                            zIndex: 2,
                                            boxShadow: `0 0 15px ${item.net_pct >= 0 ? 'rgba(255, 82, 82, 0.4)' : 'rgba(0, 200, 83, 0.4)'}`,
                                            transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }}>
                                            <div className="bar-shine" style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                                zIndex: 3
                                            }} />
                                        </div>

                                        <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '0', width: '2px', backgroundColor: 'var(--text-primary)', opacity: 0.15, zIndex: 4 }} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                border: '1px solid var(--border-color)',
                opacity: animate ? 1 : 0,
                transition: 'opacity 0.6s 0.3s'
            }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>💡 资金申明：</div>
                • <b>主力资金</b> = 超大单 (&gt;100万) + 大单 (20-100万)；成交额越大，对股价波动影响力越强。<br />
                • <b>中单</b> (4-20万)，<b>小单</b> (&lt;4万) 通常代表散户投资者。<br />
                • 净流入为正（红色）通常视为利好，说明买盘比卖盘活跃。
            </div>
        </div>
    );
};

export default FundFlowTable;
