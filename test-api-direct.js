const http = require('http');

const postData = JSON.stringify({
  email: 'one.photolife+3@gmail.com'
});

const options = {
  hostname: 'localhost',
  port: 3003,
  path: '/api/auth/request-reset-test',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing API endpoint...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(postData);
req.end();

// Wait for server to start
setTimeout(() => {
  console.log('Test complete');
}, 1000);
