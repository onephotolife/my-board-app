// プロフィール関連のバリデーション

export const profileValidation = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Zぁ-んァ-ヶー一-龯々〆〤\s]+$/,
    messages: {
      required: '名前は必須です',
      minLength: '名前を入力してください',
      maxLength: '名前は50文字以内で入力してください',
      pattern: '使用できない文字が含まれています',
    },
  },
  bio: {
    required: false,
    maxLength: 200,
    messages: {
      maxLength: '自己紹介は200文字以内で入力してください',
    },
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 100,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    messages: {
      required: 'パスワードは必須です',
      minLength: 'パスワードは8文字以上である必要があります',
      maxLength: 'パスワードは100文字以内で入力してください',
      pattern: 'パスワードは大文字、小文字、数字、特殊文字を含む必要があります',
    },
  },
};

// 名前のバリデーション
export function validateName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: profileValidation.name.messages.required };
  }
  
  if (name.length > profileValidation.name.maxLength) {
    return { isValid: false, error: profileValidation.name.messages.maxLength };
  }
  
  return { isValid: true };
}

// 自己紹介のバリデーション
export function validateBio(bio: string): { isValid: boolean; error?: string } {
  if (bio && bio.length > profileValidation.bio.maxLength) {
    return { isValid: false, error: profileValidation.bio.messages.maxLength };
  }
  
  return { isValid: true };
}

// パスワードのバリデーション
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: profileValidation.password.messages.required };
  }
  
  if (password.length < profileValidation.password.minLength) {
    return { isValid: false, error: profileValidation.password.messages.minLength };
  }
  
  if (password.length > profileValidation.password.maxLength) {
    return { isValid: false, error: profileValidation.password.messages.maxLength };
  }
  
  if (!profileValidation.password.pattern.test(password)) {
    return { isValid: false, error: profileValidation.password.messages.pattern };
  }
  
  return { isValid: true };
}

// パスワード確認のバリデーション
export function validatePasswordConfirm(password: string, confirmPassword: string): { 
  isValid: boolean; 
  error?: string 
} {
  if (password !== confirmPassword) {
    return { isValid: false, error: 'パスワードが一致しません' };
  }
  
  return { isValid: true };
}

// XSS対策のためのサニタイゼーション
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}