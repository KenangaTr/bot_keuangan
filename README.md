# Telegram Finance Bot: Pencatatan Keuangan via Google Sheets & Drive

Bot Telegram pencatatan pemasukan dan pengeluaran menggunakan **Node.js (TypeScript)**, **grammY** framework, serta **Google Sheets** dan **Google Drive API**.

---

## Panduan Setting Service Account di Google Cloud Console

Untuk menghubungkan Bot Telegram ini dengan Google Sheets dan Google Drive, Anda perlu menggunakan akun layanan (**Service Account**) dari Google Cloud. Ikuti langkah-langkah berikut:

### Langkah 1: Buat Project Baru di Google Cloud Console
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Login menggunakan akun Google Anda.
3. Di pojok kiri atas, klik dropdown project, lalu pilih **New Project**.
4. Beri nama project (contoh: `Telegram-Finance-Bot`), lalu klik **Create**.

### Langkah 2: Aktifkan API yang Dibutuhkan
Anda harus mengaktifkan API Google Sheets dan Google Drive untuk project tersebut:
1. Di bilah pencarian atas Google Cloud Console, cari **Google Sheets API**.
2. Klik pada **Google Sheets API** dari hasil pencarian, kemudian klik tombol **Enable**.
3. Kembali ke bilah pencarian, cari **Google Drive API**.
4. Klik pada **Google Drive API**, kemudian klik tombol **Enable**.

### Langkah 3: Buat Service Account dan Generate Key
1. Buka menu navigasi kiri, pilih **IAM & Admin** -> **Service Accounts**.
2. Klik tombol **+ Create Service Account** di bagian atas.
3. Masukkan nama Service Account (misalnya: `sheets-drive-bot`). Deskripsinya opsional. Klik **Create and Continue**.
4. Pada langkah role (opsional), klik **Continue** (dapat dilewati karena kita akan membagikan akses langsung secara spesifik dari Google Drive/Sheets).
5. Pada langkah terakhir, klik **Done**.
6. Sekarang Anda akan melihat daftar Service Account. Klik pada email Service Account yang baru saja dibuat.
7. Buka tab **Keys** di bagian atas.
8. Klik tombol **Add Key** -> **Create new key**.
9. Pilih format **JSON** dan klik **Create**.
10. Sebuah file `.json` akan otomatis terunduh ke komputer Anda. **Simpan file ini baik-baik!** File ini berisi kredensial rahasia yang diperlukan bot.

---

## Integrasi dengan Google Sheets & Google Drive

Setelah mengunduh file JSON credentials, lakukan langkah berikut agar akun layanan tersebut memiliki akses ke file Sheets dan Drive Anda:

### Langkah 4: Bagikan Akses Spreadsheet dan Folder Drive
1. **Google Sheets:**
   - Buka file Google Sheets yang ingin digunakan sebagai database bot Anda.
   - Klik tombol **Share** (Bagikan) di pojok kanan atas.
   - Salin alamat email Service Account (contoh: `sheets-drive-bot@project-id.iam.gserviceaccount.com`).
   - Tempel email tersebut di dialog sharing Google Sheets, beri hak akses sebagai **Editor**, lalu hilangkan centang "Send notification" dan klik **Share**.
2. **Google Drive Folder (Opsional, sangat direkomendasikan):**
   - Buat folder baru di Google Drive untuk menyimpan foto bukti transaksi dari Telegram.
   - Klik kanan folder tersebut -> **Share** -> tempel email Service Account -> beri hak akses sebagai **Editor** -> klik **Share**.
   - Salin **Folder ID** dari URL folder (bagian setelah `/folders/...` di bilah alamat browser).

---

## Konfigurasi File Environment (`.env`)

1. Duplikat file `.env.example` menjadi `.env` di root folder proyek:
   ```bash
   cp .env.example .env
   ```
2. Isi variabel dalam file `.env` dengan data berikut:
   - `TELEGRAM_BOT_TOKEN`: Token bot Anda dari `@BotFather`.
   - `GOOGLE_SPREADSHEET_ID`: ID spreadsheet yang didapatkan dari URL Google Sheets (contoh: `https://docs.google.com/spreadsheets/d/[ID_DI_SINI]/edit`).
   - `GOOGLE_DRIVE_FOLDER_ID`: ID folder Drive tempat mengunggah foto.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Nilai dari `client_email` di file JSON credentials yang diunduh.
   - `GOOGLE_PRIVATE_KEY`: Nilai dari `private_key` di file JSON credentials. **Catatan:** Nilai ini harus diawali dengan `"-----BEGIN PRIVATE KEY-----\n...` dan diakhiri dengan `\n-----END PRIVATE KEY-----\n"`. Pastikan tanda kutip ganda menyelimutinya dan karakter `\n` tetap ada.

---

## Struktur Database Spreadsheet

Pastikan spreadsheet Anda memiliki dua sheet/tab dengan format nama sebagai berikut:

### Tab 1: `DATABASE PELANGGAN`
Sheet ini digunakan untuk memvalidasi ID pelanggan sebelum transaksi diproses.
Kolom pertama harus berisi ID pelanggan yang valid. Contoh:
| ID Pelanggan | Nama Pelanggan | Status |
| :--- | :--- | :--- |
| PEL-001 | Toko Maju Jaya | Aktif |
| PEL-002 | Warung Sejahtera | Aktif |

### Tab 2: `TRANSAKSI`
Sheet tempat menyimpan log transaksi yang dimasukkan bot. Bot akan menambahkan data baris baru secara otomatis di sheet ini.
Sediakan header kolom berikut pada baris pertama:
| Tanggal | Tipe | ID Pelanggan | Nominal | Keterangan | Link Foto Drive | Telegram User ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |

---

## Menjalankan Bot secara Lokal

1. Install dependensi:
   ```bash
   npm install
   ```
2. Jalankan bot dalam mode development (dengan hot reloading):
   ```bash
   npm run dev
   ```
3. Build proyek ke file javascript untuk production:
   ```bash
   npm run build
   ```
4. Jalankan bot hasil build:
   ```bash
   npm start
   ```
