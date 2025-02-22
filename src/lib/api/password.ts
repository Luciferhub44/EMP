// Use Web Crypto API instead of Node's crypto module
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Hash the password with the salt
  const hashBuffer = await crypto.subtle.digest(
    'SHA-512',
    encoder.encode(password + saltHex)
  )
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return `${hashHex}:${saltHex}`
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [hashedPart, salt] = hash.split(':')
    const encoder = new TextEncoder()
    
    // Hash the password with the stored salt
    const hashBuffer = await crypto.subtle.digest(
      'SHA-512',
      encoder.encode(password + salt)
    )
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const verifyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return hashedPart === verifyHash
  } catch (error) {
    console.error('Password verification failed:', error)
    return false
  }
}

export { hashPassword, verifyPassword }