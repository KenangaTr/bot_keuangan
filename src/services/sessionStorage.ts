import { StorageAdapter } from 'grammy';
import { sheetsApi } from './googleSheets';
import { config } from '../config';

const SPREADSHEET_ID = config.GOOGLE_SPREADSHEET_ID;

export class GoogleSheetsStorage<T> implements StorageAdapter<T> {
  private sheetCreated = false;

  private async ensureSheetExists() {
    if (this.sheetCreated) return;
    try {
      // Periksa apakah sheet SESSIONS sudah ada
      const meta = await sheetsApi.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      const sheetExists = meta.data.sheets?.some(
        (s) => s.properties?.title === 'SESSIONS'
      );

      if (!sheetExists) {
        // Buat sheet SESSIONS jika belum ada
        await sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'SESSIONS',
                  },
                },
              },
            ],
          },
        });

        // Tulis header kolom
        await sheetsApi.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: 'SESSIONS!A1:C1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['KEY', 'VALUE', 'UPDATED_AT']],
          },
        });
      }
      this.sheetCreated = true;
    } catch (err) {
      console.error('Gagal memastikan sheet SESSIONS ada:', err);
    }
  }

  async read(key: string): Promise<T | undefined> {
    await this.ensureSheetExists();
    try {
      const res = await sheetsApi.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'SESSIONS!A2:B',
      });
      const rows = res.data.values || [];
      const row = rows.find((r) => r[0] === key);
      if (row && row[1]) {
        return JSON.parse(row[1]) as T;
      }
    } catch (err) {
      console.error(`Gagal membaca session key ${key}:`, err);
    }
    return undefined;
  }

  async write(key: string, value: T): Promise<void> {
    // Abaikan jika value kosong atau default kosong untuk efisiensi
    if (!value || Object.keys(value).length === 0) {
      return;
    }

    await this.ensureSheetExists();
    try {
      const res = await sheetsApi.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'SESSIONS!A2:B',
      });
      const rows = res.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === key);
      const valStr = JSON.stringify(value);
      const updatedAt = new Date().toISOString();

      if (rowIndex === -1) {
        // Append data baru
        await sheetsApi.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'SESSIONS!A2:C',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[key, valStr, updatedAt]],
          },
        });
      } else {
        // Update baris yang sudah ada
        const rowNum = rowIndex + 2;
        await sheetsApi.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `SESSIONS!A${rowNum}:C${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[key, valStr, updatedAt]],
          },
        });
      }
    } catch (err) {
      console.error(`Gagal menulis session key ${key}:`, err);
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureSheetExists();
    try {
      const res = await sheetsApi.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'SESSIONS!A2:B',
      });
      const rows = res.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === key);
      if (rowIndex !== -1) {
        const rowNum = rowIndex + 2;
        // Kosongkan nilai kolom agar terhapus
        await sheetsApi.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `SESSIONS!A${rowNum}:C${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['', '', '']],
          },
        });
      }
    } catch (err) {
      console.error(`Gagal menghapus session key ${key}:`, err);
    }
  }
}
