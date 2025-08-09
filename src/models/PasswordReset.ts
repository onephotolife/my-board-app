import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IPasswordReset extends Document {
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
  generateSecureToken(): string;
  isExpired(): boolean;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true, // For faster lookups
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true, // For faster token verification
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index for automatic cleanup
    },
    used: {
      type: Boolean,
      default: false,
      index: true, // For filtering unused tokens
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false }, // Only track creation time
  }
);

// Security Expert: Generate cryptographically secure token
PasswordResetSchema.methods.generateSecureToken = function(): string {
  // Generate 32 random bytes and convert to hex (64 characters)
  // This provides 256 bits of entropy, making brute force attacks infeasible
  const buffer = crypto.randomBytes(32);
  return buffer.toString('hex');
};

// Utility method to check if token is expired
PasswordResetSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

// Pre-save middleware to generate token and set expiration
PasswordResetSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Generate secure token if not already set
    if (!this.token) {
      this.token = this.generateSecureToken();
    }
    
    // Set expiration to 1 hour from now if not already set
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    }
  }
  next();
});

// Compound index for efficient queries
PasswordResetSchema.index({ email: 1, used: 1, expiresAt: 1 });

// Performance Expert: Remove old unused tokens periodically
PasswordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24 hours cleanup

// Security Expert: Prevent timing attacks by adding a method to safely compare tokens
PasswordResetSchema.methods.compareToken = function(candidateToken: string): boolean {
  // Use crypto.timingSafeEqual to prevent timing attacks
  if (!candidateToken || candidateToken.length !== this.token.length) {
    return false;
  }
  
  try {
    const candidateBuffer = Buffer.from(candidateToken, 'hex');
    const tokenBuffer = Buffer.from(this.token, 'hex');
    return crypto.timingSafeEqual(candidateBuffer, tokenBuffer);
  } catch {
    return false;
  }
};

export default mongoose.models.PasswordReset || mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);