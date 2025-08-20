
// パフォーマンス測定ツール
(function() {
  const measurements = {
    pageLoad: [],
    resourceLoad: [],
    serviceWorker: []
  };
  
  // ページロードパフォーマンス
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      measurements.pageLoad.push({
        timestamp: new Date().toISOString(),
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        totalTime: perfData.loadEventEnd - perfData.fetchStart
      });
      
      console.log('📊 ページロードパフォーマンス:', {
        DOMContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart) + 'ms',
        LoadComplete: Math.round(perfData.loadEventEnd - perfData.loadEventStart) + 'ms',
        Total: Math.round(perfData.loadEventEnd - perfData.fetchStart) + 'ms'
      });
    }
  });
  
  // リソースロードパフォーマンス
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'resource') {
        measurements.resourceLoad.push({
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize
        });
        
        // 遅いリソースを警告
        if (entry.duration > 1000) {
          console.warn('⚠️ 遅いリソース:', {
            url: entry.name,
            duration: Math.round(entry.duration) + 'ms'
          });
        }
      }
    }
  });
  
  observer.observe({ entryTypes: ['resource'] });
  
  // Service Worker パフォーマンス
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      const sw = registration.active;
      if (sw) {
        // Service Worker の状態を監視
        console.log('🔧 Service Worker状態:', sw.state);
        
        // メッセージングでパフォーマンスデータを取得
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'performance') {
            measurements.serviceWorker.push(event.data.data);
            console.log('📈 Service Workerパフォーマンス:', event.data.data);
          }
        };
        
        sw.postMessage({ type: 'get-performance' }, [messageChannel.port2]);
      }
    });
  }
  
  // パフォーマンス分析関数
  window.analyzePerformance = () => {
    console.group('🎯 パフォーマンス分析');
    
    // ページロード分析
    if (measurements.pageLoad.length > 0) {
      const latest = measurements.pageLoad[measurements.pageLoad.length - 1];
      console.log('ページロード:', {
        DOMContentLoaded: latest.domContentLoaded + 'ms',
        Total: latest.totalTime + 'ms',
        評価: latest.totalTime < 1000 ? '✅ 優秀' : 
              latest.totalTime < 3000 ? '⚠️ 普通' : '❌ 要改善'
      });
    }
    
    // リソース分析
    if (measurements.resourceLoad.length > 0) {
      const slowResources = measurements.resourceLoad
        .filter(r => r.duration > 500)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);
      
      if (slowResources.length > 0) {
        console.log('遅いリソース TOP5:');
        slowResources.forEach(r => {
          console.log('  -', r.name.split('/').pop(), ':', Math.round(r.duration) + 'ms');
        });
      } else {
        console.log('✅ すべてのリソースが高速に読み込まれています');
      }
    }
    
    // メモリ使用量
    if (performance.memory) {
      const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      console.log('メモリ使用量:', memoryMB + 'MB', 
        memoryMB < 50 ? '✅' : memoryMB < 100 ? '⚠️' : '❌');
    }
    
    console.groupEnd();
  };
  
  // 自動分析（5秒後）
  setTimeout(() => {
    window.analyzePerformance();
  }, 5000);
  
  console.log('📊 パフォーマンス測定システム起動');
  console.log('コマンド: window.analyzePerformance()');
})();
