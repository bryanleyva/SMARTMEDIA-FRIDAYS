'use server';

import { doc, loadDoc } from '@/lib/google-sheets';

export interface PostVentaRecord {
    id: string;
    ruc: string;
    razonSocial: string;
    ejecutivo: string;
    supervisor: string;
    segmento: string;
    lineas: string;
    cargoFijo: string;
    descuento: string;
    contacto: string;
    telefono: string;
    correo: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    dni: string;
    proceso: string;
    detalle: string;
    observacion: string;
    observacionEjecutivo: string;
    fechaActivacion: string;
    fechaPeriodo: string;
    fechaInicio: string;
    fechaFin: string;
    srIngreso: string;
    numOrden: string;
    operador: string;
    idSustentos: string;
    estado: string;
    // RUC 10 identifier
    isRuc10: boolean;
}

/**
 * Returns all VENTAS from the sheet where:
 *   - ESTADO === 'ACTIVADO'
 *   - FECHA FIN falls within the previous calendar month
 *
 * "Fecha del mes anterior" is computed from today's date in Lima time.
 */
export async function getPostVentaData(): Promise<{ success: boolean; data?: PostVentaRecord[]; error?: string }> {
    try {
        await loadDoc();
        const sheet = doc.sheetsByTitle['VENTAS'];
        if (!sheet) return { success: false, error: 'Hoja VENTAS no encontrada' };

        const rows = await sheet.getRows();

        // Calculate previous month window (Lima time)
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth() + 1; // 1-indexed
        const prevYear = prevMonthDate.getFullYear();

        const filtered = rows.filter(row => {
            const estado = (row.get('ESTADO') || '').trim().toUpperCase();
            if (estado !== 'ACTIVADO') return false;

            // Try FECHA FIN first, fall back to FECHA INICIO
            const rawFecha = row.get('FECHA FIN') || row.get('FECHA INICIO') || '';
            if (!rawFecha) return false;

            // Expected format: "DD/MM/YYYY, HH:MM:SS"
            const datePart = rawFecha.split(',')[0].trim(); // "DD/MM/YYYY"
            const parts = datePart.split('/');
            if (parts.length < 3) return false;

            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);

            if (isNaN(month) || isNaN(year)) return false;

            return month === prevMonth && year === prevYear;
        });

        const data: PostVentaRecord[] = filtered.map(row => {
            const ruc = String(row.get('RUC') || '').trim();
            return {
                id: row.get('ID') || '',
                ruc,
                razonSocial: row.get('RAZON SOCIAL') || '',
                ejecutivo: row.get('EJECUTIVO') || '',
                supervisor: row.get('SUPERVISOR') || '',
                segmento: row.get('SEGMENTO') || '',
                lineas: row.get('CANTIDAD LINEAS') || '',
                cargoFijo: row.get('CF TOTAL') || '',
                descuento: row.get('DESCUENTO') || '',
                contacto: row.get('REPRESENTANTE LEGAL') || '',
                telefono: row.get('TELEFONO') || '',
                correo: row.get('CORREO') || '',
                departamento: row.get('DEPARTAMENTO') || '',
                provincia: row.get('PROVINCIA') || '',
                distrito: row.get('DISTRITO') || '',
                direccion: row.get('DIRECCION') || '',
                dni: row.get('DOCUMENTO IDENTIDAD') || '',
                proceso: row.get('PROCESO') || '',
                detalle: row.get('DETALLE') || '',
                observacion: row.get('OBSERVACION') || '',
                observacionEjecutivo: row.get('OBSERVACION EJECUTIVO') || '',
                fechaActivacion: row.get('FECHA ACTIVACION') || '',
                fechaPeriodo: row.get('FECHA PERIODO') || '',
                fechaInicio: row.get('FECHA INICIO') || '',
                fechaFin: row.get('FECHA FIN') || '',
                srIngreso: row.get('SR DE INGRESO') || '',
                numOrden: row.get('NUMERO DE ORDEN') || '',
                operador: row.get('OPERADOR') || '',
                idSustentos: row.get('ID SUSTENTOS') || '',
                estado: row.get('ESTADO') || '',
                // RUC 10: starts with "10" (persona natural)
                isRuc10: ruc.startsWith('10'),
            };
        });

        // Sort newest first (by ID desc)
        data.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

        return { success: true, data };
    } catch (error) {
        console.error('Error in getPostVentaData:', error);
        return { success: false, error: 'Error al cargar datos de post venta' };
    }
}