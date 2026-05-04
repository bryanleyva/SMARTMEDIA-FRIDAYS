'use server';

import { doc, loadDoc } from '@/lib/google-sheets';
import { PostVentaRecord } from '@/app/actions/postventa';

// ─── NOMBRE DE LA HOJA NUEVA ─────────────────────────────────────────────────
const SHEET_NAME = 'POSTVENTA_SEGUIMIENTO';

// ─── TIPOS ───────────────────────────────────────────────────────────────────
export interface PostVentaObservacion {
    id: string;
    ruc: string;
    razonSocial: string;
    telefono: string;
    ejecutivoOriginal: string;
    lineas: string;
    cargoFijo: string;
    observacion: string;
    usuario: string;          // quien llamó (Andrea)
    fecha: string;
    segmento: string;
}

// ─── GUARDAR OBSERVACIÓN ─────────────────────────────────────────────────────
export async function savePostVentaObservacion(data: {
    ruc: string;
    razonSocial: string;
    telefono: string;
    ejecutivoOriginal: string;
    lineas: string;
    cargoFijo: string;
    segmento: string;
    observacion: string;
    usuario: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await loadDoc();

        // Crear hoja si no existe
        let sheet = doc.sheetsByTitle[SHEET_NAME];
        if (!sheet) {
            sheet = await doc.addSheet({
                title: SHEET_NAME,
                headerValues: [
                    'ID',
                    'RUC',
                    'RAZON SOCIAL',
                    'TELEFONO',
                    'EJECUTIVO ORIGINAL',
                    'LINEAS',
                    'CARGO FIJO',
                    'SEGMENTO',
                    'OBSERVACION',
                    'USUARIO',
                    'FECHA',
                ],
            });
        }

        const rows = await sheet.getRows();
        const ids = rows.map(r => parseInt(r.get('ID'))).filter(n => !isNaN(n));
        const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;

        const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

        await sheet.addRow({
            'ID': nextId.toString(),
            'RUC': data.ruc,
            'RAZON SOCIAL': data.razonSocial,
            'TELEFONO': data.telefono,
            'EJECUTIVO ORIGINAL': data.ejecutivoOriginal,
            'LINEAS': data.lineas,
            'CARGO FIJO': data.cargoFijo,
            'SEGMENTO': data.segmento,
            'OBSERVACION': data.observacion,
            'USUARIO': data.usuario,
            'FECHA': now,
        });

        return { success: true };
    } catch (error) {
        console.error('Error en savePostVentaObservacion:', error);
        return { success: false, error: 'Error al guardar la observación' };
    }
}

// ─── OBTENER HISTORIAL DEL USUARIO ───────────────────────────────────────────
export async function getPostVentaHistorial(
    usuario: string
): Promise<{ success: boolean; data?: PostVentaObservacion[]; error?: string }> {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle[SHEET_NAME];
        if (!sheet) return { success: true, data: [] };

        const rows = await sheet.getRows();

        const data: PostVentaObservacion[] = rows
            .filter(r => (r.get('USUARIO') || '').trim().toLowerCase() === usuario.trim().toLowerCase())
            .map(r => ({
                id: r.get('ID') || '',
                ruc: r.get('RUC') || '',
                razonSocial: r.get('RAZON SOCIAL') || '',
                telefono: r.get('TELEFONO') || '',
                ejecutivoOriginal: r.get('EJECUTIVO ORIGINAL') || '',
                lineas: r.get('LINEAS') || '',
                cargoFijo: r.get('CARGO FIJO') || '',
                segmento: r.get('SEGMENTO') || '',
                observacion: r.get('OBSERVACION') || '',
                usuario: r.get('USUARIO') || '',
                fecha: r.get('FECHA') || '',
            }))
            .reverse(); // más recientes primero

        return { success: true, data };
    } catch (error) {
        console.error('Error en getPostVentaHistorial:', error);
        return { success: false, error: 'Error al obtener el historial' };
    }
}