"use client";
import React, { useEffect, useRef } from 'react';
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

    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;

        const myChart = echarts.init(chartRef.current);

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
                { text: `${symbol} K线技术分析`, left: 'center', top: '0', textStyle: { color: '#e0e0e0', fontSize: 14, fontWeight: 'normal' } },
                { text: '成交量 (Volume)', left: '10', top: '58%', textStyle: { color: '#90a4ae', fontSize: 12, fontWeight: 'normal' } },
                { text: 'MACD 指标', left: '10', top: '78%', textStyle: { color: '#90a4ae', fontSize: 12, fontWeight: 'normal' } }
            ],
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                backgroundColor: '#141a23',
                borderColor: '#263238',
                borderWidth: 1,
                textStyle: { color: '#fff' },
                formatter: function (params: any) {
                    const dataIndex = params[0].dataIndex;
                    const item = data[dataIndex];
                    const prevItem = dataIndex > 0 ? data[dataIndex - 1] : null;
                    const change = prevItem ? (item.收盘 - prevItem.收盘) : 0;
                    const changePercent = prevItem ? (change / prevItem.收盘 * 100).toFixed(2) : '0.00';
                    const color = change >= 0 ? '#ff5252' : '#00c853';

                    let res = `<div style="padding: 8px; min-width: 150px;">
                        <div style="margin-bottom: 8px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 4px;">${item.日期}</div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #888;">开盘:</span> <span style="font-weight: bold;">${item.开盘.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #888;">最高:</span> <span style="font-weight: bold; color: #ff5252;">${item.最高.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #888;">最低:</span> <span style="font-weight: bold; color: #00c853;">${item.最低.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #888;">收盘:</span> <span style="font-weight: bold;">${item.收盘.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="color: #888;">涨跌幅:</span> <span style="font-weight: bold; color: ${color};">${change >= 0 ? '+' : ''}${changePercent}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #888;">成交量:</span> <span style="font-weight: bold;">${(item.成交量 / 10000).toFixed(2)}万</span>
                        </div>
                    </div>`;
                    return res;
                }
            },
            legend: {
                data: ['日K', 'MA5', 'MA10', 'MA20', 'MA60', 'MACD', 'DIFF', 'DEA'],
                inactiveColor: '#777',
                textStyle: { color: '#ccc' },
                bottom: 0,
                tooltip: { show: true }
            },
            axisPointer: { link: [{ xAxisIndex: 'all' }] },
            grid: [
                { left: '8%', right: '5%', top: '40', height: '48%' },
                { left: '8%', right: '5%', top: '63%', height: '14%' },
                { left: '8%', right: '5%', top: '82%', height: '12%' }
            ],
            xAxis: [
                { type: 'category', data: dates, boundaryGap: false, axisLine: { onZero: false }, splitLine: { show: false }, axisLabel: { color: '#888' }, gridIndex: 0 },
                { type: 'category', gridIndex: 1, data: dates, axisLabel: { show: false } },
                { type: 'category', gridIndex: 2, data: dates, axisLabel: { show: false } }
            ],
            yAxis: [
                { scale: true, splitArea: { show: true }, axisLabel: { color: '#888' }, splitLine: { lineStyle: { color: '#263238' } }, gridIndex: 0 },
                { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } },
                { scale: true, gridIndex: 2, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } }
            ],
            dataZoom: [
                { type: 'inside', xAxisIndex: [0, 1, 2], start: 70, end: 100 },
                { show: true, xAxisIndex: [0, 1, 2], type: 'slider', top: '95%', start: 70, end: 100, textStyle: { color: '#ccc' } }
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
                { name: 'MA5', type: 'line', data: calculateMA(5), smooth: true, lineStyle: { opacity: 0.8, color: '#fff' }, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none' },
                { name: 'MA10', type: 'line', data: calculateMA(10), smooth: true, lineStyle: { opacity: 0.8, color: '#ffea00' }, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none' },
                { name: 'MA20', type: 'line', data: calculateMA(20), smooth: true, lineStyle: { opacity: 0.8, color: '#ff4081' }, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none' },
                { name: 'MA60', type: 'line', data: calculateMA(60), smooth: true, lineStyle: { opacity: 0.8, color: '#00e5ff' }, xAxisIndex: 0, yAxisIndex: 0, symbol: 'none' },
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
                    name: 'MACD',
                    type: 'bar',
                    xAxisIndex: 2,
                    yAxisIndex: 2,
                    data: macdData.macd,
                    itemStyle: { color: (params: any) => params.data >= 0 ? '#ff5252' : '#00c853' }
                },
                { name: 'DIFF', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macdData.diff, lineStyle: { color: '#2962ff' }, symbol: 'none' },
                { name: 'DEA', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macdData.dea, lineStyle: { color: '#ffab00' }, symbol: 'none' }
            ]
        };

        myChart.setOption(option);

        const handleResize = () => myChart.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            myChart.dispose();
        };
    }, [data, symbol]);

    return (
        <div style={{ position: 'relative' }}>
            <div ref={chartRef} style={{ width: '100%', height: '600px' }} />
            <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#888',
                marginTop: '-20px',
                paddingBottom: '10px'
            }}>
                <span><i style={{ display: 'inline-block', width: '10px', height: '2px', background: '#fff', verticalAlign: 'middle', marginRight: '4px' }}></i>MA5</span>
                <span><i style={{ display: 'inline-block', width: '10px', height: '2px', background: '#ffea00', verticalAlign: 'middle', marginRight: '4px' }}></i>MA10</span>
                <span><i style={{ display: 'inline-block', width: '10px', height: '2px', background: '#ff4081', verticalAlign: 'middle', marginRight: '4px' }}></i>MA20</span>
                <span><i style={{ display: 'inline-block', width: '10px', height: '2px', background: '#00e5ff', verticalAlign: 'middle', marginRight: '4px' }}></i>MA60</span>
            </div>
        </div>
    );
};

export default KLineChart;
