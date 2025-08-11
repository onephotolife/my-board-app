export interface PasswordOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeSimilar?: boolean;
  memorable?: boolean;
}

/**
 * セキュアなパスワードを生成
 */
export function generateSecurePassword(options: PasswordOptions = {}): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true,
    memorable = false
  } = options;
  
  if (memorable) {
    return generateMemorablePassword();
  } else {
    return generateRandomPassword({
      length,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
      excludeSimilar
    });
  }
}

/**
 * 覚えやすいパスワードを生成
 */
function generateMemorablePassword(): string {
  const adjectives = ['Happy', 'Sunny', 'Blue', 'Fast', 'Smart', 'Brave', 'Bright', 'Strong', 'Swift', 'Noble'];
  const nouns = ['Tiger', 'Ocean', 'Mountain', 'Star', 'Dragon', 'Phoenix', 'Thunder', 'Forest', 'River', 'Eagle'];
  const numbers = Math.floor(Math.random() * 9999);
  const symbols = ['!', '@', '#', '$', '%', '&', '*'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  // フォーマット: Adjective + Noun + Number + Symbol
  return `${adj}${noun}${numbers.toString().padStart(4, '0')}${symbol}`;
}

/**
 * ランダムな強力パスワードを生成
 */
function generateRandomPassword(options: {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
}): string {
  let charset = '';
  let password = '';
  const guaranteedChars: string[] = [];
  
  // 文字セットの構築
  if (options.includeLowercase) {
    const lowercase = options.excludeSimilar 
      ? 'abcdefghjkmnpqrstuvwxyz' // l, i, o を除外
      : 'abcdefghijklmnopqrstuvwxyz';
    charset += lowercase;
    guaranteedChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
  }
  
  if (options.includeUppercase) {
    const uppercase = options.excludeSimilar
      ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' // I, O を除外
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    charset += uppercase;
    guaranteedChars.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
  }
  
  if (options.includeNumbers) {
    const numbers = options.excludeSimilar
      ? '23456789' // 0, 1 を除外
      : '0123456789';
    charset += numbers;
    guaranteedChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
  }
  
  if (options.includeSymbols) {
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    charset += symbols;
    guaranteedChars.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }
  
  // 各種文字が最低1つ含まれることを保証
  password = guaranteedChars.join('');
  
  // 残りの文字をランダムに生成
  for (let i = password.length; i < options.length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  // パスワードをシャッフル
  return shuffleString(password);
}

/**
 * 文字列をシャッフル
 */
function shuffleString(str: string): string {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join('');
}

/**
 * パスワード候補を複数生成
 */
export function generatePasswordSuggestions(count: number = 3): {
  memorable: string[];
  strong: string[];
} {
  const memorable: string[] = [];
  const strong: string[] = [];
  
  for (let i = 0; i < count; i++) {
    memorable.push(generateSecurePassword({ memorable: true }));
    strong.push(generateSecurePassword({ memorable: false, length: 16 }));
  }
  
  return { memorable, strong };
}