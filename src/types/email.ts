// Email types and interfaces

export type EmailType = 'verification' | 'password-reset' | 'welcome';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailTemplate {
  subject: string;
  previewText?: string;
  html: string;
  text?: string;
}

export interface SendEmailParams {
  to: string;
  template: EmailType;
  data: EmailTemplateData;
}

export interface EmailTemplateData {
  // Common fields
  userName?: string;
  appName?: string;
  appUrl?: string;
  supportEmail?: string;
  
  // Verification email
  verificationUrl?: string;
  verificationCode?: string;
  
  // Password reset
  resetUrl?: string;
  resetCode?: string;
  expiresIn?: string;
  
  // Welcome email
  loginUrl?: string;
  features?: string[];
  
  // Additional dynamic data
  [key: string]: any;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export interface EmailRateLimit {
  email: string;
  count: number;
  windowStart: Date;
  blockedUntil?: Date;
}

export enum EmailErrorType {
  INVALID_CONFIG = 'INVALID_CONFIG',
  SEND_FAILED = 'SEND_FAILED',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
}

export class EmailError extends Error {
  constructor(
    public type: EmailErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'EmailError';
  }
}