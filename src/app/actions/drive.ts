'use server';

import { google } from 'googleapis';
import { auth } from '@/lib/google-sheets';
import { Readable } from 'stream';

export async function uploadFileToDrive(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'No se ha seleccionado ningún archivo.' };
        }

        // Initialize Drive API
        const drive = google.drive({ version: 'v3', auth });

        // Create a readable stream from the file buffer
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        // Check folder access first
        const folderId = '17fYDbJtdfpKsMGY_mvd-laP0ZrMjTXJ4';
        try {
            const folder = await drive.files.get({
                fileId: folderId,
                fields: 'id, name, capabilities',
                supportsAllDrives: true
            });

            if (!folder.data.capabilities?.canAddChildren) {
                return { success: false, error: 'El robot tiene acceso de LECTURA pero no puede ESCRIBIR. Por favor cambie el permiso a "Editor" en Google Drive.' };
            }

        } catch (error: any) {
            console.error('Error accessing folder:', error);
            if (error.code === 404) {
                const robotEmail = (auth as any).email || 'el robot';
                return { success: false, error: `El robot (${robotEmail}) no tiene acceso a la carpeta (404). Verifique que haya compartido con este correo.` };
            }
            throw error;
        }

        const response = await drive.files.create({
            requestBody: {
                name: file.name,
                parents: [folderId],
            },
            media: {
                mimeType: file.type,
                body: stream,
            },
            fields: 'id, webViewLink',
            supportsAllDrives: true,
        });

        if (response.data.id) {
            return {
                success: true,
                fileId: response.data.id,
                viewLink: response.data.webViewLink
            };
        } else {
            return { success: false, error: 'No se pudo obtener el ID del archivo.' };
        }

    } catch (error: any) {
        console.error('Error uploading to Drive:', error);

        // Handle "No storage quota" error specifically
        if (error.message && error.message.includes('storage quota')) {
            return {
                success: false,
                error: 'Error de Cuota: Las cuentas de servicio no tienen espacio propio. SOLUCIÓN: La carpeta de destino debe estar dentro de una "UNIDAD COMPARTIDA" (Shared Drive) de Google Workspace, no en "Mi Unidad" personal.'
            };
        }

        return { success: false, error: error.message || 'Error al subir archivo a Drive.' };
    }
}
