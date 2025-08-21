'use client';

import { useEffect } from 'react';

/**
 * アプリケーション読み込み完了通知コンポーネント
 * テストツール・SEO・パフォーマンス監視向け
 */
export function AppReadyNotifier() {
  useEffect(() => {
    // DOM読み込み完了を待つ
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', notifyAppReady);
    } else {
      // 既に読み込み済みの場合は即座に通知
      notifyAppReady();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', notifyAppReady);
    };
  }, []);

  const notifyAppReady = () => {
    const readyTime = performance.now();
    
    // 1. カスタムイベント発火（テストツール向け）
    window.dispatchEvent(new CustomEvent('app-ready', {
      detail: {
        timestamp: Date.now(),
        performanceTime: readyTime,
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown'
      }
    }));

    // 2. グローバル変数設定（E2Eテスト向け）
    (window as any).__APP_READY__ = true;
    (window as any).__APP_READY_TIME__ = readyTime;

    // 3. HTML属性設定（Selenium/Playwright向け）
    document.documentElement.setAttribute('data-app-ready', 'true');
    document.documentElement.setAttribute('data-ready-time', readyTime.toString());

    // 4. コンソールログ（デバッグ用）
    console.log(`🚀 App ready in ${readyTime.toFixed(2)}ms`);

    // 5. パフォーマンス計測とデータ送信
    if ('performance' in window && 'mark' in performance) {
      performance.mark('app-ready');
      
      // Navigation Timing API を使用してメトリクス収集
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        // 安全な値の取得（負の値やNaNを防ぐ）
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
          appReady: safeRound(readyTime)
        };

        // カスタムイベントでメトリクスを送信
        window.dispatchEvent(new CustomEvent('app-performance-metrics', {
          detail: metrics
        }));

        console.table(metrics);

        // パフォーマンス監視APIにデータ送信
        sendPerformanceData(metrics);
      }
    }

    // 6. SEO向けの構造化データ更新
    updateStructuredData();

    // 7. Accessibility向けの通知
    announceToScreenReaders();
  };

  const updateStructuredData = () => {
    // 既存の構造化データをチェック
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "会員制掲示板",
      "description": "会員限定の掲示板システム",
      "url": window.location.origin,
      "applicationCategory": "SocialNetworkingApplication",
      "operatingSystem": "Web Browser",
      "browserRequirements": "Requires JavaScript",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "JPY"
      },
      "publisher": {
        "@type": "Organization",
        "name": "会員制掲示板"
      }
    };

    structuredDataScript.textContent = JSON.stringify(structuredData);
  };

  const announceToScreenReaders = () => {
    // スクリーンリーダー向けの読み込み完了通知
    const srAnnouncement = document.createElement('div');
    srAnnouncement.setAttribute('aria-live', 'polite');
    srAnnouncement.setAttribute('aria-atomic', 'true');
    srAnnouncement.className = 'sr-only';
    srAnnouncement.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    srAnnouncement.textContent = 'ページの読み込みが完了しました';
    
    document.body.appendChild(srAnnouncement);
    
    // 5秒後に削除
    setTimeout(() => {
      if (srAnnouncement.parentNode) {
        srAnnouncement.parentNode.removeChild(srAnnouncement);
      }
    }, 5000);
  };

  // パフォーマンスデータ送信関数
  const sendPerformanceData = async (metrics: any) => {
    try {
      const performanceData = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        metrics,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: {
          effectiveType: (navigator as any).connection?.effectiveType,
          downlink: (navigator as any).connection?.downlink,
          rtt: (navigator as any).connection?.rtt,
        },
        timestamp: Date.now(),
      };

      // 非同期でパフォーマンスAPIに送信（エラーがあってもアプリをブロックしない）
      fetch('/api/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(performanceData),
      }).then(response => {
        if (response.ok) {
          console.log('📊 Performance data sent successfully');
        } else {
          console.warn('⚠️ Failed to send performance data:', response.status);
        }
      }).catch(error => {
        console.warn('⚠️ Performance data sending error:', error);
      });

    } catch (error) {
      console.warn('⚠️ Error preparing performance data:', error);
    }
  };

  // このコンポーネントは視覚的な要素を持たない
  return null;
}