
import CryptoJS from 'crypto-js';

/**
 * Security Service for HIPAA Compliance
 * Implements client-side encryption (E2EE) for sensitive patient data.
 */

// A salt to make key derivation more robust if needed
const SALT = 'AuraMD_HIPAA_v1';

/**
 * Encrypts a string using a user-provided key.
 */
export const encryptData = (data: string, key: string): string => {
  if (!key) return data;
  try {
    return CryptoJS.AES.encrypt(data, key + SALT).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    return data;
  }
};

/**
 * Decrypts a string using a user-provided key.
 */
export const decryptData = (ciphertext: string, key: string): string => {
  if (!key) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key + SALT);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error("Decryption resulted in empty string");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return "[ENCRYPTED DATA - KEY REQUIRED]";
  }
};

/**
 * Helper to check if a string looks like it might be encrypted.
 * AES-256 ciphertext usually starts with 'U2FsdGVkX1' (Salted__)
 */
export const isEncrypted = (data: string): boolean => {
  return typeof data === 'string' && data.startsWith('U2FsdGVkX1');
};

/**
 * Hash a key for local storage comparison (not the key itself)
 */
export const hashKey = (key: string): string => {
  return CryptoJS.SHA256(key + SALT).toString();
};
