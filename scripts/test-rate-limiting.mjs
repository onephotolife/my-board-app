// Test rate limiting and 429 handling
import fetch from 'node-fetch';

console.log('🚦 Testing Rate Limiting and 429 Handling...\n');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const CONCURRENT_REQUESTS = 20;
const REQUEST_BATCHES = 3;

let totalRequests = 0;
let rateLimitsHit = 0;
let successRequests = 0;
let errorRequests = 0;

async function testHashtagSearchAPI() {
  console.log('1. Testing /api/tags/search rate limiting:');
  
  const testQueries = ['東', 'test', 'React', 'JavaScript', 'プログラミング'];
  
  for (let batch = 1; batch <= REQUEST_BATCHES; batch++) {
    console.log(`\n  Batch ${batch}/${REQUEST_BATCHES} - Sending ${CONCURRENT_REQUESTS} concurrent requests:`);
    
    const requests = [];
    
    // Create concurrent requests
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      const query = testQueries[i % testQueries.length];
      const url = `${API_BASE}/api/tags/search?q=${encodeURIComponent(query)}&limit=5`;
      
      requests.push(
        fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }).then(response => {
          totalRequests++;
          
          if (response.status === 429) {
            rateLimitsHit++;
            console.log(`    🔄 Rate limited (429) for query "${query}"`);
            return { status: 429, query, retryAfter: response.headers.get('retry-after') };
          } else if (response.ok) {
            successRequests++;
            return response.json().then(data => ({ status: 200, query, data }));
          } else {
            errorRequests++;
            console.log(`    ❌ Error ${response.status} for query "${query}"`);
            return { status: response.status, query };
          }
        }).catch(error => {
          errorRequests++;
          console.log(`    💥 Network error for query: ${error.message}`);
          return { error: error.message };
        })
      );
    }
    
    // Wait for all requests in this batch
    const results = await Promise.all(requests);
    
    // Analyze batch results
    const batchStats = results.reduce((acc, result) => {
      if (result.status === 200) acc.success++;
      else if (result.status === 429) acc.rateLimited++;
      else if (result.error) acc.networkError++;
      else acc.otherError++;
      return acc;
    }, { success: 0, rateLimited: 0, networkError: 0, otherError: 0 });
    
    console.log(`    Results: ${batchStats.success} success, ${batchStats.rateLimited} rate limited, ${batchStats.networkError} network errors, ${batchStats.otherError} other errors`);
    
    // Wait between batches to allow rate limit windows to reset
    if (batch < REQUEST_BATCHES) {
      console.log('    Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function testPostCreationRateLimit() {
  console.log('\n\n2. Testing POST creation rate limiting:');
  
  const testPosts = [
    'Rate limit test #1 #testing',
    'Rate limit test #2 #testing',
    'Rate limit test #3 #testing',
    'Rate limit test #4 #testing',
    'Rate limit test #5 #testing'
  ];
  
  let postRequests = 0;
  let postRateLimits = 0;
  let postSuccess = 0;
  let postErrors = 0;
  
  for (const content of testPosts) {
    try {
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      postRequests++;
      
      if (response.status === 429) {
        postRateLimits++;
        const retryAfter = response.headers.get('retry-after');
        console.log(`  🔄 Post rate limited (429), retry after: ${retryAfter}s`);
      } else if (response.ok) {
        postSuccess++;
        console.log(`  ✅ Post created successfully`);
      } else {
        postErrors++;
        console.log(`  ❌ Post creation failed: ${response.status}`);
      }
    } catch (error) {
      postErrors++;
      console.log(`  💥 Network error: ${error.message}`);
    }
    
    // Brief delay between posts
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n  Post API Results: ${postSuccess} success, ${postRateLimits} rate limited, ${postErrors} errors out of ${postRequests} requests`);
}

async function testRetryMechanism() {
  console.log('\n\n3. Testing retry mechanism behavior:');
  
  // Attempt to trigger rate limiting then test retry behavior
  const rapidRequests = Array.from({ length: 10 }, (_, i) => 
    fetch(`${API_BASE}/api/tags/search?q=retry${i}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).then(response => ({
      index: i,
      status: response.status,
      retryAfter: response.headers.get('retry-after')
    })).catch(error => ({
      index: i,
      error: error.message
    }))
  );
  
  const rapidResults = await Promise.all(rapidRequests);
  const rateLimitedRequests = rapidResults.filter(r => r.status === 429);
  
  console.log(`  Rapid fire results: ${rateLimitedRequests.length} rate limited out of ${rapidRequests.length}`);
  
  if (rateLimitedRequests.length > 0) {
    const retryAfter = rateLimitedRequests[0].retryAfter;
    console.log(`  First rate limit suggests waiting ${retryAfter}s`);
    
    if (retryAfter && parseInt(retryAfter) <= 5) {
      console.log(`  Waiting ${retryAfter}s and testing retry...`);
      await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
      
      const retryResponse = await fetch(`${API_BASE}/api/tags/search?q=retrytest`);
      console.log(`  Retry after wait: ${retryResponse.status} ${retryResponse.ok ? '✅' : '❌'}`);
    }
  } else {
    console.log('  No rate limiting triggered in rapid fire test');
  }
}

async function runAllTests() {
  try {
    await testHashtagSearchAPI();
    await testPostCreationRateLimit();
    await testRetryMechanism();
    
    console.log('\n\n🎯 Rate Limiting Test Summary:');
    console.log(`  Total API requests: ${totalRequests}`);
    console.log(`  Successful requests: ${successRequests}`);
    console.log(`  Rate limited (429): ${rateLimitsHit}`);
    console.log(`  Error requests: ${errorRequests}`);
    console.log(`  Rate limit hit rate: ${totalRequests > 0 ? ((rateLimitsHit / totalRequests) * 100).toFixed(1) : 0}%`);
    
    // Check if rate limiting is working
    if (rateLimitsHit > 0) {
      console.log('\n✅ Rate limiting is working - 429 responses detected');
    } else if (totalRequests > 30) {
      console.log('\n⚠️  No rate limiting detected despite many requests');
    } else {
      console.log('\n✅ Rate limiting may be working (insufficient requests to trigger)');
    }
    
    // Check if application handled rate limits gracefully
    if (errorRequests < totalRequests * 0.1) {
      console.log('✅ Application handled rate limiting gracefully (low error rate)');
    } else {
      console.log('⚠️  High error rate - check error handling');
    }
    
    console.log('\n🎉 Rate limiting tests completed!');
    
  } catch (error) {
    console.error('\n❌ Rate limiting test failed:', error);
    process.exit(1);
  }
}

runAllTests();