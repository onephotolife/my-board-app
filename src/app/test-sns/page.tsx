import { Box, Typography, Container } from '@mui/material';

import SNSFeatureTest from '@/components/SNSFeatureTest';
import SNSIntegrationTest from '@/components/SNSIntegrationTest';

export default function TestSNSPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          SNS機能テスト
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          SNS機能の設定状態と初期化のテストページです。
        </Typography>
        <SNSFeatureTest />
        <Box sx={{ mt: 2 }}>
          <SNSIntegrationTest />
        </Box>
      </Box>
    </Container>
  );
}