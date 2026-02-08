# Quick Admin Setup - SQL Script

-- Run this in Supabase SQL Editor after creating a user via the dashboard

-- Step 1: First create a user via Supabase Dashboard:
-- Go to Authentication → Users → Add user → Create new user
-- Email: admin@arspl.com (or your preferred email)
-- Password: (choose a strong password)
-- ✅ Check "Auto Confirm User"

-- Step 2: Then run this SQL to set them as admin:
UPDATE profiles 
SET role = 'admin', 
    full_name = 'Admin User'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'admin@arspl.com'  -- Change this to your admin email
  LIMIT 1
);

-- Step 3: Verify the admin user was created correctly:
SELECT 
  u.email,
  u.confirmed_at,
  p.full_name,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'admin@arspl.com';  -- Change this to your admin email

-- Expected result:
-- email: admin@arspl.com
-- confirmed_at: (should have a timestamp)
-- full_name: Admin User
-- role: admin

-- If profile doesn't exist, create it manually:
-- (Only run this if the above query shows NULL for full_name and role)
INSERT INTO profiles (id, full_name, role)
SELECT id, 'Admin User', 'admin'
FROM auth.users
WHERE email = 'admin@arspl.com'  -- Change this to your admin email
ON CONFLICT (id) DO UPDATE
SET role = 'admin', full_name = 'Admin User';
