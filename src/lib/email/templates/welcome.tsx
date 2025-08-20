// Welcome email template
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

interface WelcomeEmailProps extends EmailTemplateData {
  userName: string;
  loginUrl: string;
  features?: string[];
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName,
  loginUrl,
  features = [],
  appName = 'Board App',
  appUrl = 'https://boardapp.com',
}) => {
  const previewText = `${userName}様、${appName}へようこそ！`;

  const defaultFeatures = [
    '💬 リアルタイムディスカッション',
    '📝 簡単な投稿作成と編集',
    '👥 メンバー限定コミュニティ',
    '🔔 通知機能',
    '🔒 セキュアな環境',
  ];

  const displayFeatures = features.length > 0 ? features : defaultFeatures;

  return (
    <BaseLayout previewText={previewText} title="Welcome!">
      <Section style={heroSection}>
        <Text style={welcomeEmoji}>🎉</Text>
        <Heading style={heading}>
          {appName}へようこそ！
        </Heading>
      </Section>
      
      <Text style={paragraph}>
        こんにちは、{userName}様
      </Text>

      <Text style={paragraph}>
        {appName}への登録が完了しました！
        私たちのコミュニティの一員となっていただき、心より感謝申し上げます。
      </Text>

      <Section style={featureSection}>
        <Text style={featureTitle}>✨ {appName}でできること</Text>
        {displayFeatures.map((feature, index) => (
          <Text key={index} style={featureItem}>
            {feature}
          </Text>
        ))}
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={loginUrl}>
          今すぐ始める
        </Button>
      </Section>

      <Section style={helpSection}>
        <Text style={helpTitle}>🚀 はじめ方ガイド</Text>
        <Row>
          <Column style={stepColumn}>
            <Text style={stepNumber}>1</Text>
            <Text style={stepText}>プロフィールを設定</Text>
          </Column>
          <Column style={stepColumn}>
            <Text style={stepNumber}>2</Text>
            <Text style={stepText}>最初の投稿を作成</Text>
          </Column>
          <Column style={stepColumn}>
            <Text style={stepNumber}>3</Text>
            <Text style={stepText}>他のメンバーと交流</Text>
          </Column>
        </Row>
      </Section>

      <Section style={ctaSection}>
        <Text style={ctaText}>
          ご不明な点がございましたら、お気軽に
          <Link href={`mailto:support@boardapp.com`} style={link}>
            サポートチーム
          </Link>
          までお問い合わせください。
        </Text>
      </Section>

      <Hr style={divider} />

      <Section style={socialSection}>
        <Text style={socialTitle}>フォローして最新情報をゲット</Text>
        <Row style={socialLinks}>
          <Column style={socialColumn}>
            <Link href="#" style={socialLink}>Twitter</Link>
          </Column>
          <Column style={socialColumn}>
            <Link href="#" style={socialLink}>Facebook</Link>
          </Column>
          <Column style={socialColumn}>
            <Link href="#" style={socialLink}>LinkedIn</Link>
          </Column>
        </Row>
      </Section>

      <Text style={footerNote}>
        素晴らしい体験をお届けできることを楽しみにしています！
      </Text>
    </BaseLayout>
  );
};

// Preview component
export function WelcomeEmailPreview() {
  return (
    <WelcomeEmail
      userName="田中太郎"
      loginUrl="https://example.com/login"
      appName="Board App"
      appUrl="https://boardapp.com"
    />
  );
}

// Styles
const heroSection: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: '32px 0',
  backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: templateConfig.sizes.borderRadius,
  margin: '0 0 32px',
};

const welcomeEmoji: React.CSSProperties = {
  fontSize: '48px',
  margin: '0 0 16px',
};

const heading: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: templateConfig.colors.text,
  margin: '0',
  letterSpacing: '-0.025em',
};

const paragraph: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '24px',
  color: templateConfig.colors.text,
  margin: '16px 0',
};

const featureSection: React.CSSProperties = {
  backgroundColor: templateConfig.colors.background,
  borderRadius: templateConfig.sizes.borderRadius,
  padding: '24px',
  margin: '24px 0',
};

const featureTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: templateConfig.colors.text,
  margin: '0 0 16px',
};

const featureItem: React.CSSProperties = {
  fontSize: '15px',
  color: templateConfig.colors.text,
  margin: '12px 0',
  paddingLeft: '8px',
  lineHeight: '20px',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button: React.CSSProperties = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: templateConfig.sizes.borderRadius,
  color: templateConfig.colors.white,
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  minWidth: '200px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const helpSection: React.CSSProperties = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#faf5ff',
  borderRadius: templateConfig.sizes.borderRadius,
};

const helpTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: templateConfig.colors.text,
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const stepColumn: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: '0 16px',
};

const stepNumber: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: templateConfig.colors.primary,
  backgroundColor: templateConfig.colors.background,
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  display: 'inline-block',
  lineHeight: '48px',
  margin: '0 auto 8px',
};

const stepText: React.CSSProperties = {
  fontSize: '14px',
  color: templateConfig.colors.text,
  margin: '0',
};

const ctaSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
  padding: '16px',
  backgroundColor: '#e6fffa',
  borderRadius: templateConfig.sizes.borderRadius,
};

const ctaText: React.CSSProperties = {
  fontSize: '15px',
  color: templateConfig.colors.text,
  margin: '0',
  lineHeight: '22px',
};

const link: React.CSSProperties = {
  color: templateConfig.colors.primary,
  textDecoration: 'underline',
  fontWeight: '600',
};

const divider: React.CSSProperties = {
  borderColor: templateConfig.colors.border,
  margin: '32px 0',
};

const socialSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const socialTitle: React.CSSProperties = {
  fontSize: '14px',
  color: templateConfig.colors.textLight,
  margin: '0 0 16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const socialLinks: React.CSSProperties = {
  margin: '0 auto',
  maxWidth: '300px',
};

const socialColumn: React.CSSProperties = {
  padding: '0 12px',
};

const socialLink: React.CSSProperties = {
  color: templateConfig.colors.primary,
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
};

const footerNote: React.CSSProperties = {
  fontSize: '14px',
  color: templateConfig.colors.textLight,
  textAlign: 'center' as const,
  margin: '16px 0 0',
  fontStyle: 'italic',
};

const Hr: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', ...style }} />
);

export default WelcomeEmail;