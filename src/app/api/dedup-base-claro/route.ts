import { NextRequest, NextResponse } from 'next/server';
import { doc, loadDoc, auth } from '@/lib/google-sheets';
import { google } from 'googleapis';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['BASE CLARO'];
        if (!sheet) {
            return NextResponse.json({ success: false, error: 'Hoja "BASE CLARO" no encontrada.' }, { status: 500 });
        }

        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();

        // Find duplicate row indices (rows array is 0-based, excludes header)
        const seenRuc = new Map<string, number>();
        const toDelete: number[] = [];

        rows.forEach((row, idx) => {
            const ruc = String(row.get('RUC') || '').trim();
            if (!ruc) return;
            if (seenRuc.has(ruc)) {
                toDelete.push(idx);
            } else {
                seenRuc.set(ruc, idx);
            }
        });

        if (toDelete.length === 0) {
            return NextResponse.json({ success: true, deleted: 0, message: 'No se encontraron RUCs duplicados.' });
        }

        // Sort descending so each deletion doesn't shift indices of remaining targets
        const toDeleteDesc = [...toDelete].sort((a, b) => b - a);

        // Build all deleteDimension requests — one per duplicate row
        // Sheets API indices are 0-based; row 0 = header, so data row idx → startIndex = idx + 1
        const requests = toDeleteDesc.map(idx => ({
            deleteDimension: {
                range: {
                    sheetId: sheet.sheetId,
                    dimension: 'ROWS',
                    startIndex: idx + 1,
                    endIndex: idx + 2,
                },
            },
        }));

        // Single HTTP request to delete all duplicates at once
        const sheetsApi = google.sheets({ version: 'v4', auth });
        await sheetsApi.spreadsheets.batchUpdate({
            spreadsheetId: process.env.GOOGLE_SHEET_ID!,
            requestBody: { requests },
        });

        return NextResponse.json({ success: true, deleted: toDelete.length });

    } catch (error: any) {
        console.error('Error deduplicating BASE CLARO:', error);
        return NextResponse.json({ success: false, error: error.message || 'Error al procesar la hoja.' }, { status: 500 });
    }
}
