-- Update existing user to super_admin role
UPDATE users 
SET role = 'super_admin'
WHERE email = 'kennyanyi9@gmail.com';

-- Add a regular admin user for testing
INSERT INTO users (email, password, name, role) 
VALUES (
    'admin@pharmacy.com',
    '$2b$12$zEbsVvarmrX3KHuMYbf8x.fakDhuXK6srATUwjIiIGBNI0yIyRRJK',
    'Pharmacy Admin',
    'admin'
) 
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Verify the updates
SELECT email, name, role, created_at FROM users ORDER BY created_at;