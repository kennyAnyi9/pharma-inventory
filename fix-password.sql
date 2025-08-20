-- Update the admin user with the correct password hash
UPDATE users 
SET password = '$2b$12$zEbsVvarmrX3KHuMYbf8x.fakDhuXK6srATUwjIiIGBNI0yIyRRJK'
WHERE email = 'kennyanyi9@gmail.com';

-- Verify the update
SELECT email, name, role, created_at FROM users WHERE email = 'kennyanyi9@gmail.com';