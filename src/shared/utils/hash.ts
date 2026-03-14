import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// ─────────────────────────────────────────────────────────────
// Podara — Password Hashing Utility
// Uses Node.js built-in crypto — no bcrypt dependency needed
// PBKDF2 with SHA-512, 100,000 iterations — production standard
// ─────────────────────────────────────────────────────────────

const ITERATIONS = 100_000
const KEY_LENGTH = 64
const DIGEST = 'sha512'
const SEPARATOR = ':'

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(32).toString('hex')

    import('crypto').then(({ pbkdf2 }) => {
      pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, hash) => {
        if (err) return reject(err)
        resolve(`${ITERATIONS}${SEPARATOR}${salt}${SEPARATOR}${hash.toString('hex')}`)
      })
    })
  })
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [iterations, salt, hash] = storedHash.split(SEPARATOR)

    if (!iterations || !salt || !hash) return resolve(false)

    import('crypto').then(({ pbkdf2 }) => {
      pbkdf2(password, salt, Number(iterations), KEY_LENGTH, DIGEST, (err, derivedKey) => {
        if (err) return reject(err)

        // timingSafeEqual prevents timing attacks
        const hashBuffer = Buffer.from(hash, 'hex')
        const derivedBuffer = Buffer.from(derivedKey.toString('hex'), 'hex')

        if (hashBuffer.length !== derivedBuffer.length) return resolve(false)

        resolve(timingSafeEqual(hashBuffer, derivedBuffer))
      })
    })
  })
}
