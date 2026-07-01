import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Muat dan timpa secara paksa variabel lingkungan dari file .env
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  }
} catch (err) {
  console.warn('Gagal memuat paksa file .env:', err);
}

dotenv.config();

export interface Config {
  TELEGRAM_BOT_TOKEN: string;
  GOOGLE_SPREADSHEET_ID: string;
  GOOGLE_SPREADSHEET_ID_PEMASUKAN: string;
  GOOGLE_SPREADSHEET_ID_PENGELUARAN: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  IMGBB_API_KEY: string;
}

/**
 * Mendapatkan nilai dari environment variable.
 * Melempar error jika variabel wajib tidak ditemukan.
 */
const getEnv = (key: string, required = true): string => {
  let value = process.env[key];
  if (value) {
    value = value.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
  }
  if (required && !value) {
    throw new Error(`Environment variable ${key} wajib diisi tetapi tidak ditemukan!`);
  }
  return value || '';
};

/**
 * Format private key Google Service Account agar karakter new line (\n) terbaca dengan benar.
 */
const formatPrivateKey = (key: string): string => {
  return key.replace(/\\n/g, '\n');
};

const mainSpreadsheetId = getEnv('GOOGLE_SPREADSHEET_ID');

const rawDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const cleanDriveFolderId = rawDriveFolderId ? rawDriveFolderId.split('?')[0].trim() : undefined;

const rawPrivateKey = getEnv('GOOGLE_PRIVATE_KEY');
const formattedPrivateKey = formatPrivateKey(rawPrivateKey);

console.log('--- GOOGLE PRIVATE KEY DEBUG ---');
console.log('Raw key length:', rawPrivateKey.length);
console.log('Raw key starts with:', rawPrivateKey.substring(0, 30));
console.log('Raw key ends with:', rawPrivateKey.substring(rawPrivateKey.length - 30));
console.log('Formatted key length:', formattedPrivateKey.length);
console.log('Formatted key starts with:', JSON.stringify(formattedPrivateKey.substring(0, 30)));
console.log('Formatted key ends with:', JSON.stringify(formattedPrivateKey.substring(formattedPrivateKey.length - 30)));
console.log('--------------------------------');

export const config: Config = {
  TELEGRAM_BOT_TOKEN: getEnv('TELEGRAM_BOT_TOKEN'),
  GOOGLE_SPREADSHEET_ID: mainSpreadsheetId,
  GOOGLE_SPREADSHEET_ID_PEMASUKAN: getEnv('GOOGLE_SPREADSHEET_ID_PEMASUKAN', false) || mainSpreadsheetId,
  GOOGLE_SPREADSHEET_ID_PENGELUARAN: getEnv('GOOGLE_SPREADSHEET_ID_PENGELUARAN', false) || mainSpreadsheetId,
  GOOGLE_DRIVE_FOLDER_ID: cleanDriveFolderId,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  GOOGLE_PRIVATE_KEY: formattedPrivateKey,
  IMGBB_API_KEY: getEnv('IMGBB_API_KEY'),
};
