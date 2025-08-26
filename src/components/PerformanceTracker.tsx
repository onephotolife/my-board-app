'use client';

import { useEffect } from 'react';

/**
 * パフォーマンス監視専用コンポーネント
 * HTML要素に属性を追加せず、window オブジェクトを使用
 * Hydration Mismatchエラーを回避
 */
export function PerformanceTracker() {
  useEffect(() => {
    // SSR環境では実行しない
    if (typeof window === 'undefined') {
      return;
    }

    // パフォーマンスデータをwindowオブジェクトに保存
    const recordPerformance = () => {
      const perfData = {
        loaded: true,
        time: performance.now(),
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown'
      };

      // グローバル変数に設定（E2Eテスト互換性のため）
      (window as any).__PERF_DATA__ = perfData;
      (window as any).__APP_READY__ = true;
      (window as any).__APP_READY_TIME__ = perfData.time;

      // カスタムイベント発火（既存のリスナー互換性のため）
      window.dispatchEvent(new CustomEvent('app-ready', {
        detail: perfData
      }));

      // コンソールログ（デバッグ用）
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 App ready in ${perfData.time.toFixed(2)}ms`);
      }

      // パフォーマンスメトリクス収集
      if ('performance' in window && 'mark' in performance) {
        performance.mark('app-ready');
        
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationTiming) {
          const safeRound = (value: number): number => {
            if (isNaN(value) || value < 0) return 0;
            return Math.round(value);
          };

          const metrics = {
            dns: safeRound(navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart),
            tcp: safeRound(navigationTiming.connectEnd - navigationTiming.connectStart),
            tls: navigationTiming.secureConnectionStart > 0 ? 
                 safeRound(navigationTiming.connectEnd - navigationTiming.secureConnectionStart) : 0,
            ttfb: safeRound(navigationTiming.responseStart - navigationTiming.requestStart),
            contentLoad: navigationTiming.loadEventEnd > 0 && navigationTiming.responseStart > 0 ?
                         safeRound(navigationTiming.loadEventEnd - navigationTiming.responseStart) : 0,
            domComplete: navigationTiming.domComplete > 0 && navigationTiming.navigationStart > 0 ?
                         safeRound(navigationTiming.domComplete - navigationTiming.navigationStart) : 0,
            appReady: safeRound(perfData.time)
          };

          // メトリクスイベント送信
          window.dispatchEvent(new CustomEvent('app-performance-metrics', {
            detail: metrics
          }));

          if (process.env.NODE_ENV === 'development') {
            console.table(metrics);
          }

          // パフォーマンスAPIへの送信（既存機能の互換性）
          sendPerformanceData(metrics, perfData);
        }
      }
    };

    // DOM読み込み完了後に実行
    if (document.readyState === 'complete') {
      recordPerformance();
    } else {
      window.addEventListener('load', recordPerformance, { once: true });
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('load', recordPerformance);
    };
  }, []);

  // パフォーマンスデータ送信（既存のAPIとの互換性維持）
  const sendPerformanceData = async (metrics: any, perfData: any) => {
    try {
      const performanceData = {
        url: window.location.href,
        userAgent: perfData.userAgent,
        metrics,
        viewport: {
          width: perfData.viewportWidth,
          height: perfData.viewportHeight,
        },
        connection: {
          effectiveType: perfData.connectionType,
          downlink: (navigator as any).connection?.downlink,
          rtt: (navigator as any).connection?.rtt,
        },
        timestamp: perfData.timestamp,
      };

      // 非同期でパフォーマンスAPIに送信
      fetch('/api/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(performanceData),
      }).then(response => {
        if (process.env.NODE_ENV === 'development') {
          if (response.ok) {
            console.log('📊 Performance data sent successfully');
          } else {
            console.warn('⚠️ Failed to send performance data:', response.status);
          }
        }
      }).catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Performance data sending error:', error);
        }
      });

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Error preparing performance data:', error);
      }
    }
  };

  // このコンポーネントは視覚的な要素を持たない
  return null;
}