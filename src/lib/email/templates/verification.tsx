// Email verification template
import * as React from 'react';
import {
  Button,
  Heading,
  Text,
  Link,
  Section,
  Row,
  Column,
} from '@react-email/components';
import BaseLayout from './base-layout';
import { templateConfig } from '../config';
import { EmailTemplateData } from '@/types/email';

interface VerificationEmailProps extends EmailTemplateData {
  userName: string;
  verificationUrl: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
  userName,
  verificationUrl,
  appName = 'Board App',
}) => {
  const previewText = `${userName}様、メールアドレスを確認してください`;

  return (
    <BaseLayout previewText={previewText} title="メールアドレスの確認">
      <Heading style={heading}>
        こんにちは、{userName}様
      </Heading>
      
      <Text style={paragraph}>
        {appName}へのご登録ありがとうございます。
        以下のボタンをクリックして、メールアドレスを確認してください。
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={verificationUrl}>
          メールアドレスを確認
        </Button>
      </Section>

      <Text style={paragraph}>
        このリンクは24時間有効です。期限が切れた場合は、
        再度サインアップしてください。
      </Text>

      <Section style={noteContainer}>
        <Text style={noteText}>
          ボタンが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください：
        </Text>
        <Link href={verificationUrl} style={link}>
          {verificationUrl}
        </Link>
      </Section>

      <Hr style={divider} />

      <Text style={footerNote}>
        このメールに心当たりがない場合は、無視してください。
        あなたのアカウントは作成されません。
      </Text>
    </BaseLayout>
  );
};

// Component for rendering (for testing/preview)
export function VerificationEmailPreview() {
  return (
    <VerificationEmail
      userName="田中太郎"
      verificationUrl="https://example.com/verify?token=abc123"
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

const button: React.CSSProperties = {
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
};

const codeContainer: React.CSSProperties = {
  backgroundColor: templateConfig.colors.background,
  borderRadius: templateConfig.sizes.borderRadius,
  padding: '24px',
  textAlign: 'center' as const,
  margin: '24px 0',
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
  color: templateConfig.colors.primary,
  letterSpacing: '0.1em',
  margin: '0',
  fontFamily: 'monospace',
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

const footerNote: React.CSSProperties = {
  fontSize: '14px',
  color: templateConfig.colors.textLight,
  textAlign: 'center' as const,
  margin: '16px 0 0',
};

const Hr: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', ...style }} />
);

export default VerificationEmail;