import ExcelJS from "exceljs";
import { PassThrough } from "stream";

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

export async function generateExcel(
  reportName: string,
  columns: ReportColumn[],
  data: Record<string, unknown>[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream,
      useStyles: true,
      useSharedStrings: false,
    });
    const worksheet = workbook.addWorksheet(reportName);

    // Column widths (no headers here — added manually below)
    worksheet.columns = columns.map((col) => ({
      key: col.key,
      width: col.width ?? 20,
    }));

    // Header row — added as a row so we can style it before committing
    const headerRow = worksheet.addRow(columns.map((col) => col.header));
    headerRow.height = 30;
    for (let c = 1; c <= columns.length; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" },
        bottom: { style: "thin" }, right: { style: "thin" },
      };
    }
    headerRow.commit();

    // Data rows
    data.forEach((rowData, index) => {
      // Convert numeric strings → actual numbers (only finite, safe values)
      const converted: Record<string, unknown> = {};
      for (const key of Object.keys(rowData)) {
        const val = rowData[key];
        if (typeof val === "string" && val.trim() !== "") {
          const num = Number(val);
          converted[key] = Number.isFinite(num) ? num : val;
        } else {
          converted[key] = val;
        }
      }

      const row = worksheet.addRow(converted);
      row.height = 22;

      // Iterate exactly columns.length cells — avoids empty-cell XML corruption
      const bgColor = index % 2 === 0 ? "FFF0F4FF" : "FFFFFFFF";
      for (let c = 1; c <= columns.length; c++) {
        const cell = row.getCell(c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
        cell.alignment = { vertical: "middle" };
      }

      row.commit();
    });

    worksheet.commit();
    workbook.commit().catch(reject);
  });
}
