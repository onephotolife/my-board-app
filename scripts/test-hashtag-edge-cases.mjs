// Direct test of hashtag utility functions for edge cases and Unicode
// Note: This duplicates the implementation for testing purposes
const HASHTAG_REGEX = /#([\p{L}\p{N}_\p{M}\p{Extended_Pictographic}\p{Emoji_Presentation}]+(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}]+)*)/gu;
const VARIATION_SELECTOR_REGEX = /\uFE0E|\uFE0F/gu;

function normalizeTag(raw) {
  if (!raw) return '';
  let s = raw.normalize('NFKC');
  s = s.replace(VARIATION_SELECTOR_REGEX, '');
  s = s.replace(/^#+/, '');
  s = s.trim();
  s = s.replace(/[A-Z]/g, (c) => c.toLowerCase());
  if (s.length < 1 || s.length > 64) return '';
  return s;
}

function extractHashtags(text) {
  if (!text) return [];
  const set = new Map();
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const display = match[1];
    const key = normalizeTag(display);
    if (key) {
      if (!set.has(key)) set.set(key, display);
    }
  }
  return Array.from(set.entries()).map(([key, display]) => ({ key, display }));
}

function linkifyHashtags(text, toHref = (k) => `/tags/${encodeURIComponent(k)}`) {
  if (!text) return [];
  const result = [];
  let lastIndex = 0;
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > lastIndex) result.push(text.slice(lastIndex, start));
    const display = match[0];
    const key = normalizeTag(match[1]);
    if (key) {
      result.push({ type: 'link', text: display, href: toHref(key) });
    } else {
      result.push(display);
    }
    lastIndex = end;
  }
  if (lastIndex < text.length) result.push(text.slice(lastIndex));
  return result;
}

console.log('🧪 Starting Hashtag Edge Cases and Unicode Tests...\n');

// Test normalizeTag edge cases
console.log('1. Testing normalizeTag function:');

const normalizeTests = [
  // Basic cases
  { input: 'Hello', expected: 'hello', desc: 'Basic ASCII normalization' },
  { input: 'JavaScript', expected: 'javascript', desc: 'Case normalization' },
  
  // Unicode normalization
  { input: '東京', expected: '東京', desc: 'Japanese characters' },
  { input: 'ＨｅｌｌｏＷｏｒｌｄ', expected: 'helloworld', desc: 'Full-width to half-width' },
  
  // Variation selectors
  { input: '⭐️', expected: '⭐', desc: 'Emoji variation selector removal' },
  { input: '⭐︎', expected: '⭐', desc: 'Text variation selector removal' },
  
  // Prefix and whitespace
  { input: '#hello', expected: 'hello', desc: 'Hashtag prefix removal' },
  { input: '  test  ', expected: 'test', desc: 'Whitespace trimming' },
  
  // Edge cases
  { input: '', expected: '', desc: 'Empty string' },
  { input: 'a'.repeat(65), expected: '', desc: 'Too long (65 chars)' },
  { input: 'a'.repeat(64), expected: 'a'.repeat(64), desc: 'Max length (64 chars)' }
];

let normalizePassCount = 0;
for (const test of normalizeTests) {
  const result = normalizeTag(test.input);
  const passed = result === test.expected;
  console.log(`  ${passed ? '✅' : '❌'} ${test.desc}: "${test.input}" → "${result}" ${passed ? '' : `(expected: "${test.expected}")`}`);
  if (passed) normalizePassCount++;
}
console.log(`  Result: ${normalizePassCount}/${normalizeTests.length} tests passed\n`);

// Test extractHashtags edge cases
console.log('2. Testing extractHashtags function:');

const extractTests = [
  // Basic cases
  { input: 'Hello #world #test', expected: [['world', 'world'], ['test', 'test']], desc: 'Basic hashtags' },
  
  // Unicode cases
  { input: 'これは#東京での#テスト投稿です', expected: [['東京', '東京'], ['テスト', 'テスト']], desc: 'Japanese hashtags' },
  { input: 'Test #🚀 and #🇯🇵 emoji', expected: [['🚀', '🚀'], ['🇯🇵', '🇯🇵']], desc: 'Emoji hashtags' },
  { input: 'ZWJ #👨‍💻 sequence', expected: [['👨‍💻', '👨‍💻']], desc: 'ZWJ emoji sequence' },
  
  // Edge cases
  { input: '#JavaScript #javascript #JAVASCRIPT', expected: [['javascript', 'JavaScript']], desc: 'Case deduplication' },
  { input: '#test #different #test', expected: [['test', 'test'], ['different', 'different']], desc: 'Duplicate removal' },
  { input: '', expected: [], desc: 'Empty string' },
  { input: 'no hashtags', expected: [], desc: 'No hashtags' },
  { input: '#', expected: [], desc: 'Empty hashtag' },
  
  // Normalization edge cases
  { input: '#⭐️ and #⭐︎', expected: [['⭐', '⭐️']], desc: 'Variation selector normalization' }
];

let extractPassCount = 0;
for (const test of extractTests) {
  const result = extractHashtags(test.input);
  const resultPairs = result.map(r => [r.key, r.display]);
  
  const passed = JSON.stringify(resultPairs) === JSON.stringify(test.expected);
  console.log(`  ${passed ? '✅' : '❌'} ${test.desc}`);
  if (!passed) {
    console.log(`    Input: "${test.input}"`);
    console.log(`    Got: ${JSON.stringify(resultPairs)}`);
    console.log(`    Expected: ${JSON.stringify(test.expected)}`);
  }
  if (passed) extractPassCount++;
}
console.log(`  Result: ${extractPassCount}/${extractTests.length} tests passed\n`);

// Test linkifyHashtags edge cases
console.log('3. Testing linkifyHashtags function:');

const linkifyTests = [
  { 
    input: 'Hello #world test',
    expected: ['Hello ', { type: 'link', text: '#world', href: '/tags/world' }, ' test'],
    desc: 'Basic linkification'
  },
  {
    input: '#東京 Japanese hashtag',
    expected: [{ type: 'link', text: '#東京', href: '/tags/%E6%9D%B1%E4%BA%AC' }, ' Japanese hashtag'],
    desc: 'Unicode hashtag linkification'
  },
  {
    input: '#🚀 emoji hashtag',
    expected: [{ type: 'link', text: '#🚀', href: '/tags/%F0%9F%9A%80' }, ' emoji hashtag'],
    desc: 'Emoji hashtag linkification'
  },
  {
    input: 'no hashtags',
    expected: ['no hashtags'],
    desc: 'No hashtags to linkify'
  },
  {
    input: '',
    expected: [],
    desc: 'Empty string'
  }
];

let linkifyPassCount = 0;
for (const test of linkifyTests) {
  const result = linkifyHashtags(test.input);
  const passed = JSON.stringify(result) === JSON.stringify(test.expected);
  console.log(`  ${passed ? '✅' : '❌'} ${test.desc}`);
  if (!passed) {
    console.log(`    Got: ${JSON.stringify(result)}`);
    console.log(`    Expected: ${JSON.stringify(test.expected)}`);
  }
  if (passed) linkifyPassCount++;
}
console.log(`  Result: ${linkifyPassCount}/${linkifyTests.length} tests passed\n`);

// Test extreme Unicode cases
console.log('4. Testing extreme Unicode edge cases:');

const extremeTests = [
  // Complex emoji sequences
  { input: 'Family #👨‍👩‍👧‍👦 and professional #👨‍💻', desc: 'Complex ZWJ sequences' },
  { input: 'Flags #🏳️‍🌈 and #🏳️‍⚧️', desc: 'Flag emoji with ZWJ' },
  { input: 'Mixed scripts #Hello #こんにちは #مرحبا #🌍', desc: 'Multiple script systems' },
  { input: 'Combining marks #café #naïve', desc: 'Combining diacritical marks' },
  { input: 'Right-to-left #العربية test', desc: 'RTL script handling' }
];

let extremePassCount = 0;
for (const test of extremeTests) {
  try {
    const result = extractHashtags(test.input);
    console.log(`  ✅ ${test.desc}: extracted ${result.length} hashtags`);
    result.forEach(tag => console.log(`    - "${tag.display}" → "${tag.key}"`));
    extremePassCount++;
  } catch (error) {
    console.log(`  ❌ ${test.desc}: Error - ${error.message}`);
  }
}
console.log(`  Result: ${extremePassCount}/${extremeTests.length} extreme cases handled\n`);

// Summary
const totalTests = normalizeTests.length + extractTests.length + linkifyTests.length + extremeTests.length;
const totalPassed = normalizePassCount + extractPassCount + linkifyPassCount + extremePassCount;

console.log(`🎯 Final Summary:`);
console.log(`  Total tests: ${totalTests}`);
console.log(`  Passed: ${totalPassed}`);
console.log(`  Failed: ${totalTests - totalPassed}`);
console.log(`  Success rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

if (totalPassed === totalTests) {
  console.log(`\n🎉 All hashtag edge cases and Unicode tests passed!`);
  process.exit(0);
} else {
  console.log(`\n⚠️  Some tests failed. Review the failures above.`);
  process.exit(1);
}