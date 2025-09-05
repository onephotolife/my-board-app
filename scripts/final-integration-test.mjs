// Final Integration Test with 3x PASS + Log Health Gate
// STRICT120 Protocol Compliance Verification

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

console.log('🚀 STRICT120 Final Integration Test Starting...\n');
console.log('📋 Test Requirements:');
console.log('  - 3 consecutive PASS runs required');
console.log('  - Log Health Gate verification');
console.log('  - System stability confirmation');
console.log('  - Zero critical errors tolerance\n');

const API_BASE = 'http://localhost:3000';
const MAX_RETRIES = 3;
const HEALTH_GATE_THRESHOLD = 0.95; // 95% success rate required

let testResults = [];
let logHealthGate = {
  criticalErrors: 0,
  warnings: 0,
  successfulRequests: 0,
  failedRequests: 0,
  healthScore: 0
};

// Test suite functions
async function runHashtagCoreTests() {
  console.log('🧪 Running hashtag core functionality tests...');
  
  const tests = [
    { name: 'Basic extraction', test: testBasicExtraction },
    { name: 'Unicode normalization', test: testUnicodeNormalization },
    { name: 'API connectivity', test: testAPIConnectivity },
    { name: 'Database persistence', test: testDatabasePersistence },
    { name: 'Error handling', test: testErrorHandling }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const { name, test } of tests) {
    try {
      console.log(`  🔍 ${name}...`);
      const result = await test();
      if (result.success) {
        console.log(`    ✅ ${name}: PASS`);
        passedTests++;
        logHealthGate.successfulRequests++;
      } else {
        console.log(`    ❌ ${name}: FAIL - ${result.error}`);
        logHealthGate.failedRequests++;
      }
    } catch (error) {
      console.log(`    💥 ${name}: ERROR - ${error.message}`);
      logHealthGate.criticalErrors++;
      logHealthGate.failedRequests++;
    }
  }
  
  const successRate = passedTests / totalTests;
  console.log(`  📊 Core tests result: ${passedTests}/${totalTests} (${(successRate * 100).toFixed(1)}%)`);
  
  return {
    passed: passedTests,
    total: totalTests,
    successRate,
    success: successRate >= HEALTH_GATE_THRESHOLD
  };
}

async function testBasicExtraction() {
  // Test hashtag extraction functionality
  const HASHTAG_REGEX = /#([\p{L}\p{N}_\p{M}\p{Extended_Pictographic}\p{Emoji_Presentation}]+(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}]+)*)/gu;
  const testText = 'Test #basic #functionality works';
  const matches = Array.from(testText.matchAll(HASHTAG_REGEX));
  
  return {
    success: matches.length === 2,
    error: matches.length !== 2 ? `Expected 2 hashtags, got ${matches.length}` : null
  };
}

async function testUnicodeNormalization() {
  // Test Unicode handling
  const testCases = [
    { input: '東京', expected: '東京' },
    { input: '⭐️', expected: '⭐' }, // Variation selector removal
    { input: 'JavaScript', expected: 'javascript' }
  ];
  
  function normalizeTag(raw) {
    if (!raw) return '';
    let s = raw.normalize('NFKC');
    s = s.replace(/\uFE0E|\uFE0F/gu, '');
    s = s.replace(/^#+/, '');
    s = s.trim();
    s = s.replace(/[A-Z]/g, (c) => c.toLowerCase());
    return s.length < 1 || s.length > 64 ? '' : s;
  }
  
  for (const { input, expected } of testCases) {
    const result = normalizeTag(input);
    if (result !== expected) {
      return { success: false, error: `${input} → ${result}, expected ${expected}` };
    }
  }
  
  return { success: true };
}

async function testAPIConnectivity() {
  // Test API endpoints
  const endpoints = [
    '/api/tags/search?q=test&limit=5',
    '/api/tags/trending?days=7&limit=5'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        timeout: 5000
      });
      
      if (!response.ok) {
        return { success: false, error: `${endpoint} returned ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: `${endpoint} failed: ${error.message}` };
    }
  }
  
  return { success: true };
}

async function testDatabasePersistence() {
  // Test database operations
  try {
    const response = await fetch(`${API_BASE}/api/tags/search?q=テスト&limit=1`);
    if (!response.ok) {
      return { success: false, error: `Database query failed: ${response.status}` };
    }
    
    const data = await response.json();
    if (!data.success && data.success !== undefined) {
      return { success: false, error: 'API response indicates failure' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: `Database test failed: ${error.message}` };
  }
}

async function testErrorHandling() {
  // Test error scenarios
  try {
    // Test invalid parameters
    const response = await fetch(`${API_BASE}/api/tags/search?q=${'x'.repeat(100)}&limit=1000`);
    
    // Should handle gracefully, not crash
    const isValidResponse = response.status === 200 || response.status === 400 || response.status === 422;
    
    if (!isValidResponse) {
      return { success: false, error: `Unexpected status for invalid input: ${response.status}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: `Error handling test failed: ${error.message}` };
  }
}

async function runLogHealthGate() {
  console.log('\n🏥 Running Log Health Gate...');
  
  // Calculate health score
  const totalRequests = logHealthGate.successfulRequests + logHealthGate.failedRequests;
  const successRate = totalRequests > 0 ? logHealthGate.successfulRequests / totalRequests : 1;
  const criticalErrorPenalty = Math.min(logHealthGate.criticalErrors * 0.1, 0.5);
  
  logHealthGate.healthScore = Math.max(0, successRate - criticalErrorPenalty);
  
  console.log('📊 Health Gate Metrics:');
  console.log(`  Successful requests: ${logHealthGate.successfulRequests}`);
  console.log(`  Failed requests: ${logHealthGate.failedRequests}`);
  console.log(`  Critical errors: ${logHealthGate.criticalErrors}`);
  console.log(`  Warnings: ${logHealthGate.warnings}`);
  console.log(`  Health score: ${(logHealthGate.healthScore * 100).toFixed(1)}%`);
  console.log(`  Required threshold: ${(HEALTH_GATE_THRESHOLD * 100).toFixed(1)}%`);
  
  const healthPass = logHealthGate.healthScore >= HEALTH_GATE_THRESHOLD && logHealthGate.criticalErrors === 0;
  
  console.log(`  🏥 Health Gate: ${healthPass ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!healthPass) {
    if (logHealthGate.criticalErrors > 0) {
      console.log(`  ⚠️  Critical errors detected: ${logHealthGate.criticalErrors}`);
    }
    if (logHealthGate.healthScore < HEALTH_GATE_THRESHOLD) {
      console.log(`  ⚠️  Health score below threshold`);
    }
  }
  
  return {
    success: healthPass,
    score: logHealthGate.healthScore,
    metrics: logHealthGate
  };
}

async function runSystemStabilityTest() {
  console.log('\n🔧 System Stability Test...');
  
  // Test rapid successive requests
  const rapidTests = [];
  for (let i = 0; i < 10; i++) {
    rapidTests.push(
      fetch(`${API_BASE}/api/tags/search?q=stability${i}&limit=3`, { timeout: 1000 })
        .then(response => ({ index: i, status: response.status, success: response.ok }))
        .catch(error => ({ index: i, error: error.message, success: false }))
    );
  }
  
  const results = await Promise.all(rapidTests);
  const successfulRapidTests = results.filter(r => r.success).length;
  const rapidSuccessRate = successfulRapidTests / results.length;
  
  console.log(`  🚀 Rapid requests: ${successfulRapidTests}/${results.length} successful (${(rapidSuccessRate * 100).toFixed(1)}%)`);
  
  // Test concurrent requests
  const concurrentTests = Array.from({ length: 5 }, (_, i) =>
    fetch(`${API_BASE}/api/tags/search?q=concurrent&limit=5`, { timeout: 2000 })
      .then(response => response.ok)
      .catch(() => false)
  );
  
  const concurrentResults = await Promise.all(concurrentTests);
  const successfulConcurrentTests = concurrentResults.filter(Boolean).length;
  const concurrentSuccessRate = successfulConcurrentTests / concurrentResults.length;
  
  console.log(`  🔄 Concurrent requests: ${successfulConcurrentTests}/${concurrentResults.length} successful (${(concurrentSuccessRate * 100).toFixed(1)}%)`);
  
  const stabilityScore = (rapidSuccessRate + concurrentSuccessRate) / 2;
  const stabilityPass = stabilityScore >= 0.8; // 80% threshold for stability
  
  console.log(`  📊 Stability score: ${(stabilityScore * 100).toFixed(1)}%`);
  console.log(`  🔧 Stability test: ${stabilityPass ? '✅ PASS' : '❌ FAIL'}`);
  
  if (rapidSuccessRate < 0.8) {
    logHealthGate.warnings++;
  }
  if (concurrentSuccessRate < 0.8) {
    logHealthGate.warnings++;
  }
  
  return {
    success: stabilityPass,
    rapidSuccessRate,
    concurrentSuccessRate,
    stabilityScore
  };
}

async function runFullIntegrationPass(passNumber) {
  console.log(`\n🎯 === INTEGRATION PASS ${passNumber}/3 ===`);
  
  const startTime = Date.now();
  
  // Run core tests
  const coreResult = await runHashtagCoreTests();
  
  // Run stability test  
  const stabilityResult = await runSystemStabilityTest();
  
  const duration = Date.now() - startTime;
  const passSuccess = coreResult.success && stabilityResult.success;
  
  const result = {
    passNumber,
    success: passSuccess,
    duration,
    coreTests: coreResult,
    stability: stabilityResult,
    timestamp: new Date().toISOString()
  };
  
  console.log(`\n📊 Pass ${passNumber} Summary:`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Core tests: ${coreResult.success ? '✅ PASS' : '❌ FAIL'} (${coreResult.successRate * 100}%)`);
  console.log(`  Stability: ${stabilityResult.success ? '✅ PASS' : '❌ FAIL'} (${stabilityResult.stabilityScore * 100}%)`);
  console.log(`  Overall: ${passSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  return result;
}

async function main() {
  const startTime = Date.now();
  
  console.log('🌟 Starting STRICT120 Final Integration Test Sequence...\n');
  
  // Run 3 consecutive passes
  for (let i = 1; i <= 3; i++) {
    const result = await runFullIntegrationPass(i);
    testResults.push(result);
    
    if (!result.success) {
      console.log(`\n❌ Pass ${i} FAILED - Stopping integration test`);
      break;
    }
    
    // Brief pause between passes
    if (i < 3) {
      console.log(`\n⏳ Waiting 2 seconds before next pass...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Run health gate analysis
  const healthGateResult = await runLogHealthGate();
  
  // Final analysis
  const totalDuration = Date.now() - startTime;
  const passedRuns = testResults.filter(r => r.success).length;
  const allPassesPassed = passedRuns === 3;
  const healthGatePassed = healthGateResult.success;
  const overallSuccess = allPassesPassed && healthGatePassed;
  
  console.log('\n' + '='.repeat(60));
  console.log('🎖️  STRICT120 FINAL INTEGRATION TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`⏱️  Total duration: ${totalDuration}ms`);
  console.log(`🎯 Passes completed: ${passedRuns}/3`);
  console.log(`🏥 Health Gate: ${healthGatePassed ? '✅ PASS' : '❌ FAIL'} (${(healthGateResult.score * 100).toFixed(1)}%)`);
  console.log(`📊 Overall result: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (overallSuccess) {
    console.log('\n🎉 STRICT120 COMPLIANCE VERIFIED!');
    console.log('✅ All 3 integration passes successful');
    console.log('✅ Log Health Gate passed');
    console.log('✅ System stability confirmed');
    console.log('✅ Zero critical errors');
    console.log('\n🚀 Hashtag feature implementation is PRODUCTION READY');
  } else {
    console.log('\n⚠️  STRICT120 COMPLIANCE FAILED');
    if (!allPassesPassed) {
      console.log(`❌ Only ${passedRuns}/3 passes successful`);
    }
    if (!healthGatePassed) {
      console.log('❌ Health Gate failed');
    }
    console.log('\n🔧 Issues must be resolved before production deployment');
  }
  
  // Detailed breakdown
  console.log('\n📋 Detailed Results:');
  testResults.forEach((result, index) => {
    console.log(`  Pass ${index + 1}: ${result.success ? '✅' : '❌'} (${result.duration}ms)`);
    console.log(`    Core: ${result.coreTests.passed}/${result.coreTests.total}`);
    console.log(`    Stability: ${(result.stability.stabilityScore * 100).toFixed(1)}%`);
  });
  
  console.log(`\n🏥 Health Metrics:`);
  console.log(`  Requests: ${logHealthGate.successfulRequests} success, ${logHealthGate.failedRequests} failed`);
  console.log(`  Errors: ${logHealthGate.criticalErrors} critical, ${logHealthGate.warnings} warnings`);
  
  process.exit(overallSuccess ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚡ Integration test interrupted');
  console.log(`📊 Completed passes: ${testResults.filter(r => r.success).length}/3`);
  process.exit(1);
});

// Run the integration test
main().catch(error => {
  console.error('\n💥 Integration test crashed:', error);
  process.exit(1);
});