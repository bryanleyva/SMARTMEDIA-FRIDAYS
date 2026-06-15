import { NextRequest, NextResponse } from 'next/server';
import { doc, loadDoc } from '@/lib/google-sheets';

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

        // Find first-occurrence index for each RUC
        const seenRuc = new Map<string, number>(); // ruc → first row position in array
        const toDelete: number[] = []; // positions (in array) to delete

        rows.forEach((row, idx) => {
            const ruc = String(row.get('RUC') || '').trim();
            if (!ruc) return; // skip empty RUC rows
            if (seenRuc.has(ruc)) {
                toDelete.push(idx); // duplicate: mark for deletion
            } else {
                seenRuc.set(ruc, idx);
            }
        });

        if (toDelete.length === 0) {
            return NextResponse.json({ success: true, deleted: 0, message: 'No se encontraron RUCs duplicados.' });
        }

        // Delete from BOTTOM to TOP so row indices don't shift during deletion
        const toDeleteDesc = [...toDelete].sort((a, b) => b - a);

        let deleted = 0;
        for (const idx of toDeleteDesc) {
            await rows[idx].delete();
            deleted++;
        }

        return NextResponse.json({ success: true, deleted });

    } catch (error: any) {
        console.error('Error deduplicating BASE CLARO:', error);
        return NextResponse.json({ success: false, error: error.message || 'Error al procesar la hoja.' }, { status: 500 });
    }
}
