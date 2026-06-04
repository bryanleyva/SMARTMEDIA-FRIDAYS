import { NextRequest, NextResponse } from 'next/server';
import { doc, loadDoc } from '@/lib/google-sheets';

export const maxDuration = 120;

const EXPECTED_HEADERS = [
    'RUC', 'Razón Social', 'Representante Legal', 'Teléfonos',
    'Documento Identidad', 'DEPARTAMENTO', 'PROVINCIA', 'DISTRITO',
    'DIRECCION', 'CORREO', 'CANTIDAD LINEAS'
];

export async function POST(req: NextRequest) {
    try {
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (parseError: any) {
            const msg = parseError?.message || '';
            if (msg.includes('too large') || msg.includes('entity') || msg.includes('413')) {
                return NextResponse.json({ success: false, error: 'El archivo es demasiado grande. El límite máximo es 25MB.' }, { status: 413 });
            }
            return NextResponse.json({ success: false, error: 'No se pudo leer el archivo enviado.' }, { status: 400 });
        }

        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ success: false, error: 'No se ha seleccionado ningún archivo.' }, { status: 400 });
        }

        const ExcelJS = (await import('exceljs')).default;
        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            return NextResponse.json({ success: false, error: 'El archivo Excel está vacío o no tiene datos.' }, { status: 400 });
        }

        // Read headers from first row
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell({ includeEmpty: true }, (cell) => {
            headers.push(String(cell.value || '').trim());
        });

        // Validate all expected headers are present
        const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            return NextResponse.json({
                success: false,
                error: `Encabezados faltantes en el Excel: ${missingHeaders.join(', ')}`
            }, { status: 400 });
        }

        // Parse data rows
        const rowsToInsert: Record<string, string>[] = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;

            const rowData: Record<string, string> = {};
            let hasRuc = false;

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const header = headers[colNumber - 1];
                if (header && EXPECTED_HEADERS.includes(header)) {
                    const value = cell.value !== null && cell.value !== undefined
                        ? String(cell.value).trim()
                        : '';
                    rowData[header] = value;
                    if (header === 'RUC' && value) hasRuc = true;
                }
            });

            if (hasRuc) rowsToInsert.push(rowData);
        });

        if (rowsToInsert.length === 0) {
            return NextResponse.json({ success: false, error: 'El archivo no contiene filas con RUC válido.' }, { status: 400 });
        }

        // Write to BASE CLARO
        await loadDoc();
        const sheet = doc.sheetsByTitle['BASE CLARO'];
        if (!sheet) {
            return NextResponse.json({ success: false, error: 'Hoja "BASE CLARO" no encontrada en el Spreadsheet.' }, { status: 500 });
        }

        await sheet.loadHeaderRow();
        await sheet.addRows(rowsToInsert);

        return NextResponse.json({ success: true, inserted: rowsToInsert.length });

    } catch (error: any) {
        console.error('Error uploading base to BASE CLARO:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al procesar el archivo.'
        }, { status: 500 });
    }
}
