import { createHash, randomBytes } from 'crypto'

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha512')
    .update(password + salt)
    .digest('hex')
  return `${hash}:${salt}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [hashedPart, salt] = hash.split(':')
    const verifyHash = createHash('sha512')
      .update(password + salt)
      .digest('hex')
    return hashedPart === verifyHash
  } catch (error) {
    console.error('Password verification failed:', error)
    return false
  }
} 

export { hashPassword, verifyPassword }