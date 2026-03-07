"use client";
import React from 'react';

interface ValuationWaterlineProps {
    percentile: number;
}

const ValuationWaterline: React.FC<ValuationWaterlineProps> = ({ percentile }) => {
    const getLabel = (p: number) => {
        if (p < 20) return { text: '极度低估', color: '#32d74b' };
        if (p < 40) return { text: '估值偏低', color: '#66d1ff' };
        if (p < 60) return { text: '价值合理', color: '#007aff' };
        if (p < 80) return { text: '估值偏高', color: '#ff9f0a' };
        return { text: '泡沫预警', color: '#ff453a' };
    };

    const status = getLabel(percentile);

    return (
        <div className="card" style={{ padding: '24px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⚖️</span>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>估值水位线 (历史分位)</h3>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: status.color }}>
                    {status.text} {percentile}%
                </div>
            </div>

            <div style={{ position: 'relative', height: '12px', background: 'var(--border-color)', borderRadius: '6px', marginBottom: '30px' }}>
                {/* 背景渐变 */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: '6px',
                    background: 'linear-gradient(to right, #32d74b, #66d1ff, #007aff, #ff9f0a, #ff453a)',
                    opacity: 0.3
                }} />

                {/* 指针 */}
                <div style={{
                    position: 'absolute',
                    left: `${percentile}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '24px',
                    height: '24px',
                    background: 'white',
                    border: `4px solid ${status.color}`,
                    borderRadius: '50%',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                    zIndex: 2,
                    transition: 'left 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                <span>极度低估</span>
                <span>偏低</span>
                <span>合理</span>
                <span>偏高</span>
                <span>泡沫</span>
            </div>
        </div>
    );
};

export default ValuationWaterline;
