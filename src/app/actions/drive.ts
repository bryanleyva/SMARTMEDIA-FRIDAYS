'use server';

import { google } from 'googleapis';
import { auth } from '@/lib/google-sheets';
import { Readable } from 'stream';
import { del } from '@vercel/blob';
import { BLOB_TOKEN } from '@/lib/blob-token';

const DRIVE_FOLDER_ID = '10Em0ObpHWW06xCevzRzhTy3vAqOOO7bF';

/**
 * Mueve un archivo ya subido a Vercel Blob hacia Google Drive (server-to-server).
 * Si Drive falla por cuota, conserva el blob y devuelve su URL como fileId.
 */
export async function uploadFromBlobUrl(blobUrl: string, fileName: string, mimeType: string) {
    try {
        const drive = google.drive({ version: 'v3', auth });

        const resp = await fetch(blobUrl);
        if (!resp.ok || !resp.body) {
            return { success: false, error: `No se pudo leer el archivo subido (${resp.status}).` };
        }
        const stream = Readable.fromWeb(resp.body as any);

        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [DRIVE_FOLDER_ID],
            },
            media: {
                mimeType: mimeType || 'application/octet-stream',
                body: stream,
            },
            fields: 'id, webViewLink',
            supportsAllDrives: true,
        });

        // Limpia el blob temporal
        try { await del(blobUrl, { token: BLOB_TOKEN }); } catch (e) {
            console.warn('No se pudo borrar el blob temporal:', e);
        }

        if (response.data.id) {
            return { success: true, fileId: response.data.id, viewLink: response.data.webViewLink };
        }
        return { success: false, error: 'No se pudo obtener el ID del archivo.' };

    } catch (error: any) {
        console.error('Error en uploadFromBlobUrl:', error);

        // Si Drive falla por cuota, conservamos el blob y lo usamos como fileId
        if (error.message?.includes('storage quota') || error.code === 403 || error.code === 404) {
            console.warn('Drive no disponible, guardando en Vercel Blob como fallback.');
            return { success: true, fileId: blobUrl, viewLink: blobUrl };
        }

        return { success: false, error: error.message || 'Error al mover el archivo a Drive.' };
    }
}
