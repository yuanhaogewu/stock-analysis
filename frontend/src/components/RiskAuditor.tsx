"use client";
import React from 'react';

interface RiskAuditorProps {
    riskLabels: string[];
}

const RiskAuditor: React.FC<RiskAuditorProps> = ({ riskLabels }) => {
    const isHighRisk = riskLabels.some(l => l.includes('风险') || l.includes('亏损') || l.includes('高'));

    return (
        <div className="card" style={{
            padding: '24px',
            background: isHighRisk ? 'rgba(255, 69, 58, 0.03)' : 'var(--bg-card)',
            borderColor: isHighRisk ? 'rgba(255, 69, 58, 0.2)' : 'var(--border-color)',
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px' }}>🔍</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>散户风险探测器</h3>
                <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isHighRisk ? 'var(--accent-red)' : 'var(--accent-green)',
                    color: '#white',
                    fontWeight: '700',
                    marginLeft: 'auto'
                }}>
                    {isHighRisk ? '风险预警' : '监测正常'}
                </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {riskLabels.map((label, idx) => (
                    <div key={idx} style={{
                        padding: '8px 16px',
                        background: 'var(--bg-base)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        color: label.includes('明显风险') ? 'var(--text-secondary)' : 'var(--accent-red)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ color: label.includes('明显风险') ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {label.includes('明显风险') ? '✓' : '⚠'}
                        </span>
                        {label}
                    </div>
                ))}
            </div>

            <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                提示：风险探测器基于公开财务报表及实时热度推算。仅供参考，不作为投资建议。
            </p>
        </div>
    );
};

export default RiskAuditor;
