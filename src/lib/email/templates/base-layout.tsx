// Base email layout template
import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
  Img,
} from '@react-email/components';
import { templateConfig, emailAppConfig } from '../config';

interface BaseLayoutProps {
  children: React.ReactNode;
  previewText?: string;
  title?: string;
  showFooter?: boolean;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  previewText = '',
  title,
  showFooter = true,
}) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>{emailAppConfig.appName}</Text>
            {title && <Text style={headerTitle}>{title}</Text>}
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          {showFooter && (
            <>
              <Hr style={divider} />
              <Section style={footer}>
                <Text style={footerText}>
                  このメールは {emailAppConfig.appName} から送信されました。
                </Text>
                <Text style={footerText}>
                  お問い合わせ:{' '}
                  <Link href={`mailto:${emailAppConfig.supportEmail}`} style={footerLink}>
                    {emailAppConfig.supportEmail}
                  </Link>
                </Text>
                <Text style={footerText}>
                  © {new Date().getFullYear()} {emailAppConfig.appName}. All rights reserved.
                </Text>
              </Section>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main: React.CSSProperties = {
  backgroundColor: templateConfig.colors.background,
  fontFamily: templateConfig.fonts.sans,
};

const container: React.CSSProperties = {
  backgroundColor: templateConfig.colors.white,
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: templateConfig.sizes.containerWidth,
};

const header: React.CSSProperties = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  borderBottom: `1px solid ${templateConfig.colors.border}`,
};

const logo: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: templateConfig.colors.primary,
  margin: '0',
  letterSpacing: '-0.025em',
};

const headerTitle: React.CSSProperties = {
  fontSize: '14px',
  color: templateConfig.colors.textLight,
  marginTop: '8px',
  margin: '8px 0 0 0',
};

const content: React.CSSProperties = {
  padding: '40px',
};

const divider: React.CSSProperties = {
  borderColor: templateConfig.colors.border,
  margin: '32px 40px',
};

const footer: React.CSSProperties = {
  padding: '0 40px 32px',
  textAlign: 'center' as const,
};

const footerText: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '16px',
  color: templateConfig.colors.textLight,
  margin: '4px 0',
};

const footerLink: React.CSSProperties = {
  color: templateConfig.colors.primary,
  textDecoration: 'underline',
};

export default BaseLayout;