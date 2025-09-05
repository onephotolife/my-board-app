import { normalizeTag, extractHashtags, linkifyHashtags } from '../../src/app/utils/hashtag';

describe('Hashtag Utility Functions', () => {
  describe('normalizeTag', () => {
    test('should handle basic ASCII normalization', () => {
      expect(normalizeTag('Hello')).toBe('hello');
      expect(normalizeTag('JavaScript')).toBe('javascript');
      expect(normalizeTag('TEST')).toBe('test');
    });

    test('should handle Unicode normalization (NFKC)', () => {
      // Full-width to half-width
      expect(normalizeTag('ＨｅｌｌｏＷｏｒｌｄ')).toBe('helloworld');
      
      // Canonical decomposition and composition
      expect(normalizeTag('é')).toBe('é'); // Should normalize to canonical form
      expect(normalizeTag('ñ')).toBe('ñ'); // Should normalize to canonical form
    });

    test('should handle variation selectors', () => {
      // Text presentation vs emoji presentation
      expect(normalizeTag('⭐️')).toBe('⭐'); // Remove variation selector
      expect(normalizeTag('⭐︎')).toBe('⭐'); // Remove variation selector
      expect(normalizeTag('♠️')).toBe('♠'); // Remove variation selector
    });

    test('should handle prefix removal', () => {
      expect(normalizeTag('#hello')).toBe('hello');
      expect(normalizeTag('##test')).toBe('test');
      expect(normalizeTag('###multiple')).toBe('multiple');
    });

    test('should handle whitespace trimming', () => {
      expect(normalizeTag('  hello  ')).toBe('hello');
      expect(normalizeTag('\t\ntest\t\n')).toBe('test');
      expect(normalizeTag('   #  spaced  #  ')).toBe('spaced');
    });

    test('should handle length constraints', () => {
      expect(normalizeTag('')).toBe('');
      expect(normalizeTag('a')).toBe('a');
      expect(normalizeTag('a'.repeat(64))).toBe('a'.repeat(64));
      expect(normalizeTag('a'.repeat(65))).toBe(''); // Too long
    });

    test('should preserve non-ASCII characters', () => {
      expect(normalizeTag('東京')).toBe('東京');
      expect(normalizeTag('テスト')).toBe('テスト');
      expect(normalizeTag('مرحبا')).toBe('مرحبا');
      expect(normalizeTag('Привет')).toBe('привет'); // Only ASCII lowercased
    });

    test('should handle emoji normalization', () => {
      expect(normalizeTag('🚀')).toBe('🚀');
      expect(normalizeTag('🇯🇵')).toBe('🇯🇵');
      expect(normalizeTag('👨‍💻')).toBe('👨‍💻'); // ZWJ sequence preserved
    });

    test('should handle edge cases', () => {
      expect(normalizeTag(null as any)).toBe('');
      expect(normalizeTag(undefined as any)).toBe('');
      expect(normalizeTag('')).toBe('');
      expect(normalizeTag('   ')).toBe('');
      expect(normalizeTag('#')).toBe('');
    });
  });

  describe('extractHashtags', () => {
    test('should extract basic hashtags', () => {
      const result = extractHashtags('Hello #world #test');
      expect(result).toEqual([
        { key: 'world', display: 'world' },
        { key: 'test', display: 'test' }
      ]);
    });

    test('should extract Unicode hashtags', () => {
      const result = extractHashtags('これは#東京での#テスト投稿です');
      expect(result).toEqual([
        { key: '東京', display: '東京' },
        { key: 'テスト', display: 'テスト' }
      ]);
    });

    test('should extract emoji hashtags', () => {
      const result = extractHashtags('Test #🚀 rocket and #🇯🇵 flag');
      expect(result).toEqual([
        { key: '🚀', display: '🚀' },
        { key: '🇯🇵', display: '🇯🇵' }
      ]);
    });

    test('should handle ZWJ emoji sequences', () => {
      const result = extractHashtags('Professional #👨‍💻 and family #👨‍👩‍👧‍👦');
      expect(result).toEqual([
        { key: '👨‍💻', display: '👨‍💻' },
        { key: '👨‍👩‍👧‍👦', display: '👨‍👩‍👧‍👦' }
      ]);
    });

    test('should handle case normalization', () => {
      const result = extractHashtags('#JavaScript #javascript #JAVASCRIPT');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('javascript');
      expect(result[0].display).toBe('JavaScript'); // First occurrence display preserved
    });

    test('should deduplicate hashtags', () => {
      const result = extractHashtags('#test #different #test again');
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { key: 'test', display: 'test' },
        { key: 'different', display: 'different' }
      ]);
    });

    test('should handle mixed scripts', () => {
      const result = extractHashtags('#Hello #こんにちは #مرحبا #🌍');
      expect(result).toEqual([
        { key: 'hello', display: 'Hello' },
        { key: 'こんにちは', display: 'こんにちは' },
        { key: 'مرحبا', display: 'مرحبا' },
        { key: '🌍', display: '🌍' }
      ]);
    });

    test('should handle hashtags with underscores and numbers', () => {
      const result = extractHashtags('#test_123 #hello_world #version2_0');
      expect(result).toEqual([
        { key: 'test_123', display: 'test_123' },
        { key: 'hello_world', display: 'hello_world' },
        { key: 'version2_0', display: 'version2_0' }
      ]);
    });

    test('should handle edge cases', () => {
      expect(extractHashtags('')).toEqual([]);
      expect(extractHashtags(null as any)).toEqual([]);
      expect(extractHashtags(undefined as any)).toEqual([]);
      expect(extractHashtags('#')).toEqual([]);
      expect(extractHashtags('no hashtags here')).toEqual([]);
      expect(extractHashtags('# empty hashtag')).toEqual([]);
    });

    test('should handle variation selector normalization', () => {
      const result = extractHashtags('#⭐️ and #⭐︎ both stars');
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('⭐');
    });

    test('should handle complex Unicode normalization', () => {
      // Full-width characters
      const result = extractHashtags('#ＴｅｓｔＩｎｇ fullwidth test');
      expect(result).toEqual([
        { key: 'testing', display: 'ＴｅｓｔＩｎｇ' }
      ]);
    });

    test('should handle very long hashtags', () => {
      const longTag = 'a'.repeat(100);
      const result = extractHashtags(`#${longTag}`);
      expect(result).toEqual([]); // Should be filtered out due to length
    });

    test('should handle hashtags at boundaries', () => {
      const result = extractHashtags('#start middle #end');
      expect(result).toEqual([
        { key: 'start', display: 'start' },
        { key: 'end', display: 'end' }
      ]);
    });
  });

  describe('linkifyHashtags', () => {
    test('should convert hashtags to links', () => {
      const result = linkifyHashtags('Hello #world test');
      expect(result).toEqual([
        'Hello ',
        { type: 'link', text: '#world', href: '/tags/world' },
        ' test'
      ]);
    });

    test('should handle multiple hashtags', () => {
      const result = linkifyHashtags('#first and #second hashtag');
      expect(result).toEqual([
        { type: 'link', text: '#first', href: '/tags/first' },
        ' and ',
        { type: 'link', text: '#second', href: '/tags/second' },
        ' hashtag'
      ]);
    });

    test('should handle custom href generator', () => {
      const customHref = (key: string) => `/custom/${key}`;
      const result = linkifyHashtags('Test #custom', customHref);
      expect(result).toEqual([
        'Test ',
        { type: 'link', text: '#custom', href: '/custom/custom' }
      ]);
    });

    test('should handle Unicode hashtags in links', () => {
      const result = linkifyHashtags('Japanese #東京 hashtag');
      expect(result).toEqual([
        'Japanese ',
        { type: 'link', text: '#東京', href: '/tags/%E6%9D%B1%E4%BA%AC' }
      ]);
    });

    test('should handle emoji hashtags in links', () => {
      const result = linkifyHashtags('Emoji #🚀 hashtag');
      expect(result).toEqual([
        'Emoji ',
        { type: 'link', text: '#🚀', href: '/tags/%F0%9F%9A%80' }
      ]);
    });

    test('should handle invalid hashtags gracefully', () => {
      const result = linkifyHashtags('Test #' + 'a'.repeat(100) + ' invalid');
      expect(result).toEqual(['Test #' + 'a'.repeat(100) + ' invalid']);
    });

    test('should handle edge cases', () => {
      expect(linkifyHashtags('')).toEqual([]);
      expect(linkifyHashtags(null as any)).toEqual([]);
      expect(linkifyHashtags(undefined as any)).toEqual([]);
      expect(linkifyHashtags('no hashtags')).toEqual(['no hashtags']);
      expect(linkifyHashtags('#')).toEqual(['#']);
    });

    test('should handle consecutive hashtags', () => {
      const result = linkifyHashtags('#first#second');
      expect(result).toEqual([
        { type: 'link', text: '#first', href: '/tags/first' },
        { type: 'link', text: '#second', href: '/tags/second' }
      ]);
    });

    test('should preserve text around hashtags', () => {
      const result = linkifyHashtags('Start #middle end');
      expect(result).toEqual([
        'Start ',
        { type: 'link', text: '#middle', href: '/tags/middle' },
        ' end'
      ]);
    });
  });

  describe('Integration tests', () => {
    test('should handle complete workflow with complex Unicode', () => {
      const text = 'Testing #JavaScript #東京 #🚀 #👨‍💻 development';
      
      // Extract hashtags
      const extracted = extractHashtags(text);
      expect(extracted).toHaveLength(4);
      
      // Verify normalization applied correctly
      expect(extracted[0].key).toBe('javascript');
      expect(extracted[1].key).toBe('東京');
      expect(extracted[2].key).toBe('🚀');
      expect(extracted[3].key).toBe('👨‍💻');
      
      // Linkify the text
      const linkified = linkifyHashtags(text);
      expect(linkified).toContain({ type: 'link', text: '#JavaScript', href: '/tags/javascript' });
      expect(linkified).toContain({ type: 'link', text: '#東京', href: '/tags/%E6%9D%B1%E4%BA%AC' });
    });

    test('should handle stress test with many hashtags', () => {
      const hashtags = Array.from({ length: 50 }, (_, i) => `#tag${i}`).join(' ');
      const text = `Stress test ${hashtags} end`;
      
      const extracted = extractHashtags(text);
      expect(extracted).toHaveLength(50);
      
      const linkified = linkifyHashtags(text);
      const linkCount = linkified.filter(item => typeof item === 'object' && item.type === 'link').length;
      expect(linkCount).toBe(50);
    });

    test('should maintain consistency across normalization', () => {
      const testCases = [
        '#JavaScript', '#JAVASCRIPT', '#javascript'
      ];
      
      const normalizedKeys = testCases.map(tag => normalizeTag(tag.slice(1)));
      
      // All should normalize to the same key
      expect(normalizedKeys.every(key => key === 'javascript')).toBe(true);
      
      // But extraction should preserve original display
      const extracted = extractHashtags(testCases.join(' '));
      expect(extracted).toHaveLength(1);
      expect(extracted[0].display).toBe('JavaScript'); // First occurrence
    });
  });
});