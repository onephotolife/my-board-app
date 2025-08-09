# 📧 Email System Setup Guide

## Overview
This application uses Nodemailer with Gmail for sending transactional emails including:
- Email verification
- Password reset
- Welcome messages

## 🚀 Quick Setup

### 1. Gmail App Password Setup

1. **Enable 2-Factor Authentication**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification

2. **Generate App Password**
   - Visit [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and your device
   - Copy the generated 16-character password

### 2. Environment Variables

Update `.env.local`:

```env
# Gmail Configuration
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Your app password

# Email Settings
EMAIL_FROM="Your App <noreply@yourapp.com>"
EMAIL_REPLY_TO=support@yourapp.com
NEXT_PUBLIC_APP_NAME=Your App Name
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPPORT_EMAIL=support@yourapp.com

# Development Mode
SEND_EMAILS=false  # Set to true to send real emails in dev
```

### 3. Test Email System

```bash
# Start the development server
npm run dev

# In another terminal, run the test
node test-email.js
```

## 📝 API Usage

### Send Email Endpoint

**POST** `/api/email/send`

#### Request Body

```json
{
  "to": "user@example.com",
  "template": "verification|password-reset|welcome",
  "data": {
    "userName": "User Name",
    // Template-specific fields
  }
}
```

#### Templates

**Verification Email:**
```json
{
  "template": "verification",
  "data": {
    "userName": "田中太郎",
    "verificationUrl": "https://app.com/verify?token=xxx",
    "verificationCode": "123456" // Optional
  }
}
```

**Password Reset:**
```json
{
  "template": "password-reset",
  "data": {
    "userName": "田中太郎",
    "resetUrl": "https://app.com/reset?token=xxx",
    "resetCode": "987654", // Optional
    "expiresIn": "1時間"   // Optional
  }
}
```

**Welcome Email:**
```json
{
  "template": "welcome",
  "data": {
    "userName": "田中太郎",
    "loginUrl": "https://app.com/login",
    "features": ["Feature 1", "Feature 2"] // Optional
  }
}
```

## 🎨 Email Templates

Templates are built with React Email and located in:
- `/src/lib/email/templates/`

### Available Templates:
1. **base-layout.tsx** - Common layout wrapper
2. **verification.tsx** - Email verification template
3. **password-reset.tsx** - Password reset template
4. **welcome.tsx** - Welcome email template

### Customizing Templates

Edit template files directly. They use React components:

```tsx
import { Button, Text } from '@react-email/components';

export const CustomEmail = ({ userName }) => (
  <div>
    <Text>Hello {userName}!</Text>
    <Button href="https://example.com">Click me</Button>
  </div>
);
```

## 🔧 Configuration

### Email Service Configuration

Located in `/src/lib/email/config.ts`:

```typescript
// Colors
templateConfig.colors = {
  primary: '#667eea',
  secondary: '#764ba2',
  // ...
}

// Rate Limiting
rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxEmailsPerWindow: 5,
}
```

## 🛡️ Security Features

### Rate Limiting
- **Per Email**: 5 emails per 15 minutes
- **Per API**: 10 requests per minute

### Email Validation
- Zod schema validation
- Email format verification
- Required field checking

### Error Handling
- Graceful fallbacks
- Detailed error messages
- Type-safe error codes

## 🐛 Troubleshooting

### Common Issues

**"Invalid credentials" error:**
- Verify 2FA is enabled on Gmail
- Check app password is correct
- Ensure no spaces in app password

**"Rate limit exceeded":**
- Wait for rate limit window to reset
- Check rate limit configuration

**Emails not sending in development:**
- Set `SEND_EMAILS=true` in `.env.local`
- Check console for email previews

### Debug Mode

Enable detailed logging:

```typescript
// In mailer.ts
console.log('Email Debug:', {
  to: options.to,
  subject: options.subject,
  html: options.html,
});
```

## 📚 Integration Examples

### User Registration

```typescript
// In your registration handler
import { getEmailService } from '@/lib/email/mailer';

const emailService = getEmailService();
await emailService.sendVerificationEmail(user.email, {
  userName: user.name,
  verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`,
});
```

### Password Reset

```typescript
// In password reset handler
await emailService.sendPasswordResetEmail(user.email, {
  userName: user.name,
  resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset?token=${token}`,
  expiresIn: '1時間',
});
```

## 🚀 Production Deployment

### Recommended Services
1. **Gmail** (current) - Good for <500 emails/day
2. **SendGrid** - For higher volume
3. **AWS SES** - For cost-effective scaling
4. **Resend** - Modern alternative

### Production Checklist
- [ ] Use production email service
- [ ] Set up SPF/DKIM/DMARC records
- [ ] Configure proper FROM address
- [ ] Enable email tracking
- [ ] Set up bounce handling
- [ ] Monitor delivery rates

## 📊 Monitoring

### Email Metrics to Track
- Delivery rate
- Open rate
- Click rate
- Bounce rate
- Spam complaints

### Logging
All email sends are logged with:
- Timestamp
- Recipient
- Template type
- Success/failure status
- Message ID

## 🤝 Support

For issues or questions:
- Check console logs in development
- Review error messages
- Verify environment variables
- Test with `test-email.js`

---

**Note**: Never commit real email credentials to version control. Always use environment variables.