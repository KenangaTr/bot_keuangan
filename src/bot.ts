import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { config } from './config';
import { antiSpam } from './middlewares/antispam';
import { handleStart, handleHelp } from './handlers/start';
import { MyContext, tambahPemasukan, tambahPengeluaran } from './handlers/conversation';

// Inisialisasi bot dengan tipe Context kustom MyContext
export const bot = new Bot<MyContext>(config.TELEGRAM_BOT_TOKEN);

// Pasang middleware Anti-Spam secara global
bot.use(antiSpam);

// grammY Conversations memerlukan plugin session terpasang terlebih dahulu
bot.use(session({
  initial: () => ({}),
}));

// Pasang plugin conversations
bot.use(conversations());

// Registrasikan fungsi percakapan interaktif
bot.use(createConversation(tambahPemasukan));
bot.use(createConversation(tambahPengeluaran));

// Registrasi handler untuk command dasar
bot.command(['start', 'menu'], handleStart);
bot.command('help', handleHelp);

// Registrasi command pintasan untuk langsung memulai percakapan interaktif
bot.command('masuk', async (ctx) => {
  await ctx.conversation.enter('tambahPemasukan');
});

bot.command('keluar', async (ctx) => {
  await ctx.conversation.enter('tambahPengeluaran');
});

// Handler untuk membatalkan percakapan kapan saja di luar percakapan aktif
bot.command('cancel', async (ctx) => {
  await ctx.reply('ℹ️ Tidak ada proses pencatatan transaksi yang sedang berjalan saat ini. Ketik `/menu` untuk memulai.');
});

// Handler callback query untuk tombol menu utama
bot.callbackQuery('menu_pemasukan', async (ctx) => {
  await ctx.answerCallbackQuery();
  // Jalankan percakapan tambahPemasukan
  await ctx.conversation.enter('tambahPemasukan');
});

bot.callbackQuery('menu_pengeluaran', async (ctx) => {
  await ctx.answerCallbackQuery();
  // Jalankan percakapan tambahPengeluaran
  await ctx.conversation.enter('tambahPengeluaran');
});

// Global Error Handler untuk mencegah bot crash jika terjadi kegagalan API/koneksi
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[Global Error Handler] Terjadi kesalahan pada update ${ctx.update.update_id}:`);
  console.error(err.error);

  try {
    ctx.reply('⚠️ Terjadi kesalahan internal pada sistem bot. Silakan ketik `/cancel` lalu ulangi kembali.');
  } catch (replyErr) {
    console.error('Gagal mengirimkan pesan error ke pengguna:', replyErr);
  }
});
