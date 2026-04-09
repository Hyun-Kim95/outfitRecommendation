import { useTheme } from '@/context/ThemeContext';
import { useEffect, useMemo, useState } from 'react';

function readCssVarBackground(varName: string): string {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:-9999px;visibility:hidden;';
  el.style.setProperty('background-color', `var(${varName})`);
  document.body.appendChild(el);
  const v = getComputedStyle(el).backgroundColor;
  document.body.removeChild(el);
  return v || 'rgb(128, 128, 128)';
}

function readCssVarColor(varName: string): string {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:-9999px;visibility:hidden;color:var(${varName})`;
  document.body.appendChild(el);
  const v = getComputedStyle(el).color;
  document.body.removeChild(el);
  return v || 'rgb(148, 163, 184)';
}

/** rgb/rgba 문자열만 알파 블렌드 (그 외는 원문 유지) */
function withAlpha(rgbLike: string, alpha: number): string {
  const m = rgbLike.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!m) return rgbLike;
  return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
}

export type AdminChartPalette = {
  barFill: string;
  barBorder: string;
  doughnut: string[];
  doughnutBorder: string;
  gridColor: string;
  tickColor: string;
  legendColor: string;
};

/** html `dark` 클래스·테마 전환 후 Chart.js에 맞는 색 */
export function useAdminChartPalette(): AdminChartPalette {
  const { resolvedDark } = useTheme();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const mo = new MutationObserver(() => setTick((n) => n + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    setTick((n) => n + 1);
  }, [resolvedDark]);

  return useMemo(() => {
    const primary = readCssVarBackground('--primary');
    const border = readCssVarBackground('--border');
    const charts = [1, 2, 3, 4].map((i) => readCssVarBackground(`--chart-${i}`));
    const muted = readCssVarColor('--muted-foreground');
    const barFill = withAlpha(primary, resolvedDark ? 0.5 : 0.38);
    const barBorder = withAlpha(border, resolvedDark ? 0.72 : 0.8);
    return {
      barFill,
      barBorder,
      doughnut: charts,
      doughnutBorder: withAlpha(border, resolvedDark ? 0.55 : 0.42),
      gridColor: resolvedDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(100, 116, 139, 0.26)',
      tickColor: muted,
      legendColor: muted,
    };
  }, [tick, resolvedDark]);
}
