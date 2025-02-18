import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${hash}:${salt}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [hashedPart, salt] = hash.split(':');
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return hashedPart === verifyHash;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
} 