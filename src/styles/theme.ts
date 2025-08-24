/**
 * 統一デザインシステムテーマ設定
 * 細部に神が宿る美しいデザインを実現
 */

import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// カスタムカラーパレット
const palette = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#dc004e',
    light: '#ff5983',
    dark: '#9a0036',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f5f7fa',
    paper: '#ffffff',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  text: {
    primary: '#2c3e50',
    secondary: '#5a6c7d',
    disabled: '#95a5a6',
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
  },
  divider: 'rgba(0, 0, 0, 0.08)',
};

// タイポグラフィ設定
const typography = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    '"Noto Sans JP"',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.01562em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.00833em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0em',
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.00735em',
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0em',
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.6,
    letterSpacing: '0.0075em',
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.75,
    letterSpacing: '0.00938em',
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
    letterSpacing: '0.01071em',
  },
  button: {
    textTransform: 'none',
    fontWeight: 500,
    letterSpacing: '0.02857em',
  },
};

// コンポーネントのデフォルトスタイル
const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        padding: '10px 24px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: 'none',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        },
      },
      containedPrimary: {
        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
        '&:hover': {
          background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      },
      elevation1: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      elevation2: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      },
      elevation3: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 12,
          transition: 'all 0.3s ease',
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.primary.main,
              borderWidth: 2,
            },
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          },
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 500,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'scale(1.05)',
        },
      },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '2px solid #fff',
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        marginBottom: 4,
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: 'rgba(0,0,0,0.04)',
        },
        '&.Mui-selected': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
        },
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(255,255,255,0.95)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: 0,
        boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 20,
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 8,
        fontSize: '0.875rem',
        padding: '8px 16px',
        backgroundColor: 'rgba(0,0,0,0.87)',
      },
    },
  },
  MuiSkeleton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        height: 6,
      },
      bar: {
        borderRadius: 4,
      },
    },
  },
};

// ブレークポイント設定
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
};

// 影の設定
const shadows = [
  'none',
  '0px 2px 4px rgba(0,0,0,0.05)',
  '0px 3px 6px rgba(0,0,0,0.07)',
  '0px 4px 8px rgba(0,0,0,0.08)',
  '0px 5px 10px rgba(0,0,0,0.09)',
  '0px 6px 12px rgba(0,0,0,0.1)',
  '0px 7px 14px rgba(0,0,0,0.11)',
  '0px 8px 16px rgba(0,0,0,0.12)',
  '0px 9px 18px rgba(0,0,0,0.13)',
  '0px 10px 20px rgba(0,0,0,0.14)',
  '0px 11px 22px rgba(0,0,0,0.15)',
  '0px 12px 24px rgba(0,0,0,0.16)',
  '0px 13px 26px rgba(0,0,0,0.17)',
  '0px 14px 28px rgba(0,0,0,0.18)',
  '0px 15px 30px rgba(0,0,0,0.19)',
  '0px 16px 32px rgba(0,0,0,0.2)',
  '0px 17px 34px rgba(0,0,0,0.21)',
  '0px 18px 36px rgba(0,0,0,0.22)',
  '0px 19px 38px rgba(0,0,0,0.23)',
  '0px 20px 40px rgba(0,0,0,0.24)',
  '0px 21px 42px rgba(0,0,0,0.25)',
  '0px 22px 44px rgba(0,0,0,0.26)',
  '0px 23px 46px rgba(0,0,0,0.27)',
  '0px 24px 48px rgba(0,0,0,0.28)',
  '0px 25px 50px rgba(0,0,0,0.29)',
];

// アニメーション設定
const transitions = {
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
};

// カスタムミックスイン
const mixins = {
  toolbar: {
    minHeight: 64,
    '@media (min-width:0px) and (orientation: landscape)': {
      minHeight: 48,
    },
    '@media (min-width:600px)': {
      minHeight: 70,
    },
  },
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },
  gradientText: {
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
};

// テーマ作成
let theme = createTheme({
  palette,
  typography,
  components,
  breakpoints,
  shadows,
  transitions,
  mixins,
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
});

// レスポンシブフォントサイズを適用
theme = responsiveFontSizes(theme);

export default theme;

// ダークモード用テーマ
export const darkTheme = createTheme({
  ...theme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrastText: '#000000',
    },
    secondary: {
      main: '#f48fb1',
      light: '#ffc1e3',
      dark: '#bf5f82',
      contrastText: '#000000',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
  },
  components: {
    ...components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(18, 18, 18, 0.95)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
        },
      },
    },
  },
});