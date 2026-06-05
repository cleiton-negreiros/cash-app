-- Disable email confirmation for development/testing
-- Run this in Supabase SQL Editor or via the connection string
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;
