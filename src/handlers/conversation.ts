import { Context, InlineKeyboard, SessionFlavor } from 'grammy';
import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { getCustomerDetails, addPemasukan, addPengeluaran } from '../services/googleSheets';
import { downloadTelegramFileAsBuffer, uploadToImgBB } from '../services/imgbb';
import { config } from '../config';

type BaseContext = Context & SessionFlavor<Record<string, unknown>>;
export type MyContext = ConversationFlavor<BaseContext>;
export type MyConversation = Conversation<MyContext, MyContext>;

/**
 * Alur Percakapan Interaktif: TAMBAH PEMASUKAN
 */
export async function tambahPemasukan(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply(
    "📥 *Catat Pemasukan Baru*\n\n" +
    "Silakan masukkan **ID Pelanggan**:\n" +
    "_(Atau ketik `/cancel` untuk membatalkan)_",
    { parse_mode: 'Markdown' }
  );

  let customerDetails = null;
  let customerId = '';

  // 1. Dapatkan & Validasi ID Pelanggan
  while (true) {
    const inputCtx = await conversation.waitFor("message:text");
    const text = inputCtx.message.text.trim();

    if (text.startsWith('/')) {
      if (text.toLowerCase() === '/cancel') {
        await ctx.reply("❌ Pengisian data pemasukan dibatalkan.");
        return;
      }
      await ctx.reply("⚠️ Perintah tidak valid. Silakan masukkan ID Pelanggan atau ketik `/cancel`:");
      continue;
    }

    const checkingMsg = await ctx.reply("🔍 Memeriksa ID Pelanggan di database...");

    try {
      customerDetails = await conversation.external(() => getCustomerDetails(text));
    } catch (error: any) {
      console.error(error);
      await ctx.api.deleteMessage(ctx.chat!.id, checkingMsg.message_id);
      await ctx.reply("❌ Terjadi masalah koneksi database. Silakan masukkan ulang ID Pelanggan:");
      continue;
    }

    await ctx.api.deleteMessage(ctx.chat!.id, checkingMsg.message_id);

    if (!customerDetails) {
      await ctx.reply("❌ ID Pelanggan tidak terdaftar! Silakan masukkan ID Pelanggan yang valid atau ketik `/cancel`:");
      continue;
    }

    customerId = text;
    break;
  }

  const { nama, paket, harga } = customerDetails;

  // 2. Pilih Metode Pembayaran
  const paymentKeyboard = new InlineKeyboard()
    .text("radbox", "metode_radbox").row()
    .text("TF Dana", "metode_tfdana").row()
    .text("TF BRI", "metode_tfbri");

  await ctx.reply(
    `👤 *Data Pelanggan Ditemukan:*\n` +
    `• Nama: *${nama}*\n` +
    `• Paket: *${paket}*\n` +
    `• Harga: *Rp ${harga.toLocaleString('id-ID')}*\n\n` +
    `Silakan pilih **Metode Pembayaran** pada tombol di bawah:`,
    { reply_markup: paymentKeyboard, parse_mode: 'Markdown' }
  );

  let metode = '';
  while (true) {
    const responseCtx = await conversation.waitFor(["callback_query:data", "message:text"]);

    if (responseCtx.callbackQuery) {
      const data = responseCtx.callbackQuery.data;
      if (data === "metode_radbox") metode = "radbox";
      else if (data === "metode_tfdana") metode = "TF Dana";
      else if (data === "metode_tfbri") metode = "TF BRI";

      await responseCtx.answerCallbackQuery();
      break;
    } else if (responseCtx.message?.text) {
      const text = responseCtx.message.text.trim();
      if (text.toLowerCase() === '/cancel') {
        await ctx.reply("❌ Pengisian data pemasukan dibatalkan.");
        return;
      }
      
      const lower = text.toLowerCase();
      if (lower === 'radbox' || lower === 'tf dana' || lower === 'tf bri') {
        metode = text;
        break;
      } else {
        await ctx.reply("⚠️ Pilihan tidak valid! Gunakan tombol di atas atau ketik salah satu: `radbox`, `TF Dana`, `TF BRI`:");
      }
    }
  }

  // 3. Meminta Foto Bukti Transaksi
  await ctx.reply(`📸 Silakan lampirkan **Foto Bukti Transaksi** (Invoice):`, { parse_mode: 'Markdown' });

  let photoFileId = '';
  while (true) {
    const photoCtx = await conversation.waitFor(["message:photo", "message:text"]);

    if (photoCtx.message?.photo) {
      const photos = photoCtx.message.photo;
      photoFileId = photos[photos.length - 1].file_id; // Mengambil ukuran terbesar
      break;
    } else if (photoCtx.message?.text) {
      const text = photoCtx.message.text.trim();
      if (text.toLowerCase() === '/cancel') {
        await ctx.reply("❌ Pengisian data pemasukan dibatalkan.");
        return;
      }
      await ctx.reply("⚠️ Harap kirimkan bukti transaksi berupa FOTO struk/nota!");
    }
  }

  // 4. Proses Pendaftaran Transaksi
  const processingMsg = await ctx.reply("⏳ Sedang memproses dan menyimpan data pemasukan...");

  try {
    const fileInfo = await ctx.api.getFile(photoFileId);
    if (!fileInfo.file_path) {
      throw new Error('Gagal mendeteksi file path foto di Telegram.');
    }
    const downloadUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    const fileBuffer = await downloadTelegramFileAsBuffer(downloadUrl);
    const imgUrl = await uploadToImgBB(fileBuffer);

    const now = new Date();
    const tanggal = now.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).replace(/\//g, '-');

    const no = await addPemasukan({
      tanggal,
      idPelanggan: customerId.toUpperCase(),
      nama,
      paket,
      harga,
      bukti: imgUrl,
      metode,
    });

    await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);

    // Konfirmasi Output Sesuai Request User
    const successText = 
      `✅ *Pemasukan Berhasil Dicatat!*\n\n` +
      `*-PEMASUKAN-*\n` +
      `No : ${no}\n` +
      `Tanggal : ${tanggal} WIB\n` +
      `ID Pelanggan : ${customerId.toUpperCase()}\n` +
      `Nama : ${nama}\n` +
      `Paket : ${paket}\n` +
      `Harga : Rp ${harga.toLocaleString('id-ID')}\n` +
      `Bukti Transaksi : [Buka Foto Bukti](${imgUrl})\n` +
      `Metode Pembayaran : ${metode}`;

    await ctx.reply(successText, { parse_mode: 'Markdown' });

  } catch (error: any) {
    console.error('[Add Income Error]:', error);
    await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
    await ctx.reply(
      `❌ *Gagal mencatat pemasukan!*\n\n` +
      `*Penyebab:* ${error.message || 'Terjadi kesalahan sistem internal.'}`
    );
  }
}

/**
 * Alur Percakapan Interaktif: TAMBAH PENGELUARAN
 */
export async function tambahPengeluaran(conversation: MyConversation, ctx: MyContext) {
  // 1. Meminta Foto Bukti Pengeluaran
  await ctx.reply(
    "📤 *Catat Pengeluaran Baru*\n\n" +
    "Pertama-tama, silakan lampirkan **Foto Bukti Pengeluaran** (nota/struk):\n" +
    "_(Atau ketik `/cancel` untuk membatalkan)_",
    { parse_mode: 'Markdown' }
  );

  let photoFileId = '';
  while (true) {
    const photoCtx = await conversation.waitFor(["message:photo", "message:text"]);

    if (photoCtx.message?.photo) {
      const photos = photoCtx.message.photo;
      photoFileId = photos[photos.length - 1].file_id;
      break;
    } else if (photoCtx.message?.text) {
      const text = photoCtx.message.text.trim();
      if (text.toLowerCase() === '/cancel') {
        await ctx.reply("❌ Pengisian data pengeluaran dibatalkan.");
        return;
      }
      await ctx.reply("⚠️ Harap lampirkan bukti pengeluaran berupa FOTO struk/nota!");
    }
  }

  // 2. Meminta Nama Barang
  await ctx.reply("📝 Masukkan nama **Barang** yang dibeli:", { parse_mode: 'Markdown' });
  let barang = '';
  while (true) {
    const barangCtx = await conversation.waitFor("message:text");
    const text = barangCtx.message.text.trim();
    if (text.toLowerCase() === '/cancel') {
      await ctx.reply("❌ Pengisian data pengeluaran dibatalkan.");
      return;
    }
    if (text.startsWith('/')) {
      await ctx.reply("⚠️ Format nama barang tidak valid. Masukkan nama barang:");
      continue;
    }
    barang = text;
    break;
  }

  // 3. Meminta Satuan
  await ctx.reply("📦 Masukkan **Satuan** barang (misal: unit, pcs, box):", { parse_mode: 'Markdown' });
  let satuan = '';
  while (true) {
    const satuanCtx = await conversation.waitFor("message:text");
    const text = satuanCtx.message.text.trim();
    if (text.toLowerCase() === '/cancel') {
      await ctx.reply("❌ Pengisian data pengeluaran dibatalkan.");
      return;
    }
    if (text.startsWith('/')) {
      await ctx.reply("⚠️ Format satuan tidak valid. Masukkan satuan barang:");
      continue;
    }
    satuan = text;
    break;
  }

  // 4. Meminta Jumlah Barang
  await ctx.reply("🔢 Masukkan **Jumlah** barang (hanya angka):", { parse_mode: 'Markdown' });
  let jumlah = 0;
  while (true) {
    const jumlahCtx = await conversation.waitFor("message:text");
    const text = jumlahCtx.message.text.trim();
    if (text.toLowerCase() === '/cancel') {
      await ctx.reply("❌ Pengisian data pengeluaran dibatalkan.");
      return;
    }
    const parsed = parseInt(text, 10);
    if (isNaN(parsed) || parsed <= 0) {
      await ctx.reply("⚠️ Input harus berupa angka bulat positif! Masukkan jumlah barang:");
      continue;
    }
    jumlah = parsed;
    break;
  }

  // 5. Meminta Harga Barang
  await ctx.reply("💰 Masukkan **Harga Satuan** (bisa angka polos atau format ribuan):", { parse_mode: 'Markdown' });
  let harga = 0;
  while (true) {
    const hargaCtx = await conversation.waitFor("message:text");
    const text = hargaCtx.message.text.trim();
    if (text.toLowerCase() === '/cancel') {
      await ctx.reply("❌ Pengisian data pengeluaran dibatalkan.");
      return;
    }
    const cleanStr = text.replace(/[.,]/g, ''); // bersihkan titik / koma
    const parsed = parseInt(cleanStr, 10);
    if (isNaN(parsed) || parsed <= 0) {
      await ctx.reply("⚠️ Input harus berupa angka harga positif! Masukkan harga satuan:");
      continue;
    }
    harga = parsed;
    break;
  }

  // 6. Pilih Metode
  const expKeyboard = new InlineKeyboard()
    .text("TF", "metode_tf")
    .text("CASH", "metode_cash");

  await ctx.reply("💳 Pilih **Metode Pembayaran** di bawah:", {
    reply_markup: expKeyboard,
    parse_mode: 'Markdown'
  });

  let metode = '';
  while (true) {
    const responseCtx = await conversation.waitFor(["callback_query:data", "message:text"]);

    if (responseCtx.callbackQuery) {
      const data = responseCtx.callbackQuery.data;
      if (data === "metode_tf") metode = "TF";
      else if (data === "metode_cash") metode = "CASH";

      await responseCtx.answerCallbackQuery();
      break;
    } else if (responseCtx.message?.text) {
      const text = responseCtx.message.text.trim();
      if (text.toLowerCase() === '/cancel') {
        await ctx.reply("❌ Pengisian data pengeluaran dibatalkan.");
        return;
      }
      const upper = text.toUpperCase();
      if (upper === 'TF' || upper === 'CASH') {
        metode = upper;
        break;
      } else {
        await ctx.reply("⚠️ Pilihan tidak valid! Gunakan tombol di atas atau ketik `TF` / `CASH`:");
      }
    }
  }

  // 7. Meminta Keterangan
  await ctx.reply("📝 Masukkan **Keterangan** tambahan pengeluaran:", { parse_mode: 'Markdown' });
  let keterangan = '';
  while (true) {
    const ketCtx = await conversation.waitFor("message:text");
    const text = ketCtx.message.text.trim();
    if (text.toLowerCase() === '/cancel') {
      await ctx.reply("❌ Pengisian data pengeluaran dibatalkan.");
      return;
    }
    if (text.startsWith('/')) {
      await ctx.reply("⚠️ Format keterangan tidak valid. Masukkan keterangan:");
      continue;
    }
    keterangan = text;
    break;
  }

  // 8. Proses Pendaftaran Transaksi
  const processingMsg = await ctx.reply("⏳ Sedang memproses dan menyimpan data pengeluaran...");

  try {
    const fileInfo = await ctx.api.getFile(photoFileId);
    if (!fileInfo.file_path) {
      throw new Error('Gagal mendeteksi file path foto di Telegram.');
    }
    const downloadUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    const fileBuffer = await downloadTelegramFileAsBuffer(downloadUrl);
    const imgUrl = await uploadToImgBB(fileBuffer);

    const total = jumlah * harga;
    const now = new Date();
    const tanggal = now.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).replace(/\//g, '-');

    const no = await addPengeluaran({
      tanggal,
      barang,
      satuan,
      jumlah,
      harga,
      total,
      metode,
      keterangan,
      bukti: imgUrl,
    });

    await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);

    // Konfirmasi Output Sesuai Request User
    const successText = 
      `✅ *Pengeluaran Berhasil Dicatat!*\n\n` +
      `*-PENGELUARAN-*\n` +
      `No : ${no}\n` +
      `Tanggal : ${tanggal} WIB\n` +
      `Barang : ${barang}\n` +
      `Satuan : ${satuan}\n` +
      `Jumlah : ${jumlah}\n` +
      `Harga : Rp ${harga.toLocaleString('id-ID')}\n` +
      `Total : Rp ${total.toLocaleString('id-ID')}\n` +
      `Metode : ${metode}\n` +
      `Keterangan : "${keterangan}"\n` +
      `Bukti : [Buka Foto Bukti](${imgUrl})`;

    await ctx.reply(successText, { parse_mode: 'Markdown' });

  } catch (error: any) {
    console.error('[Add Expense Error]:', error);
    await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
    await ctx.reply(
      `❌ *Gagal mencatat pengeluaran!*\n\n` +
      `*Penyebab:* ${error.message || 'Terjadi kesalahan sistem internal.'}`
    );
  }
}
