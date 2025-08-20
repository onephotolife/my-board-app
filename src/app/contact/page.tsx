'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Alert,
  MenuItem,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import Link from 'next/link';
import { modern2025Styles } from '@/styles/modern-2025';
import { contactMetadata } from './metadata';
import ClientHeader from '@/components/ClientHeader';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: '',
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  
  // フォームのバリデーション
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'お名前を入力してください';
    } else if (formData.name.length > 50) {
      newErrors.name = 'お名前は50文字以内で入力してください';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    
    if (!formData.category) {
      newErrors.category = 'お問い合わせ種別を選択してください';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = '件名を入力してください';
    } else if (formData.subject.length > 100) {
      newErrors.subject = '件名は100文字以内で入力してください';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'お問い合わせ内容を入力してください';
    } else if (formData.message.length > contactMetadata.formConfig.maxMessageLength) {
      newErrors.message = `お問い合わせ内容は${contactMetadata.formConfig.maxMessageLength}文字以内で入力してください`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 実際のAPIエンドポイントへの送信処理
      // ここではシミュレーションとして2秒待機
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 成功時の処理
      setShowSuccess(true);
      
      // フォームをリセット
      setFormData({
        name: '',
        email: '',
        category: '',
        subject: '',
        message: '',
      });
      setErrors({});
    } catch (error) {
      // エラー時の処理
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 入力フィールドの変更ハンドラ
  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const inputStyle = {
    '& .MuiOutlinedInput-root': {
      '&:hover fieldset': {
        borderColor: modern2025Styles.colors.primary,
      },
    },
  };

  return (
    <>
      <ClientHeader />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 3, md: 5 },
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: 2,
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: modern2025Styles.colors.text.primary,
              mb: 2,
              textAlign: 'center',
            }}
          >
            お問い合わせ
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              color: modern2025Styles.colors.text.secondary,
              textAlign: 'center',
              mb: 4,
            }}
          >
            ご質問・ご要望・不具合報告など、お気軽にお問い合わせください
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            通常、2営業日以内にご返信いたします。
            お急ぎの場合は、件名に「【至急】」とご記入ください。
          </Alert>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              <TextField
                fullWidth
                label="お名前"
                value={formData.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                required
                disabled={isSubmitting}
                sx={inputStyle}
              />
              
              <TextField
                fullWidth
                label="メールアドレス"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                required
                disabled={isSubmitting}
                sx={inputStyle}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              <TextField
                fullWidth
                select
                label="お問い合わせ種別"
                value={formData.category}
                onChange={handleChange('category')}
                error={!!errors.category}
                helperText={errors.category}
                required
                disabled={isSubmitting}
                sx={inputStyle}
              >
                {contactMetadata.formConfig.categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </TextField>
              
              <TextField
                fullWidth
                label="件名"
                value={formData.subject}
                onChange={handleChange('subject')}
                error={!!errors.subject}
                helperText={errors.subject}
                required
                disabled={isSubmitting}
                sx={inputStyle}
              />
            </Box>
            
            <TextField
              fullWidth
              label="お問い合わせ内容"
              multiline
              rows={8}
              value={formData.message}
              onChange={handleChange('message')}
              error={!!errors.message}
              helperText={errors.message || `${formData.message.length}/${contactMetadata.formConfig.maxMessageLength}文字`}
              required
              disabled={isSubmitting}
              sx={{ ...inputStyle, mb: 4 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b42a0 100%)',
                  },
                  '&:disabled': {
                    opacity: 0.7,
                  },
                }}
              >
                {isSubmitting ? '送信中...' : '送信する'}
              </Button>
              
              <Button
                type="button"
                variant="outlined"
                size="large"
                disabled={isSubmitting}
                onClick={() => {
                  setFormData({
                    name: '',
                    email: '',
                    category: '',
                    subject: '',
                    message: '',
                  });
                  setErrors({});
                }}
                sx={{
                  borderColor: modern2025Styles.colors.primary,
                  color: modern2025Styles.colors.primary,
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: modern2025Styles.colors.primary,
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                  },
                }}
              >
                クリア
              </Button>
            </Box>
          </Box>
          
          <Box sx={{ mt: 6, p: 3, bgcolor: 'rgba(255, 255, 255, 0.5)', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: modern2025Styles.colors.text.primary }}>
              よくあるご質問
            </Typography>
            <Box sx={{ '& > *': { mb: 2 } }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: modern2025Styles.colors.text.primary }}>
                  Q: アカウントのパスワードを忘れました
                </Typography>
                <Typography variant="body2" sx={{ color: modern2025Styles.colors.text.secondary, mt: 0.5 }}>
                  A: ログイン画面の「パスワードを忘れた方」リンクから、パスワードリセットの手続きを行ってください。
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: modern2025Styles.colors.text.primary }}>
                  Q: 投稿が表示されません
                </Typography>
                <Typography variant="body2" sx={{ color: modern2025Styles.colors.text.secondary, mt: 0.5 }}>
                  A: ブラウザのキャッシュをクリアしてページを再読み込みしてください。問題が解決しない場合はお問い合わせください。
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: modern2025Styles.colors.text.primary }}>
                  Q: 退会したいです
                </Typography>
                <Typography variant="body2" sx={{ color: modern2025Styles.colors.text.secondary, mt: 0.5 }}>
                  A: アカウント設定ページから退会手続きを行うか、お問い合わせフォームよりご連絡ください。
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Link 
              href="/" 
              style={{ 
                color: modern2025Styles.colors.primary,
                textDecoration: 'none',
                fontSize: '1rem',
              }}
            >
              ← トップページに戻る
            </Link>
          </Box>
        </Paper>
      </Container>
      
      {/* 成功メッセージ */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          お問い合わせを受け付けました。ご連絡いただきありがとうございます。
        </Alert>
      </Snackbar>
      
      {/* エラーメッセージ */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowError(false)} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          送信中にエラーが発生しました。しばらく経ってから再度お試しください。
        </Alert>
      </Snackbar>
    </>
  );
}