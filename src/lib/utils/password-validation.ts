/**
 * パスワード強度チェックとバリデーション
 */

import { z } from 'zod';

// パスワード強度レベル
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  FAIR = 2,
  STRONG = 3,
  VERY_STRONG = 4,
}

// パスワード強度の結果
export interface PasswordStrengthResult {
  score: PasswordStrength;
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  crackTime: string;
  isValid: boolean;
  errors: string[];
}

// よくあるパスワードのブラックリスト
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
  'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
  'shadow', '123123', '654321', 'superman', 'qazwsx', 'admin', 'welcome',
];

// パスワード要件
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventSequentialChars: true,
  preventRepeatingChars: true,
};

// パスワードバリデーションスキーマ
export const passwordSchema = z.string()
  .min(PASSWORD_REQUIREMENTS.minLength, `パスワードは${PASSWORD_REQUIREMENTS.minLength}文字以上である必要があります`)
  .max(PASSWORD_REQUIREMENTS.maxLength, `パスワードは${PASSWORD_REQUIREMENTS.maxLength}文字以下である必要があります`)
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.requireUppercase || /[A-Z]/.test(password),
    { message: 'パスワードには大文字を含める必要があります' }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.requireLowercase || /[a-z]/.test(password),
    { message: 'パスワードには小文字を含める必要があります' }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.requireNumbers || /[0-9]/.test(password),
    { message: 'パスワードには数字を含める必要があります' }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.requireSpecialChars || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    { message: 'パスワードには特殊文字を含める必要があります' }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.preventCommonPasswords || !COMMON_PASSWORDS.includes(password.toLowerCase()),
    { message: 'このパスワードは一般的すぎます。より安全なパスワードを選択してください' }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.preventSequentialChars || !hasSequentialChars(password),
    { message: 'パスワードに連続する文字（abc、123など）を含めることはできません' }
  )
  .refine(
    (password) => !PASSWORD_REQUIREMENTS.preventRepeatingChars || !hasRepeatingChars(password),
    { message: 'パスワードに同じ文字を3回以上連続させることはできません' }
  );

// 連続する文字をチェック
function hasSequentialChars(password: string): boolean {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
  ];

  const lowerPassword = password.toLowerCase();
  
  for (const seq of sequences) {
    for (let i = 0; i <= password.length - 3; i++) {
      const substring = lowerPassword.substring(i, i + 3);
      if (seq.includes(substring)) {
        return true;
      }
    }
  }
  
  return false;
}

// 繰り返し文字をチェック
function hasRepeatingChars(password: string): boolean {
  for (let i = 0; i <= password.length - 3; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      return true;
    }
  }
  return false;
}

// zxcvbnの動的インポート用の型定義
interface ZxcvbnResult {
  score: number;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crack_times_display: {
    offline_slow_hashing_1e4_per_second: string;
  };
}

// パスワード強度チェック（クライアントサイド用）
export async function checkPasswordStrength(password: string, userInputs?: string[]): Promise<PasswordStrengthResult> {
  const errors: string[] = [];
  
  // 基本的なバリデーション
  const validationResult = passwordSchema.safeParse(password);
  if (!validationResult.success) {
    errors.push(...validationResult.error.issues.map(issue => issue.message));
  }

  // zxcvbnによる強度チェック（動的インポート）
  try {
    const zxcvbn = (await import('zxcvbn')).default;
    const result = zxcvbn(password, userInputs) as ZxcvbnResult;
    
    // 日本語フィードバックに変換
    const japaneseFeedback = translateFeedback(result.feedback);
    
    return {
      score: result.score as PasswordStrength,
      feedback: japaneseFeedback,
      crackTime: translateCrackTime(result.crack_times_display.offline_slow_hashing_1e4_per_second),
      isValid: errors.length === 0 && result.score >= PasswordStrength.FAIR,
      errors,
    };
  } catch (error) {
    console.error('zxcvbn import error:', error);
    
    // フォールバック: 基本的な強度チェック
    const score = calculateBasicStrength(password);
    return {
      score,
      feedback: getBasicFeedback(score),
      crackTime: getBasicCrackTime(score),
      isValid: errors.length === 0 && score >= PasswordStrength.FAIR,
      errors,
    };
  }
}

// サーバーサイド用の同期版
export function checkPasswordStrengthSync(password: string, userInputs?: string[]): PasswordStrengthResult {
  const errors: string[] = [];
  
  // 基本的なバリデーション
  const validationResult = passwordSchema.safeParse(password);
  if (!validationResult.success) {
    errors.push(...validationResult.error.issues.map(issue => issue.message));
  }

  // 基本的な強度チェック
  const score = calculateBasicStrength(password);
  
  return {
    score,
    feedback: getBasicFeedback(score),
    crackTime: getBasicCrackTime(score),
    isValid: errors.length === 0 && score >= PasswordStrength.FAIR,
    errors,
  };
}

// 基本的な強度計算（フォールバック用）
function calculateBasicStrength(password: string): PasswordStrength {
  let score = 0;
  
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  
  return Math.min(score, 4) as PasswordStrength;
}

// 基本的なフィードバック
function getBasicFeedback(score: PasswordStrength): { warning?: string; suggestions: string[] } {
  const feedbackMap = {
    [PasswordStrength.VERY_WEAK]: {
      warning: 'このパスワードは非常に弱いです',
      suggestions: ['より長いパスワードを使用してください', '大文字、小文字、数字、記号を組み合わせてください'],
    },
    [PasswordStrength.WEAK]: {
      warning: 'このパスワードは弱いです',
      suggestions: ['パスワードの長さを増やしてください', '予測しにくい文字の組み合わせを使用してください'],
    },
    [PasswordStrength.FAIR]: {
      suggestions: ['より強力にするには、パスワードの長さを増やしてください'],
    },
    [PasswordStrength.STRONG]: {
      suggestions: [],
    },
    [PasswordStrength.VERY_STRONG]: {
      suggestions: [],
    },
  };
  
  return feedbackMap[score];
}

// 基本的な解読時間
function getBasicCrackTime(score: PasswordStrength): string {
  const crackTimeMap = {
    [PasswordStrength.VERY_WEAK]: '即座',
    [PasswordStrength.WEAK]: '数分',
    [PasswordStrength.FAIR]: '数時間',
    [PasswordStrength.STRONG]: '数日',
    [PasswordStrength.VERY_STRONG]: '数年',
  };
  
  return crackTimeMap[score];
}

// zxcvbnのフィードバックを日本語に翻訳
function translateFeedback(feedback: { warning: string; suggestions: string[] }): { warning?: string; suggestions: string[] } {
  const warningTranslations: { [key: string]: string } = {
    'This is a top-10 common password': 'これは最もよく使われるパスワードのトップ10です',
    'This is a top-100 common password': 'これは最もよく使われるパスワードのトップ100です',
    'This is a very common password': 'これは非常に一般的なパスワードです',
    'This is similar to a commonly used password': 'これはよく使われるパスワードに似ています',
    'A word by itself is easy to guess': '単語単体では推測されやすいです',
    'Names and surnames by themselves are easy to guess': '名前や姓だけでは推測されやすいです',
    'Common names and surnames are easy to guess': '一般的な名前や姓は推測されやすいです',
    'Dates are often easy to guess': '日付は推測されやすいです',
    'Recent years are easy to guess': '最近の年は推測されやすいです',
    'Sequences like abc or 6543 are easy to guess': 'abcや6543のような連続は推測されやすいです',
    'Repeats like "aaa" are easy to guess': '"aaa"のような繰り返しは推測されやすいです',
    'Repeats like "abcabcabc" are only slightly harder to guess than "abc"': '"abcabcabc"のような繰り返しは"abc"よりわずかに推測しにくいだけです',
  };

  const suggestionTranslations: { [key: string]: string } = {
    'Use a few words, avoid common phrases': 'いくつかの単語を使い、一般的なフレーズは避けてください',
    'No need for symbols, digits, or uppercase letters': '記号、数字、大文字は必須ではありません',
    'Add another word or two. Uncommon words are better.': 'もう1〜2つ単語を追加してください。珍しい単語が良いです',
    'Capitalization doesn\'t help very much': '大文字化はあまり役に立ちません',
    'All-uppercase is almost as easy to guess as all-lowercase': 'すべて大文字はすべて小文字とほぼ同じくらい推測しやすいです',
    'Reversed words aren\'t much harder to guess': '逆さまの単語はそれほど推測しにくくありません',
    'Predictable substitutions like \'@\' instead of \'a\' don\'t help very much': '\'@\'を\'a\'の代わりにするような予測可能な置換はあまり役に立ちません',
    'Avoid sequences': '連続を避けてください',
    'Avoid repeated words and characters': '繰り返しの単語や文字を避けてください',
    'Avoid dates and years that are associated with you': 'あなたに関連する日付や年を避けてください',
  };

  return {
    warning: feedback.warning ? (warningTranslations[feedback.warning] || feedback.warning) : undefined,
    suggestions: feedback.suggestions.map(s => suggestionTranslations[s] || s),
  };
}

// 解読時間を日本語に翻訳
function translateCrackTime(crackTime: string): string {
  const translations: { [key: string]: string } = {
    'less than a second': '1秒未満',
    'instant': '即座',
    'seconds': '数秒',
    'minutes': '数分',
    'hours': '数時間',
    'days': '数日',
    'months': '数ヶ月',
    'years': '数年',
    'centuries': '数世紀',
  };

  for (const [eng, jpn] of Object.entries(translations)) {
    if (crackTime.toLowerCase().includes(eng)) {
      return jpn;
    }
  }

  return crackTime;
}

// パスワード強度のラベル
export function getStrengthLabel(score: PasswordStrength): string {
  const labels = {
    [PasswordStrength.VERY_WEAK]: '非常に弱い',
    [PasswordStrength.WEAK]: '弱い',
    [PasswordStrength.FAIR]: '普通',
    [PasswordStrength.STRONG]: '強い',
    [PasswordStrength.VERY_STRONG]: '非常に強い',
  };
  
  return labels[score];
}

// パスワード強度の色
export function getStrengthColor(score: PasswordStrength): string {
  const colors = {
    [PasswordStrength.VERY_WEAK]: '#f44336',
    [PasswordStrength.WEAK]: '#ff9800',
    [PasswordStrength.FAIR]: '#ffeb3b',
    [PasswordStrength.STRONG]: '#8bc34a',
    [PasswordStrength.VERY_STRONG]: '#4caf50',
  };
  
  return colors[score];
}