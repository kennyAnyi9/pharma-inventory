-- Create users table for NextAuth authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert admin user with hashed password for '12345'
-- Password hash generated with bcrypt rounds=12
INSERT INTO users (email, password, name, role) 
VALUES (
    'kennyanyi9@gmail.com',
    '$2a$12$LQv3c1yqBPVHAlr2oxnZs.xvSfQgLPx8.6/RHPcGz8lK2vlZvqfGO',
    'Kenny Anyi',
    'admin'
) 
ON CONFLICT (email) DO NOTHING;

-- Verify the user was created
SELECT id, email, name, role, created_at FROM users WHERE email = 'kennyanyi9@gmail.com';