import bcrypt from 'bcryptjs'

async function generateHash() {
  const password = '12345'
  const hash = await bcrypt.hash(password, 12)
  console.log('Password:', password)
  console.log('Hash:', hash)
  
  // Test the hash
  const isValid = await bcrypt.compare(password, hash)
  console.log('Hash validation:', isValid)
}

generateHash().catch(console.error)