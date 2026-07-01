import { Context, NextFunction } from 'grammy';

// Penyimpanan in-memory untuk waktu interaksi terakhir dari setiap user ID
const userLastMessageTime = new Map<number, number>();

// Interval minimal antar pesan (2 detik)
const SPAM_INTERVAL_MS = 2000;

/**
 * Middleware untuk menyaring pesan spam dari Telegram.
 * Membatasi interaksi pengguna agar berjarak minimal 2 detik.
 */
export async function antiSpam(ctx: Context, next: NextFunction) {
  // Jika interaksi bukan berasal dari user (misal dari channel post), lewatkan
  if (!ctx.from) {
    return next();
  }

  const userId = ctx.from.id;
  const now = Date.now();
  const lastTime = userLastMessageTime.get(userId);

  if (lastTime && now - lastTime < SPAM_INTERVAL_MS) {
    console.warn(`[Anti-Spam] Deteksi spam dari user ID: ${userId}.`);
    
    // Cek apakah pesan ini berupa command
    const text = ctx.message?.text || ctx.message?.caption;
    const isCommand = text?.startsWith('/');

    if (isCommand) {
      try {
        await ctx.reply('⚠️ Mohon tunggu sebentar sebelum mengirim perintah kembali.', {
          reply_parameters: { message_id: ctx.message?.message_id || 0 },
        });
      } catch (err) {
        console.error('Gagal mengirim respon anti-spam:', err);
      }
    }
    // Hentikan eksekusi handler selanjutnya
    return;
  }

  // Catat waktu pengiriman terakhir
  userLastMessageTime.set(userId, now);
  return next();
}
