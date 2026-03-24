import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, AreaSeries, HistogramSeries, LineSeries, CandlestickSeries } from 'lightweight-charts';

function useChart(containerRef, options) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#2a3a4a',
        fontFamily: 'monospace',
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#334155', labelBackgroundColor: '#0e1118' },
        horzLine: { color: '#334155', labelBackgroundColor: '#0e1118' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.04)',
        textColor: '#2a3a4a',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.04)',
        textColor: '#2a3a4a',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: options.height || 200,
      ...options.chartOptions,
    });

    chartRef.current = chart;

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  return chartRef;
}

function toRgba(c, alpha) {
  if (c.startsWith('#')) {
    const hex = c.replace('#', '');
    const full = hex.length === 3
      ? hex.split('').map(x => x + x).join('')
      : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return c.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
}

export function AreaLWC({ data = [], color = '#22c55e', height = 200, gradientOpacity = 0.28 }) {
  const containerRef = useRef(null);
  const seriesRef = useRef(null);
  const chartRef = useChart(containerRef, { height });

  useEffect(() => {
    if (!chartRef.current) return;
    const series = chartRef.current.addSeries(AreaSeries, {
      lineColor: color,
      topColor: toRgba(color, gradientOpacity),
      bottomColor: toRgba(color, 0),
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    seriesRef.current = series;
    if (data.length) series.setData(data);
    chartRef.current.timeScale().fitContent();
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data.length) return;
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}

export function LineLWC({ series = [], height = 200 }) {
  const containerRef = useRef(null);
  const seriesRefs = useRef([]);
  const chartRef = useChart(containerRef, { height });

  useEffect(() => {
    if (!chartRef.current) return;
    seriesRefs.current = series.map(s => {
      const ls = chartRef.current.addSeries(LineSeries, {
        color: s.color,
        lineWidth: s.lineWidth ?? 2,
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      if (s.data?.length) ls.setData(s.data);
      return ls;
    });
    chartRef.current.timeScale().fitContent();
  }, []);

  useEffect(() => {
    if (!seriesRefs.current.length) return;
    seriesRefs.current.forEach((ls, i) => {
      if (series[i]?.data?.length) ls.setData(series[i].data);
    });
    chartRef.current?.timeScale().fitContent();
  }, [series]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}

export function HistogramLWC({ data = [], height = 200 }) {
  const containerRef = useRef(null);
  const buyRef = useRef(null);
  const sellRef = useRef(null);
  const chartRef = useChart(containerRef, { height });

  useEffect(() => {
    if (!chartRef.current) return;

    buyRef.current = chartRef.current.addSeries(HistogramSeries, {
      color: '#10b981',
      priceFormat: { type: 'volume' },
      priceScaleId: 'buy',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    sellRef.current = chartRef.current.addSeries(HistogramSeries, {
      color: '#ef4444',
      priceFormat: { type: 'volume' },
      priceScaleId: 'sell',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current.priceScale('sell').applyOptions({ visible: false });

    if (data.length) {
      buyRef.current.setData(data.map(d => ({ time: d.time, value: d.buy ?? 0 })));
      sellRef.current.setData(data.map(d => ({ time: d.time, value: d.sell ?? 0, color: '#ef4444' })));
    }
    chartRef.current.timeScale().fitContent();
  }, []);

  useEffect(() => {
    if (!buyRef.current || !data.length) return;
    buyRef.current.setData(data.map(d => ({ time: d.time, value: d.buy ?? 0 })));
    sellRef.current.setData(data.map(d => ({ time: d.time, value: d.sell ?? 0, color: '#ef4444' })));
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}

export function CandleLWC({ data = [], height = 300 }) {
  const containerRef = useRef(null);
  const seriesRef = useRef(null);
  const chartRef = useChart(containerRef, { height });

  useEffect(() => {
    if (!chartRef.current) return;
    seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    if (data.length) seriesRef.current.setData(data);
    chartRef.current.timeScale().fitContent();
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data.length) return;
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}