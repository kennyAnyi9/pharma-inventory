import bcrypt from 'bcryptjs'
import { db } from './index'
import { users } from './schema/users'
import { eq } from 'drizzle-orm'

export async function seedUsers() {
  console.log('🌱 Seeding users...')
  
  const adminEmail = 'kennyanyi9@gmail.com'
  const adminPassword = '12345'
  
  try {
    // Check if admin user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1)
    
    if (existingUser.length > 0) {
      console.log('✅ Admin user already exists')
      return
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    
    // Create admin user
    await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      name: 'Kenny Anyi',
      role: 'admin',
    })
    
    console.log('✅ Admin user created successfully')
    console.log(`📧 Email: ${adminEmail}`)
    console.log(`🔑 Password: ${adminPassword}`)
  } catch (error) {
    console.error('❌ Error seeding users:', error)
    throw error
  }
}