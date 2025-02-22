import crypto from 'crypto'

// Use Node's crypto module for scripts
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex')
    
    // Hash the password with the salt using PBKDF2
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err)
      // Combine the hash and salt with a delimiter
      resolve(`${derivedKey.toString('hex')}:${salt}`)
    })
  })
}

export async function verifyPassword(password, hash) {
  return new Promise((resolve, reject) => {
    const [hashedPassword, salt] = hash.split(':')
    
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err)
      resolve(derivedKey.toString('hex') === hashedPassword)
    })
  })
} 