import { google } from 'googleapis';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { config, logPrivateKeyDebug } from '../config';

// Inisialisasi autentikasi Google API JWT
const auth = new google.auth.JWT({
  email: config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: config.GOOGLE_PRIVATE_KEY,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

// Instansiasi dokumen GoogleSpreadsheet untuk pencarian meta & database pelanggan
const docDatabase = new GoogleSpreadsheet(config.GOOGLE_SPREADSHEET_ID, auth);
const docPemasukan = new GoogleSpreadsheet(config.GOOGLE_SPREADSHEET_ID_PEMASUKAN, auth);
const docPengeluaran = new GoogleSpreadsheet(config.GOOGLE_SPREADSHEET_ID_PENGELUARAN, auth);

// Instansiasi raw Google Sheets API client v4
const sheetsApi = google.sheets({ version: 'v4', auth });

let databaseInitialized = false;

async function initializeDatabase() {
  if (!databaseInitialized) {
    await docDatabase.loadInfo();
    databaseInitialized = true;
  }
}

/**
 * Mencari judul tab bulanan di spreadsheet tertentu berdasarkan bulan saat ini.
 * Metode ini hanya membaca metadata nama tab sehingga tidak akan memicu error "Duplicate Header".
 * 
 * @param doc Dokumen GoogleSpreadsheet yang dituju
 * @param prefix Awalan nama tab sheet (default: 'BULAN')
 */
async function getMonthlySheetTitle(doc: GoogleSpreadsheet, prefix = 'BULAN'): Promise<string> {
  await doc.loadInfo();
  
  const month = new Date().getMonth() + 1; // Bulan 1-12
  const targetName = `${prefix}-${month}`.toLowerCase().replace(/[\s-]/g, '');

  // 1. Cari tab sheet yang namanya menyerupai "BULAN-6", "Bulan 6", atau "BULAN6"
  let sheet = doc.sheetsByIndex.find((s) => {
    const normalizedTitle = s.title.toLowerCase().replace(/[\s-]/g, '');
    return normalizedTitle === targetName || normalizedTitle === `${prefix.toLowerCase()}${month}`;
  });

  // 2. Fallback: Cari sheet yang judulnya mengandung kata kunci (misal: 'pengeluaran' atau 'pemasukan')
  if (!sheet) {
    sheet = doc.sheetsByIndex.find((s) => {
      const lowerTitle = s.title.toLowerCase();
      return lowerTitle.includes(prefix.toLowerCase()) || lowerTitle.includes('data');
    });
  }

  // 3. Fallback terakhir: Ambil tab pertama
  if (!sheet) {
    sheet = doc.sheetsByIndex[0];
  }

  if (!sheet) {
    throw new Error(`Tab sheet tidak ditemukan di Spreadsheet "${doc.title}".`);
  }

  return sheet.title;
}

/**
 * Mengambil detail data pelanggan (Nama, Paket, Harga) berdasarkan ID Pelanggan.
 */
export async function getCustomerDetails(
  customerId: string
): Promise<{ nama: string; paket: string; harga: number } | null> {
  logPrivateKeyDebug();
  await initializeDatabase();

  let sheet = docDatabase.sheetsByIndex.find((s) => {
    const lowerTitle = s.title.toLowerCase();
    return lowerTitle.includes('pelanggan') || lowerTitle.includes('customer');
  }) || docDatabase.sheetsByTitle['DATABASE PELANGGAN'];

  if (!sheet) {
    sheet = docDatabase.sheetsByIndex[0];
  }

  if (!sheet) {
    throw new Error('Tab database pelanggan tidak ditemukan di Google Sheets!');
  }

  // Database pelanggan aman dimuat di baris 1
  await sheet.loadHeaderRow(1);

  const rows = await sheet.getRows();
  const normalizedInput = customerId.trim().toLowerCase();

  for (const row of rows) {
    const rowObj = row.toObject();

    const idKey = Object.keys(rowObj).find((k) => {
      const lowerKey = k.toLowerCase().replace(/[\s_]/g, '');
      return lowerKey === 'id' || lowerKey === 'idpelanggan' || lowerKey === 'kodepelanggan';
    });

    if (!idKey) continue;

    const idVal = rowObj[idKey]?.toString().trim().toLowerCase();
    if (idVal === normalizedInput) {
      const namaKey = Object.keys(rowObj).find((k) => {
        const l = k.toLowerCase().replace(/[\s_]/g, '');
        return l === 'nama' || l === 'namapelanggan';
      }) || 'Nama';

      const paketKey = Object.keys(rowObj).find((k) => {
        const l = k.toLowerCase().replace(/[\s_]/g, '');
        return l === 'paket' || l === 'namapaket';
      }) || 'Paket';

      const hargaKey = Object.keys(rowObj).find((k) => {
        const l = k.toLowerCase().replace(/[\s_]/g, '');
        return l === 'harga' || l === 'hargapaket' || l === 'tarif' || l === 'biaya';
      }) || 'Harga';

      const rawHarga = rowObj[hargaKey] || '0';
      const cleanHarga = parseInt(rawHarga.toString().replace(/[.,]/g, '').trim(), 10) || 0;

      return {
        nama: rowObj[namaKey] || '-',
        paket: rowObj[paketKey] || '-',
        harga: cleanHarga,
      };
    }
  }

  return null;
}

/**
 * Mencatat transaksi Pemasukan baru menggunakan raw Google Sheets API (values.append).
 * Menghindari error "Duplicate Header" dan menargetkan tabel dimulai dari kolom B secara presisi.
 */
export async function addPemasukan(data: {
  tanggal: string;
  idPelanggan: string;
  nama: string;
  paket: string;
  harga: number;
  bukti: string;
  metode: string;
}): Promise<number> {
  const sheetTitle = await getMonthlySheetTitle(docPemasukan, 'BULAN');

  // Baca kolom B (B2:B) untuk menghitung No Urut berikutnya
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SPREADSHEET_ID_PEMASUKAN,
    range: `'${sheetTitle}'!B2:B`,
  });

  const values = res.data.values || [];
  let nextNo = 1;

  if (values.length > 0) {
    const lastVal = values[values.length - 1][0];
    const parsed = parseInt(lastVal, 10);
    if (!isNaN(parsed)) {
      nextNo = parsed + 1;
    }
  }

  // Tulis baris baru menggunakan values.append di rentang kolom B sampai I
  // Kolom: NO (B), Tanggal (C), ID (D), NAMA (E), PAKET (F), HARGA (G), BUKTI (H), METODE PEMBAYARAN (I)
  await sheetsApi.spreadsheets.values.append({
    spreadsheetId: config.GOOGLE_SPREADSHEET_ID_PEMASUKAN,
    range: `'${sheetTitle}'!B2:I`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          nextNo.toString(),
          data.tanggal,
          data.idPelanggan,
          data.nama,
          data.paket,
          data.harga.toString(),
          data.bukti,
          data.metode,
        ],
      ],
    },
  });

  return nextNo;
}

/**
 * Mencatat transaksi Pengeluaran baru menggunakan raw Google Sheets API (values.append).
 * Melewati proses header loading untuk menghindari error "Duplicate Header: TANGGAL".
 */
export async function addPengeluaran(data: {
  tanggal: string;
  barang: string;
  satuan: string;
  jumlah: number;
  harga: number;
  total: number;
  metode: string;
  keterangan: string;
  bukti: string;
}): Promise<number> {
  const sheetTitle = await getMonthlySheetTitle(docPengeluaran, 'BULAN');

  // Baca kolom B (B6:B) untuk menghitung No Urut berikutnya (karena data pengeluaran mulai baris 6)
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SPREADSHEET_ID_PENGELUARAN,
    range: `'${sheetTitle}'!B6:B`,
  });

  const values = res.data.values || [];
  let nextNo = 1;

  if (values.length > 0) {
    const lastVal = values[values.length - 1][0];
    const parsed = parseInt(lastVal, 10);
    if (!isNaN(parsed)) {
      nextNo = parsed + 1;
    }
  }

  // Tulis baris baru menggunakan values.append di rentang kolom B sampai L (karena sampai Bukti Fisik)
  // Kolom: No (B), TANGGAL (C), BARANG (D), SATUAN (E), JUMLAH (F), HARGA (G), TOTAL (H), METODE (I), KETERANGAN (J), BUKTI (K), Bukti Fisik (L)
  await sheetsApi.spreadsheets.values.append({
    spreadsheetId: config.GOOGLE_SPREADSHEET_ID_PENGELUARAN,
    range: `'${sheetTitle}'!B6:L`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          nextNo.toString(),
          data.tanggal,
          data.barang,
          data.satuan,
          data.jumlah.toString(),
          data.harga.toString(),
          data.total.toString(),
          data.metode,
          data.keterangan,
          data.bukti,
          '-', // Kolom L (Bukti Fisik) diisi default '-'
        ],
      ],
    },
  });

  return nextNo;
}
