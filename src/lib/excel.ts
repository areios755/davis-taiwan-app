import * as XLSX from 'xlsx';

/**
 * Export data to an Excel file and trigger download.
 */
export function exportExcel(data: Record<string, unknown>[], columns: string[], filename: string) {
  const rows = data.map(item => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      const val = item[col];
      row[col] = Array.isArray(val) ? val.join(', ') : val ?? '';
    }
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows, { header: columns });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

/**
 * Download a template (header-only) Excel file.
 */
export function downloadTemplate(columns: string[], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([columns]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}

/**
 * Parse an Excel file and return rows as objects.
 */
export function parseExcel(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
