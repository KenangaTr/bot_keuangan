import https from 'https';
import { config } from '../config';

/**
 * Mengunduh file dari Telegram API sebagai Buffer.
 */
export function downloadTelegramFileAsBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Gagal mengunduh file dari Telegram: Status Code ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Mengunggah file buffer gambar ke ImgBB menggunakan API Key.
 * 
 * @param fileBuffer Buffer dari file gambar
 * @returns Promise<string> Tautan URL gambar permanen
 */
export async function uploadToImgBB(fileBuffer: Buffer): Promise<string> {
  if (!config.IMGBB_API_KEY) {
    throw new Error('API Key ImgBB belum diatur di file .env!');
  }

  const base64Image = fileBuffer.toString('base64');
  const url = `https://api.imgbb.com/1/upload?key=${config.IMGBB_API_KEY}`;
  
  const body = new URLSearchParams();
  body.append('image', base64Image);

  const response = await fetch(url, {
    method: 'POST',
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal mengunggah foto ke ImgBB: ${errorText}`);
  }

  const resJson: any = await response.json();
  if (!resJson.data || !resJson.data.url) {
    throw new Error('Format respon dari ImgBB tidak valid!');
  }

  return resJson.data.url;
}
