// src/components/CandleChart.js

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { FinancialController, CandlestickElement, CategoryScale, LinearScale } from 'chart.js/auto';

// Register required components
Chart.register(FinancialController, CandlestickElement, CategoryScale, LinearScale, ...registerables);

const CandleChart = () => {
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    const candleChart = new Chart(ctx, {
      type: 'candlestick', // Built-in chart type in Chart.js v3+
      data: {
        datasets: [
          {
            label: 'Candle Data',
            data: [
              // Example candlestick data
              { t: '2025-01-20', o: 100, h: 110, l: 90, c: 105 },
              { t: '2025-01-21', o: 105, h: 115, l: 95, c: 100 },
              { t: '2025-01-22', o: 100, h: 120, l: 90, c: 110 },
            ],
          },
        ],
      },
      options: {
        scales: {
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Date',
            },
          },
          y: {
            type: 'linear',
            title: {
              display: true,
              text: 'Price',
            },
          },
        },
      },
    });

    return () => {
      candleChart.destroy(); // Clean up on unmount
    };
  }, []);

  return <canvas ref={chartRef} />;
};

export default CandleChart;
