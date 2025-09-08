'use client';

import { Box, Container, Typography, IconButton, Badge } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

export default function TagLocalHeader({ title = '会員制掲示板' }: { title?: string }) {
  return (
    <Box
      id="tag-local-header"
      sx={{
        bgcolor: 'background.paper',
        borderBottom: (t) => `1px solid ${t.palette.divider}`,
        mb: 2,
      }}
      data-testid="tag-local-header"
    >
      <Container maxWidth={false} disableGutters>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}
        >
          <Box>
            <Typography variant="h4" component="h4" gutterBottom sx={{ mb: 0 }}>
              {title}
            </Typography>
          </Box>
          <Box>
            <IconButton aria-label="通知">
              <Badge color="error" badgeContent={0}>
                <NotificationsNoneIcon />
              </Badge>
            </IconButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
