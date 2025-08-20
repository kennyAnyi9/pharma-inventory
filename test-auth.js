// Quick test script to debug authentication
import bcrypt from 'bcryptjs'

async function testAuth() {
  console.log('Testing auth...')
  
  // Test bcrypt with the same values
  const testPassword = '12345'
  const hashedFromDB = '$2a$12$LQv3c1yqBPVHAlr2oxnZs.xvSfQgLPx8.6/RHPcGz8lK2vlZvqfGO'
  
  const isValid = await bcrypt.compare(testPassword, hashedFromDB)
  console.log('Password comparison result:', isValid)
  
  // Test environment variables
  console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET)
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
}

testAuth().catch(console.error)