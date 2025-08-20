'use client';

import { Container, Typography, Paper, Box, Divider } from '@mui/material';
import Link from 'next/link';
import { modern2025Styles } from '@/styles/modern-2025';
import { privacyMetadata } from './metadata';
import ClientHeader from '@/components/ClientHeader';

export default function PrivacyPage() {
  // 最終更新日時をフォーマット
  const lastUpdatedDate = new Date(privacyMetadata.lastUpdated);
  const establishedDate = new Date(privacyMetadata.establishedDate);
  const sectionStyle: React.CSSProperties = {
    marginBottom: '2rem',
  };

  const headingStyle: React.CSSProperties = {
    color: modern2025Styles.colors.text.primary,
    marginBottom: '1rem',
    fontWeight: 600,
  };

  const paragraphStyle: React.CSSProperties = {
    color: modern2025Styles.colors.text.secondary,
    lineHeight: 1.8,
    marginBottom: '1rem',
  };

  const listStyle: React.CSSProperties = {
    color: modern2025Styles.colors.text.secondary,
    lineHeight: 1.8,
    paddingLeft: '1.5rem',
    marginBottom: '1rem',
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
            mb: 4,
            textAlign: 'center',
          }}
        >
          プライバシーポリシー
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" style={paragraphStyle}>
            会員制掲示板（以下、「当サービス」といいます）は、ユーザーの皆様の個人情報の保護に努めています。
            本プライバシーポリシーは、当サービスがどのような個人情報を収集し、どのように利用・管理するかについて説明します。
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            1. 収集する情報
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            当サービスでは、以下の情報を収集することがあります：
          </Typography>
          <ul style={listStyle}>
            <li>アカウント情報（氏名、メールアドレス）</li>
            <li>プロフィール情報（表示名、自己紹介文）</li>
            <li>投稿内容およびコメント</li>
            <li>ログイン情報（IPアドレス、ブラウザ情報）</li>
            <li>Cookieおよびセッション情報</li>
          </ul>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            2. 情報の利用目的
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            収集した情報は、以下の目的で利用されます：
          </Typography>
          <ul style={listStyle}>
            <li>サービスの提供および運営</li>
            <li>ユーザー認証およびアカウント管理</li>
            <li>コンテンツの表示および配信</li>
            <li>サービスの改善および新機能の開発</li>
            <li>不正利用の防止およびセキュリティの確保</li>
            <li>法令に基づく対応</li>
          </ul>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            3. 情報の管理
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            当サービスは、収集した個人情報を適切に管理し、以下の措置を講じています：
          </Typography>
          <ul style={listStyle}>
            <li>SSL/TLS暗号化通信の使用</li>
            <li>アクセス権限の適切な管理</li>
            <li>定期的なセキュリティ監査の実施</li>
            <li>従業員への個人情報保護教育</li>
          </ul>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            4. 第三者への提供
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            当サービスは、以下の場合を除き、個人情報を第三者に提供することはありません：
          </Typography>
          <ul style={listStyle}>
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく開示要請がある場合</li>
            <li>人の生命、身体または財産の保護のために必要な場合</li>
            <li>サービスの運営に必要な範囲で業務委託先に提供する場合</li>
          </ul>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            5. Cookieの使用
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            当サービスでは、より良いサービス提供のためにCookieを使用しています。
            Cookieは、ユーザーのログイン状態の維持、セキュリティの確保、
            サービスの利用状況の分析などに使用されます。
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            ブラウザの設定により、Cookieの受け入れを拒否することができますが、
            その場合、サービスの一部機能が利用できなくなる可能性があります。
          </Typography>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            6. データの保存期間
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            個人情報は、サービス提供に必要な期間に限り保存されます。
            アカウントを削除した場合、関連する個人情報は適切に削除されますが、
            法令により保存が義務付けられている情報については、
            定められた期間保存されます。
          </Typography>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            7. ユーザーの権利
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            ユーザーは、自己の個人情報について以下の権利を有します：
          </Typography>
          <ul style={listStyle}>
            <li>個人情報の開示請求</li>
            <li>個人情報の訂正・追加・削除の請求</li>
            <li>個人情報の利用停止の請求</li>
            <li>個人情報の第三者提供の停止請求</li>
          </ul>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            8. 未成年者の利用について
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            未成年者が当サービスを利用する場合は、保護者の同意を得た上で利用してください。
            未成年者の個人情報については、特に慎重に取り扱います。
          </Typography>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            9. プライバシーポリシーの変更
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。
            重要な変更がある場合は、サービス内での通知またはメールにてお知らせします。
          </Typography>
        </Box>

        <Box style={sectionStyle}>
          <Typography variant="h5" component="h2" style={headingStyle}>
            10. お問い合わせ
          </Typography>
          <Typography variant="body1" style={paragraphStyle}>
            本プライバシーポリシーに関するご質問やご意見は、
            <Link href="/contact" style={{ color: modern2025Styles.colors.primary, marginLeft: '0.5rem' }}>
              お問い合わせページ
            </Link>
            よりご連絡ください。
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            最終更新日: {lastUpdatedDate.toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            制定日: {establishedDate.toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric'
            })}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            バージョン: {privacyMetadata.version}
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
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
    </>
  );
}