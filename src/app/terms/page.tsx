'use client';

import { Container, Typography, Paper, Box, Divider, Alert } from '@mui/material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { modern2025Styles } from '@/styles/modern-2025';
import ClientHeader from '@/components/ClientHeader';
import AppLayout from '@/components/AppLayout';

import { termsMetadata } from './metadata';

export default function TermsPage() {
  // 最終更新日時をフォーマット
  const lastUpdatedDate = new Date(termsMetadata.lastUpdated);
  const establishedDate = new Date(termsMetadata.establishedDate);
  
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

  const subHeadingStyle: React.CSSProperties = {
    color: modern2025Styles.colors.text.primary,
    marginTop: '1.5rem',
    marginBottom: '0.75rem',
    fontWeight: 500,
  };

  const { data: session } = useSession();

  const content = (
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
            利用規約
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            本利用規約は、会員制掲示板のご利用にあたって重要な内容を含んでいます。
            サービスをご利用される前に、必ず全文をお読みください。
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" style={paragraphStyle}>
              この利用規約（以下、「本規約」といいます）は、会員制掲示板（以下、「当サービス」といいます）の
              利用条件を定めるものです。登録ユーザーの皆様（以下、「ユーザー」といいます）には、
              本規約に従って当サービスをご利用いただきます。
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第1条（適用）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              本規約は、ユーザーと当サービス運営者との間の当サービスの利用に関わる
              一切の関係に適用されるものとします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは本規約のほか、ご利用にあたってのルール等、各種の定め
              （以下、「個別規定」といいます）をすることがあります。
              これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第2条（利用登録）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              登録希望者が当サービスの定める方法によって利用登録を申請し、
              当サービスがこれを承認することによって、利用登録が完了するものとします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、利用登録の申請者に以下の事由があると判断した場合、
              利用登録の申請を承認しないことがあります：
            </Typography>
            <ul style={listStyle}>
              <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
              <li>本規約に違反したことがある者からの申請である場合</li>
              <li>未成年者、成年被後見人、被保佐人または被補助人のいずれかであり、法定代理人、後見人、保佐人または補助人の同意等を得ていない場合</li>
              <li>反社会的勢力等との関係を有する場合</li>
              <li>その他、当サービスが利用登録を相当でないと判断した場合</li>
            </ul>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第3条（ユーザーIDおよびパスワードの管理）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーは、自己の責任において、当サービスのユーザーIDおよびパスワードを
              適切に管理するものとします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡
              または貸与し、もしくは第三者と共用することはできません。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、
              そのユーザーIDを登録しているユーザー自身による利用とみなします。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第4条（禁止事項）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません：
            </Typography>
            <ul style={listStyle}>
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当サービスの内容等、当サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
              <li>他のユーザー、第三者の権利を侵害する行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>不正アクセスをし、またはこれを試みる行為</li>
              <li>当サービスによって得られた情報を商業的に利用する行為</li>
              <li>当サービスの運営を妨害するおそれのある行為</li>
              <li>不正な目的を持って当サービスを利用する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>誹謗中傷、差別的表現、わいせつな内容を投稿する行為</li>
              <li>スパム行為、過度な宣伝行為</li>
              <li>マルウェア、ウイルス等の有害なプログラムを送信する行為</li>
              <li>その他、当サービスが不適切と判断する行為</li>
            </ul>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第5条（投稿内容の取扱い）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーは、当サービスに投稿した内容について、自らが投稿することについての
              適法な権利を有していること、および投稿内容が第三者の権利を侵害していないことを
              保証するものとします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーが当サービスに投稿した内容の著作権は、ユーザーに帰属します。
              ただし、当サービスは、投稿された内容を、当サービスの運営、改善、宣伝等の
              目的で、必要な範囲で利用できるものとします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、ユーザーが投稿した内容について、本規約に違反すると判断した場合、
              事前の通知なく削除することができるものとします。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第6条（本サービスの提供の停止等）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、以下のいずれかの事由があると判断した場合、ユーザーに事前に
              通知することなく本サービスの全部または一部の提供を停止または中断することができます：
            </Typography>
            <ul style={listStyle}>
              <li>当サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により、当サービスの提供が困難となった場合</li>
              <li>コンピュータまたは通信回線等が事故により停止した場合</li>
              <li>その他、当サービスの提供が困難と判断した場合</li>
            </ul>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第7条（利用制限および登録抹消）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、
              ユーザーに対して、当サービスの全部もしくは一部の利用を制限し、
              またはユーザーとしての登録を抹消することができます：
            </Typography>
            <ul style={listStyle}>
              <li>本規約のいずれかの条項に違反した場合</li>
              <li>登録事項に虚偽の事実があることが判明した場合</li>
              <li>料金等の支払債務の不履行があった場合</li>
              <li>当サービスからの連絡に対し、一定期間返答がない場合</li>
              <li>当サービスについて、最終の利用から一定期間利用がない場合</li>
              <li>その他、当サービスが利用を適当でないと判断した場合</li>
            </ul>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第8条（退会）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーは、当サービスの定める退会手続により、当サービスから退会できるものとします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              退会後、ユーザーの投稿内容は、他のユーザーへの影響を考慮し、
              原則として削除されないものとします。ただし、ユーザーからの削除要請があった場合、
              当サービスは個別に対応を検討します。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第9条（保証の否認および免責事項）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、
              完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、
              エラーやバグ、権利侵害などを含みます）がないことを明示的にも黙示的にも保証しておりません。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において
              生じた取引、連絡または紛争等について一切責任を負いません。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、ユーザーが投稿した内容の正確性、信頼性、有用性について
              一切保証しません。ユーザーは、他のユーザーの投稿内容を自己の責任で
              利用するものとします。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第10条（サービス内容の変更等）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、ユーザーに通知することなく、本サービスの内容を変更し
              または本サービスの提供を中止することができるものとし、
              これによってユーザーに生じた損害について一切の責任を負いません。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第11条（利用規約の変更）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスが本規約を変更する場合、変更後の利用規約の施行時期および内容を
              当サービスのウェブサイト上での表示その他の適切な方法により周知し、
              またはユーザーに通知します。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              変更後の利用規約は、当サービスが別途定める場合を除いて、
              当サービスのウェブサイト上に表示した時点より効力を生じるものとします。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第12条（個人情報の取扱い）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              当サービスは、本サービスの利用によって取得する個人情報については、
              当サービスの「プライバシーポリシー」に従い適切に取り扱うものとします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              プライバシーポリシーは
              <Link href="/privacy" style={{ color: modern2025Styles.colors.primary, marginLeft: '0.5rem' }}>
                こちら
              </Link>
              からご確認ください。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第13条（通知または連絡）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーと当サービスとの間の通知または連絡は、当サービスの定める方法によって
              行うものとします。当サービスは、ユーザーから、当サービスが別途定める方式に
              従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして
              当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第14条（権利義務の譲渡の禁止）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              ユーザーは、当サービスの書面による事前の承諾なく、利用契約上の地位または
              本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
            </Typography>
          </Box>

          <Box style={sectionStyle}>
            <Typography variant="h5" component="h2" style={headingStyle}>
              第15条（準拠法・裁判管轄）
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              本規約の解釈にあたっては、日本法を準拠法とします。
            </Typography>
            <Typography variant="body1" style={paragraphStyle}>
              本サービスに関して紛争が生じた場合には、当サービスの運営者の所在地を
              管轄する裁判所を専属的合意管轄とします。
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
              バージョン: {termsMetadata.version}
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
  );

  return session ? (
    <AppLayout>{content}</AppLayout>
  ) : (
    <>
      <ClientHeader />
      {content}
    </>
  );
}