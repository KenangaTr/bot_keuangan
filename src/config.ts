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
  const value = process.env[key];
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

export const config: Config = {
  TELEGRAM_BOT_TOKEN: getEnv('TELEGRAM_BOT_TOKEN'),
  GOOGLE_SPREADSHEET_ID: mainSpreadsheetId,
  GOOGLE_SPREADSHEET_ID_PEMASUKAN: process.env.GOOGLE_SPREADSHEET_ID_PEMASUKAN || mainSpreadsheetId,
  GOOGLE_SPREADSHEET_ID_PENGELUARAN: process.env.GOOGLE_SPREADSHEET_ID_PENGELUARAN || mainSpreadsheetId,
  GOOGLE_DRIVE_FOLDER_ID: cleanDriveFolderId,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  GOOGLE_PRIVATE_KEY: formatPrivateKey(getEnv('GOOGLE_PRIVATE_KEY')),
  IMGBB_API_KEY: getEnv('IMGBB_API_KEY'),
};
