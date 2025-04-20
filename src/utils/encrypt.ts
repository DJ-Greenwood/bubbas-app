import CryptoJS from 'crypto-js';


// You must set this in your .env file
const SALT = process.env.NEXT_ENCRYPTION_SALT || 'bubbasSalt2025';

export function getUserEncryptionKey(uid: string, passphrase?: string): string {
  return CryptoJS.SHA256((passphrase || uid) + SALT).toString();
}

export function encryptUserData(uid: string, data: any, passphrase?: string): string {
  const key = getUserEncryptionKey(uid, passphrase);
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

export function decryptUserData(uid: string, encrypted: string, passphrase?: string): any {
  const key = getUserEncryptionKey(uid, passphrase);
  const bytes = CryptoJS.AES.decrypt(encrypted, key);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted);
}
