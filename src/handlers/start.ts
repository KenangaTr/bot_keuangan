import { InlineKeyboard } from 'grammy';
import { MyContext } from './conversation';

/**
 * Handler ketika pengguna mengirimkan command /start atau /menu.
 * Menampilkan pesan selamat datang serta tombol menu utama pencatatan.
 */
export async function handleStart(ctx: MyContext) {
  const welcomeText = 
    `👋 *Halo! Selamat Datang di Bot Keuangan*\n\n` +
    `Bot ini membantu Anda mencatat transaksi pemasukan & pengeluaran ke Google Sheets & Drive secara interaktif.\n\n` +
    `Silakan pilih **Menu Transaksi** di bawah untuk memulai pencatatan:`;

  const keyboard = new InlineKeyboard()
    .text("📥 Catat Pemasukan", "menu_pemasukan").row()
    .text("📤 Catat Pengeluaran", "menu_pengeluaran");

  await ctx.reply(welcomeText, { reply_markup: keyboard, parse_mode: 'Markdown' });
}

/**
 * Handler ketika pengguna mengirimkan command /help.
 * Menampilkan informasi bantuan penggunaan.
 */
export async function handleHelp(ctx: MyContext) {
  const helpText =
    `📖 *Panduan Penggunaan Bot Keuangan*\n\n` +
    `*Perintah yang Tersedia:*\n` +
    `- \`/start\` atau \`/menu\`: Membuka menu utama untuk memilih pencatatan.\n` +
    `- \`/cancel\`: Membatalkan pengisian data yang sedang berlangsung kapan saja.\n` +
    `- \`/help\`: Menampilkan panduan bantuan ini.\n\n` +
    `*Alur Pencatatan Pemasukan:*\n` +
    `1. Pilih menu *Catat Pemasukan*.\n` +
    `2. Ketik **ID Pelanggan** (bot akan otomatis mencocokkan Nama, Paket, dan Tarif di database Anda).\n` +
    `3. Pilih metode pembayaran (*radbox*, *TF Dana*, *TF BRI*).\n` +
    `4. Kirim **Foto Bukti Invoice**.\n\n` +
    `*Alur Pencatatan Pengeluaran:*\n` +
    `1. Pilih menu *Catat Pengeluaran*.\n` +
    `2. Kirim **Foto Bukti Pembelian/Nota**.\n` +
    `3. Ketik nama **Barang**, **Satuan**, **Jumlah**, dan **Harga Satuan**.\n` +
    `4. Pilih metode pembayaran (*TF*, *CASH*).\n` +
    `5. Ketik **Keterangan** tambahan.\n\n` +
    `_Semua bukti foto akan diunggah ke Google Drive dan linknya disimpan otomatis di spreadsheet bulanan Anda._`;

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}
