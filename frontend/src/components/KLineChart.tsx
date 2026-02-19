"use client";
import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface KLineData {
    日期: string;
    开盘: number;
    最高: number;
    最低: number;
    收盘: number;
    成交量: number;
}

interface Props {
    data: KLineData[];
    symbol: string;
}

const KLineChart: React.FC<Props> = ({ data, symbol }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const currentTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark';
        setTheme(currentTheme);

        const observer = new MutationObserver(() => {
            const updatedTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' || 'dark';
            setTheme(updatedTheme);
        });

        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;

        const myChart = echarts.init(chartRef.current);
        const isDark = theme === 'dark';
        const colors = {
            text: isDark ? '#ffffff' : '#1a1a1a',
            secondaryText: isDark ? '#b0bec5' : '#757575',
            line: isDark ? '#455a64' : '#e0e0e0',
            splitLine: isDark ? '#263238' : '#f0f0f0',
            tooltipBg: isDark ? 'rgba(20, 26, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            tooltipBorder: isDark ? '#37474f' : '#d1d1d1',
            tooltipText: isDark ? '#ffffff' : '#1a1a1a',
            tooltipLabel: isDark ? '#bbb' : '#666'
        };

        const volumes = data.map(item => item.成交量);
        const dates = data.map(item => item.日期);
        const values = data.map(item => [item.开盘, item.收盘, item.最低, item.最高]);

        // Calculate Moving Averages
        const calculateMA = (dayCount: number) => {
            const result = [];
            for (let i = 0, len = data.length; i < len; i++) {
                if (i < dayCount) {
                    result.push('-');
                    continue;
                }
                let sum = 0;
                for (let j = 0; j < dayCount; j++) {
                    sum += data[i - j].收盘;
                }
                result.push((sum / dayCount).toFixed(2));
            }
            return result;
        };

        // Simple MACD Calculation for display
        const calculateMACD = () => {
            const ema12: number[] = [];
            const ema26: number[] = [];
            const diff: number[] = [];
            const dea: number[] = [];
            const macd: number[] = [];

            let e12 = data[0].收盘;
            let e26 = data[0].收盘;

            data.forEach((item, i) => {
                e12 = e12 * 11 / 13 + item.收盘 * 2 / 13;
                e26 = e26 * 25 / 27 + item.收盘 * 2 / 27;
                ema12.push(e12);
                ema26.push(e26);
                const d = e12 - e26;
                diff.push(d);

                if (i === 0) {
                    dea.push(d);
                } else {
                    dea.push(dea[i - 1] * 8 / 10 + d * 2 / 10);
                }
                macd.push((diff[i] - dea[i]) * 2);
            });

            return { diff, dea, macd };
        };

        const macdData = calculateMACD();

        const option: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            title: [
                { text: `${symbol} K线技术分析`, left: 'center', top: '10', textStyle: { color: colors.text, fontSize: 18, fontWeight: 'bold' } },
                {
                    text: '{bar|} 成交量 (Volume)',
                    left: '2%',
                    top: '58%',
                    textStyle: {
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: 'bold',
                        rich: {
                            bar: {
                                width: 4,
                                height: 16,
                                backgroundColor: '#2962ff',
                                borderRadius: 2
                            }
                        }
                    }
                },
                {
                    text: '{bar|} MACD 指标',
                    left: '2%',
                    top: '80%',
                    textStyle: {
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: 'bold',
                        rich: {
                            bar: {
                                width: 4,
                                height: 16,
                                backgroundColor: '#2962ff',
                                borderRadius: 2
                            }
                        }
                    }
                }
            ],
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                backgroundColor: colors.tooltipBg,
                borderColor: colors.tooltipBorder,
                borderWidth: 1,
                textStyle: { color: colors.tooltipText },
                formatter: function (params: any) {
                    const dataIndex = params[0].dataIndex;
                    const item = data[dataIndex];
                    const prevItem = dataIndex > 0 ? data[dataIndex - 1] : null;
                    const change = prevItem ? (item.收盘 - prevItem.收盘) : 0;
                    const changePercent = prevItem ? (change / prevItem.收盘 * 100).toFixed(2) : '0.00';
                    const color = change >= 0 ? '#ff5252' : '#00c853';

                    let res = `<div style="padding: 8px; min-width: 150px;">
                        <div style="margin-bottom: 8px; font-weight: bold; border-bottom: 1px solid ${isDark ? '#444' : '#eee'}; padding-bottom: 4px; color: ${colors.tooltipText};">${item.日期}</div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: ${colors.tooltipLabel};">开盘:</span> <span style="font-weight: bold; color: ${colors.tooltipText};">${item.开盘.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: ${colors.tooltipLabel};">最高:</span> <span style="font-weight: bold; color: #ff5252;">${item.最高.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: ${colors.tooltipLabel};">最低:</span> <span style="font-weight: bold; color: #00c853;">${item.最低.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: ${colors.tooltipLabel};">收盘:</span> <span style="font-weight: bold; color: ${colors.tooltipText};">${item.收盘.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: ${colors.tooltipLabel};">涨跌幅:</span> <span style="font-weight: bold; color: ${color};">${change >= 0 ? '+' : ''}${changePercent}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: ${colors.tooltipLabel};">成交量:</span> <span style="font-weight: bold; color: ${colors.tooltipText};">${(item.成交量 / 10000).toFixed(2)}万</span>
                        </div>
                    </div>`;
                    return res;
                }
            },
            legend: {
                data: ['日K', 'MA5', 'MA10', 'MA20', 'MA60', 'MACD', 'DIFF', 'DEA'],
                inactiveColor: isDark ? '#555' : '#ccc',
                textStyle: { color: colors.text, fontSize: 12 },
                top: '35',
                tooltip: { show: true }
            },
            axisPointer: { link: [{ xAxisIndex: 'all' }] },
            grid: [
                { left: '8%', right: '5%', top: '50', height: '45%' },
                { left: '8%', right: '5%', top: '65%', height: '12%' },
                { left: '8%', right: '5%', top: '85%', height: '10%' }
            ],
            xAxis: [
                { type: 'category', data: dates, boundaryGap: false, axisLine: { onZero: false, lineStyle: { color: colors.line } }, splitLine: { show: false }, axisLabel: { color: colors.secondaryText }, gridIndex: 0 },
                { type: 'category', gridIndex: 1, data: dates, axisLabel: { show: false }, axisLine: { lineStyle: { color: colors.line } } },
                { type: 'category', gridIndex: 2, data: dates, axisLabel: { show: false }, axisLine: { lineStyle: { color: colors.line } } }
            ],
            yAxis: [
                { scale: true, splitArea: { show: isDark }, axisLabel: { color: colors.secondaryText }, splitLine: { lineStyle: { color: colors.splitLine } }, gridIndex: 0 },
                { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } },
                { scale: true, gridIndex: 2, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } }
            ],
            dataZoom: [
                { type: 'inside', xAxisIndex: [0, 1, 2], start: 70, end: 100 },
                { show: true, xAxisIndex: [0, 1, 2], type: 'slider', top: '95%', start: 70, end: 100, textStyle: { color: colors.secondaryText } }
            ],
            series: [
                {
                    name: '日K',
                    type: 'candlestick',
                    data: values,
                    itemStyle: {
                        color: '#ff5252',
                        color0: '#00c853',
                        borderColor: '#ff5252',
                        borderColor0: '#00c853'
                    },
                    xAxisIndex: 0,
                    yAxisIndex: 0
                },
                { name: 'MA5', type: 'line', data: calculateMA(5), smooth: true, itemStyle: { color: isDark ? '#fff' : '#1a1a1a' }, lineStyle: { opacity: 0.8 }, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none' },
                { name: 'MA10', type: 'line', data: calculateMA(10), smooth: true, itemStyle: { color: '#ffea00' }, lineStyle: { opacity: 0.8 }, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none' },
                { name: 'MA20', type: 'line', data: calculateMA(20), smooth: true, itemStyle: { color: '#ff4081' }, lineStyle: { opacity: 0.8 }, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none' },
                { name: 'MA60', type: 'line', data: calculateMA(60), smooth: true, itemStyle: { color: '#00e5ff' }, lineStyle: { opacity: 0.8 }, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none' },
                {
                    name: '成交量',
                    type: 'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: volumes,
                    itemStyle: {
                        color: (params: any) => data[params.dataIndex].收盘 >= data[params.dataIndex].开盘 ? '#ff5252' : '#00c853'
                    }
                },
                {
                    name: 'MACP', // Corrected name for MACD bar series to avoid legend conflict if needed, though legend item is 'MACD'
                    type: 'bar',
                    xAxisIndex: 2,
                    yAxisIndex: 2,
                    data: macdData.macd,
                    itemStyle: { color: (params: any) => params.data >= 0 ? '#ff5252' : '#00c853' }
                },
                { name: 'DIFF', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macdData.diff, itemStyle: { color: '#2962ff' }, symbol: 'none', lineStyle: { width: 1.5 } },
                { name: 'DEA', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macdData.dea, itemStyle: { color: '#ffab00' }, symbol: 'none', lineStyle: { width: 1.5 } }
            ]
        };

        myChart.setOption(option);

        // Resize handler
        const handleResize = () => myChart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            myChart.dispose();
        };
    }, [data, symbol, theme]);

    return (
        <div style={{ position: 'relative' }}>
            <div ref={chartRef} style={{ width: '100%', height: '600px' }} />
        </div>
    );
};

export default KLineChart;
