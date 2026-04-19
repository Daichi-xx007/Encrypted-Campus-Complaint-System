// ============================================================
// AES-256-GCM Encryption Service
// ============================================================
// Provides authenticated encryption for complaint data at rest.
// Each encryption operation uses a random IV and produces an
// authentication tag to guarantee integrity and confidentiality.
// ============================================================

const crypto = require('crypto');
const {
  ENCRYPTION_ALGORITHM,
  ENCRYPTION_KEY,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
} = require('../config/security');

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Base64-encoded string: iv:authTag:ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:ciphertext (all hex-encoded)
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt AES-256-GCM encrypted data.
 * @param {string} encryptedData - Format: iv:authTag:ciphertext (hex)
 * @returns {string} Decrypted plaintext
 * @throws {Error} If authentication tag validation fails (data tampered)
 */
function decrypt(encryptedData) {
  if (!encryptedData) return encryptedData;

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt multiple fields of an object.
 * @param {Object} obj - Source object
 * @param {string[]} fields - Field names to encrypt
 * @returns {Object} New object with specified fields encrypted
 */
function encryptFields(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field]) {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
}

/**
 * Decrypt multiple fields of an object.
 * @param {Object} obj - Source object with encrypted fields
 * @param {string[]} fields - Field names to decrypt
 * @returns {Object} New object with specified fields decrypted
 */
function decryptFields(obj, fields) {
  if (!obj) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (result[field]) {
      try {
        result[field] = decrypt(result[field]);
      } catch (e) {
        result[field] = '[Decryption Error]';
      }
    }
  }
  return result;
}

module.exports = { encrypt, decrypt, encryptFields, decryptFields };
