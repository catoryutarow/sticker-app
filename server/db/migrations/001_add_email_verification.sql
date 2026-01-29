-- Migration: Add email verification columns to users table
-- Run this manually for existing databases

-- Add email_verified column (default 0 = unverified)
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

-- Add email_verified_at column
ALTER TABLE users ADD COLUMN email_verified_at DATETIME;

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);

-- Mark existing users as verified (they were created before email verification was required)
UPDATE users SET email_verified = 1, email_verified_at = CURRENT_TIMESTAMP WHERE email_verified IS NULL;
