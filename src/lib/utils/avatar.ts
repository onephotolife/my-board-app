// アバター関連のユーティリティ

// 名前から頭文字を生成
export function generateInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // 1単語の場合は最初の2文字
    const word = parts[0];
    if (word.length === 1) return word.toUpperCase();
    
    // 日本語の場合は最初の1文字
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word)) {
      return word.substring(0, 1);
    }
    
    // 英語の場合は最初の2文字
    return word.substring(0, 2).toUpperCase();
  }
  
  // 複数単語の場合は各単語の頭文字（最大2文字）
  const initials = parts
    .map(part => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
    
  return initials;
}

// アバターの背景色を生成（名前に基づいた一貫性のある色）
export function generateAvatarColor(name: string): string {
  if (!name) return '#9CA3AF'; // デフォルトのグレー
  
  // 名前からハッシュ値を生成
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // 色のパレット（Material Design colors）
  const colors = [
    '#F44336', // Red
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#673AB7', // Deep Purple
    '#3F51B5', // Indigo
    '#2196F3', // Blue
    '#03A9F4', // Light Blue
    '#00BCD4', // Cyan
    '#009688', // Teal
    '#4CAF50', // Green
    '#8BC34A', // Light Green
    '#CDDC39', // Lime
    '#FFC107', // Amber
    '#FF9800', // Orange
    '#FF5722', // Deep Orange
    '#795548', // Brown
  ];
  
  // ハッシュ値を使って色を選択
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// アバターのテキスト色を背景色に基づいて決定
export function getContrastTextColor(backgroundColor: string): string {
  // 背景色をRGBに変換
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 輝度を計算
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // 輝度に基づいてテキスト色を決定
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// アバターデータを生成
export interface AvatarData {
  initials: string;
  backgroundColor: string;
  textColor: string;
}

export function generateAvatarData(name: string): AvatarData {
  const initials = generateInitials(name);
  const backgroundColor = generateAvatarColor(name);
  const textColor = getContrastTextColor(backgroundColor);
  
  return {
    initials,
    backgroundColor,
    textColor,
  };
}