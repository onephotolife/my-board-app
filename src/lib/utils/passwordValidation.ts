// Password Strength Validation Utility - 2025 Best Practices
// Validation Expert & Security Expert collaboration

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-10 scale
  strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    noRepeatingChars: boolean;
    noSequentialChars: boolean;
    noCommonPatterns: boolean;
    goodEntropy: boolean;
  };
}

// Common weak passwords and patterns (Security Expert)
const COMMON_WEAK_PATTERNS = [
  // Sequential patterns
  /012|123|234|345|456|567|678|789|890/g,
  /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/gi,
  
  // Keyboard patterns
  /qwert|asdf|zxcv|qazw|wsx|edc/gi,
  
  // Common words
  /password|passwd|admin|user|login|welcome|ninja|dragon|master|hello|world/gi,
  
  // Date patterns
  /19[0-9]{2}|20[0-9]{2}/g, // Years
  /0[1-9]|1[0-2]/g, // Months
  
  // Repeating patterns
  /(.)\1{3,}/g, // Same character 4+ times
  /(..)\1{2,}/g, // Same 2-char pattern repeated
  /(abc){2,}|(123){2,}/gi, // Repeated simple sequences
];

// Calculate character set entropy
function calculateEntropy(password: string): number {
  const charSets = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digits: /[0-9]/.test(password),
    specialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
    extendedSpecial: /[À-ÿ]/.test(password), // Extended ASCII
  };

  let charsetSize = 0;
  if (charSets.lowercase) charsetSize += 26;
  if (charSets.uppercase) charsetSize += 26;
  if (charSets.digits) charsetSize += 10;
  if (charSets.specialChars) charsetSize += 32;
  if (charSets.extendedSpecial) charsetSize += 96;

  return password.length * Math.log2(charsetSize);
}

// Check for common substitutions (Performance Expert: optimized checks)
function hasCommonSubstitutions(password: string): boolean {
  const substitutionPattern = /[@4aA]|[30eE]|[!1iI]|[50sS]|[70tT]/g;
  const matches = password.match(substitutionPattern);
  return matches ? matches.length > 2 : false;
}

// Main password validation function
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Basic requirements checking
  const requirements = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumbers: /[0-9]/.test(password),
    hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
    noRepeatingChars: !/(.)(\1){2,}/.test(password),
    noSequentialChars: !COMMON_WEAK_PATTERNS.slice(0, 2).some(pattern => pattern.test(password)),
    noCommonPatterns: !COMMON_WEAK_PATTERNS.slice(2).some(pattern => pattern.test(password)),
    goodEntropy: false, // Will be calculated below
  };

  // Length scoring (0-3 points)
  if (requirements.minLength) {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
  } else {
    feedback.push(`パスワードは8文字以上である必要があります（現在: ${password.length}文字）`);
  }

  // Character variety scoring (0-4 points)
  if (requirements.hasLowercase) score += 1;
  else feedback.push('小文字を含めてください');

  if (requirements.hasUppercase) score += 1;
  else feedback.push('大文字を含めてください');

  if (requirements.hasNumbers) score += 1;
  else feedback.push('数字を含めてください');

  if (requirements.hasSpecialChars) score += 1;
  else feedback.push('特殊文字（!@#$%^&*など）を含めてください');

  // Pattern analysis (0-2 points)
  if (requirements.noRepeatingChars) {
    score += 1;
  } else {
    feedback.push('同じ文字を3回以上連続して使用しないでください');
  }

  if (requirements.noSequentialChars && requirements.noCommonPatterns) {
    score += 1;
  } else {
    if (!requirements.noSequentialChars) {
      feedback.push('連続した文字列（123、abc など）は避けてください');
    }
    if (!requirements.noCommonPatterns) {
      feedback.push('一般的なパスワード、キーボードパターンは避けてください');
    }
  }

  // Entropy analysis (0-1 point)
  const entropy = calculateEntropy(password);
  requirements.goodEntropy = entropy >= 40; // Minimum acceptable entropy for 2025
  
  if (requirements.goodEntropy) {
    score += 1;
  } else {
    feedback.push('より多様な文字の組み合わせを使用してください');
  }

  // Additional security checks for 2025
  const uniqueCharRatio = new Set(password).size / password.length;
  if (uniqueCharRatio < 0.7) {
    feedback.push('文字の重複を減らしてください');
  }

  // Check for common substitution patterns
  if (hasCommonSubstitutions(password) && password.length < 12) {
    feedback.push('単純な文字置換（@=a、3=e など）だけでなく、より複雑なパスワードを作成してください');
  }

  // Determine strength level
  let strength: PasswordStrengthResult['strength'];
  if (score <= 2) strength = 'Very Weak';
  else if (score <= 4) strength = 'Weak';
  else if (score <= 6) strength = 'Fair';
  else if (score <= 8) strength = 'Good';
  else if (score === 9) strength = 'Strong';
  else strength = 'Very Strong';

  // UX Designer: Provide positive feedback for good passwords
  if (score >= 7) {
    feedback.unshift('良好なパスワード強度です！');
  }

  return {
    isValid: score >= 6 && requirements.minLength, // Minimum requirements for 2025
    score: Math.min(score, 10),
    strength,
    feedback,
    requirements,
  };
}

// Real-time password strength checker for UI components
export function getPasswordStrengthColor(strength: PasswordStrengthResult['strength']): string {
  switch (strength) {
    case 'Very Weak': return '#ef4444'; // Red
    case 'Weak': return '#f97316'; // Orange
    case 'Fair': return '#eab308'; // Yellow
    case 'Good': return '#22c55e'; // Green
    case 'Strong': return '#16a34a'; // Dark Green
    case 'Very Strong': return '#15803d'; // Very Dark Green
    default: return '#6b7280'; // Gray
  }
}

// Password strength meter configuration for UI
export function getPasswordStrengthConfig(result: PasswordStrengthResult) {
  return {
    percentage: (result.score / 10) * 100,
    color: getPasswordStrengthColor(result.strength),
    label: result.strength,
    showMeter: true,
  };
}

// Validation for confirm password
export function validatePasswordMatch(password: string, confirmPassword: string): {
  isValid: boolean;
  error?: string;
} {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: 'パスワードの確認を入力してください',
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'パスワードが一致しません',
    };
  }

  return { isValid: true };
}

// Export utility for checking if password meets basic requirements
export function meetsBasicRequirements(password: string): boolean {
  return password.length >= 8 &&
         /[a-z]/.test(password) &&
         /[A-Z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
}