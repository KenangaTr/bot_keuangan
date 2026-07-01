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

const formatPrivateKey = (key: string): string => {
  let cleanKey = key.trim();
  
  // Bersihkan tanda kutip ganda/tunggal jika ada
  if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
    cleanKey = cleanKey.slice(1, -1);
  } else if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
    cleanKey = cleanKey.slice(1, -1);
  }
  
  // Ganti literal \n jika ada
  cleanKey = cleanKey.split('\\n').join('\n');
  cleanKey = cleanKey.split('\\r').join('\r');
  cleanKey = cleanKey.split('\r\n').join('\n');
  
  // Jika tidak mengandung karakter newline sama sekali, tandanya kunci privat tergabung menjadi satu baris
  if (!cleanKey.includes('\n')) {
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    
    let base64Body = cleanKey;
    if (base64Body.startsWith(header)) {
      base64Body = base64Body.substring(header.length);
    }
    if (base64Body.endsWith(footer)) {
      base64Body = base64Body.substring(0, base64Body.length - footer.length);
    }
    base64Body = base64Body.trim();
    
    // Potong base64 per 64 karakter (standar format PEM)
    const chunks: string[] = [];
    for (let i = 0; i < base64Body.length; i += 64) {
      chunks.push(base64Body.substring(i, i + 64));
    }
    
    // Satukan kembali dengan newline asli
    cleanKey = `${header}\n${chunks.join('\n')}\n${footer}\n`;
  }
  
  return cleanKey;
};

const mainSpreadsheetId = getEnv('GOOGLE_SPREADSHEET_ID');

const rawDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const cleanDriveFolderId = rawDriveFolderId ? rawDriveFolderId.split('?')[0].trim() : undefined;

const rawPrivateKey = getEnv('GOOGLE_PRIVATE_KEY');
const formattedPrivateKey = formatPrivateKey(rawPrivateKey);

export const logPrivateKeyDebug = () => {
  console.log('--- GOOGLE PRIVATE KEY DEBUG ---');
  console.log('Raw key length:', rawPrivateKey.length);
  console.log('Formatted key length:', formattedPrivateKey.length);
  console.log('Raw contains backslash:', rawPrivateKey.includes('\\'));
  console.log('Raw contains actual newline:', rawPrivateKey.includes('\n'));
  console.log('Formatted contains actual newline:', formattedPrivateKey.includes('\n'));
  console.log('Raw key starts with:', rawPrivateKey.substring(0, 30));
  console.log('Formatted key starts with:', JSON.stringify(formattedPrivateKey.substring(0, 30)));
  console.log('--------------------------------');
};

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
