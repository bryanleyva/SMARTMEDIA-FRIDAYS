import { NextRequest, NextResponse } from 'next/server';
import { doc, loadDoc } from '@/lib/google-sheets';

export const maxDuration = 120;

export async function GET(req: NextRequest) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['BASE CLARO'];
        if (!sheet) {
            return NextResponse.json({ error: 'Hoja BASE CLARO no encontrada.' }, { status: 500 });
        }

        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();
        const headers = sheet.headerValues;

        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('BASE CLARO');

        worksheet.addRow(headers);

        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell: any) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' },
            };
        });
        headerRow.height = 20;

        for (const row of rows) {
            worksheet.addRow(headers.map((h: string) => row.get(h) ?? ''));
        }

        worksheet.columns.forEach((col: any) => { col.width = 22; });

        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        const date = new Date().toISOString().split('T')[0];

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="BASE_CLARO_${date}.xlsx"`,
            },
        });

    } catch (error: any) {
        console.error('Error downloading BASE CLARO:', error);
        return NextResponse.json({ error: error.message || 'Error al generar el archivo.' }, { status: 500 });
    }
}
