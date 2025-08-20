// Password reset email template
import * as React from 'react';
import {
  Button,
  Heading,
  Text,
  Link,
  Section,
} from '@react-email/components';
import BaseLayout from './base-layout';
import { templateConfig } from '../config';
import { EmailTemplateData } from '@/types/email';

interface PasswordResetEmailProps extends EmailTemplateData {
  userName: string;
  resetUrl: string;
  expiresIn?: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  userName,
  resetUrl,
  expiresIn = '1時間',
  appName = 'Board App',
}) => {
  const previewText = `${userName}様、パスワードリセットのリクエストを受け付けました`;

  return (
    <BaseLayout previewText={previewText} title="パスワードリセット">
      <Heading style={heading}>
        パスワードリセットのご案内
      </Heading>
      
      <Text style={paragraph}>
        こんにちは、{userName}様
      </Text>

      <Text style={paragraph}>
        {appName}アカウントのパスワードリセットリクエストを受け付けました。
        以下のボタンをクリックして、新しいパスワードを設定してください。
      </Text>

      <Section style={buttonContainer}>
        <a href={resetUrl} style={buttonLink}>
          パスワードをリセット
        </a>
      </Section>

      <Section style={warningContainer}>
        <Text style={warningTitle}>⚠️ 重要なお知らせ</Text>
        <Text style={warningText}>
          このリンクは{expiresIn}のみ有効です。
          期限が切れた場合は、再度パスワードリセットをリクエストしてください。
        </Text>
      </Section>

      <Text style={paragraph}>
        セキュリティ上の理由から、このメールには現在のパスワードは記載されていません。
      </Text>

      <Section style={noteContainer}>
        <Text style={noteText}>
          ボタンが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください：
        </Text>
        <Link href={resetUrl} style={link}>
          {resetUrl}
        </Link>
      </Section>

      <Hr style={divider} />

      <Section style={securityNote}>
        <Text style={securityTitle}>🔒 セキュリティに関する注意</Text>
        <Text style={footerNote}>
          このパスワードリセットをリクエストしていない場合は、
          誰かがあなたのメールアドレスを入力した可能性があります。
          アカウントは安全ですが、心配な場合はサポートまでご連絡ください。
        </Text>
      </Section>
    </BaseLayout>
  );
};

// Preview component
export function PasswordResetEmailPreview() {
  return (
    <PasswordResetEmail
      userName="田中太郎"
      resetUrl="https://example.com/reset-password?token=xyz789"
      expiresIn="1時間"
      appName="Board App"
    />
  );
}

// Styles
const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: templateConfig.colors.text,
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const paragraph: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  color: templateConfig.colors.text,
  margin: '16px 0',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const buttonLink: React.CSSProperties = {
  backgroundColor: templateConfig.colors.primary,
  borderRadius: templateConfig.sizes.borderRadius,
  color: templateConfig.colors.white,
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: templateConfig.sizes.buttonPadding,
  minWidth: '200px',
  cursor: 'pointer',
};

const button: React.CSSProperties = {
  backgroundColor: templateConfig.colors.error,
  borderRadius: templateConfig.sizes.borderRadius,
  color: templateConfig.colors.white,
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: templateConfig.sizes.buttonPadding,
  minWidth: '200px',
};

const codeContainer: React.CSSProperties = {
  backgroundColor: templateConfig.colors.background,
  borderRadius: templateConfig.sizes.borderRadius,
  padding: '24px',
  textAlign: 'center' as const,
  margin: '24px 0',
  border: `2px dashed ${templateConfig.colors.border}`,
};

const codeLabel: React.CSSProperties = {
  fontSize: '12px',
  color: templateConfig.colors.textLight,
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const codeText: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: templateConfig.colors.error,
  letterSpacing: '0.1em',
  margin: '0',
  fontFamily: 'monospace',
};

const warningContainer: React.CSSProperties = {
  backgroundColor: '#fff5f5',
  borderLeft: `4px solid ${templateConfig.colors.error}`,
  borderRadius: templateConfig.sizes.borderRadius,
  padding: '16px',
  margin: '24px 0',
};

const warningTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: templateConfig.colors.error,
  margin: '0 0 8px',
};

const warningText: React.CSSProperties = {
  fontSize: '14px',
  color: templateConfig.colors.text,
  margin: '0',
  lineHeight: '20px',
};

const noteContainer: React.CSSProperties = {
  backgroundColor: templateConfig.colors.background,
  borderRadius: templateConfig.sizes.borderRadius,
  padding: '16px',
  margin: '24px 0',
};

const noteText: React.CSSProperties = {
  fontSize: '14px',
  color: templateConfig.colors.textLight,
  margin: '0 0 8px',
};

const link: React.CSSProperties = {
  color: templateConfig.colors.primary,
  fontSize: '14px',
  wordBreak: 'break-all' as const,
};

const divider: React.CSSProperties = {
  borderColor: templateConfig.colors.border,
  margin: '32px 0',
};

const securityNote: React.CSSProperties = {
  backgroundColor: '#f0f9ff',
  borderRadius: templateConfig.sizes.borderRadius,
  padding: '16px',
  margin: '16px 0',
};

const securityTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: templateConfig.colors.primary,
  margin: '0 0 8px',
};

const footerNote: React.CSSProperties = {
  fontSize: '14px',
  color: templateConfig.colors.textLight,
  margin: '0',
  lineHeight: '20px',
};

const Hr: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', ...style }} />
);

export default PasswordResetEmail;