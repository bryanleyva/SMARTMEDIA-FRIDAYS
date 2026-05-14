import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/google-sheets';
import { Readable } from 'stream';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No se ha seleccionado ningún archivo.' }, { status: 400 });
        }

        const drive = google.drive({ version: 'v3', auth });
        const folderId = '17fYDbJtdfpKsMGY_mvd-laP0ZrMjTXJ4';

        // Check folder access
        try {
            const folder = await drive.files.get({
                fileId: folderId,
                fields: 'id, name, capabilities',
                supportsAllDrives: true
            });
            if (!folder.data.capabilities?.canAddChildren) {
                return NextResponse.json({
                    success: false,
                    error: 'El robot tiene acceso de LECTURA pero no puede ESCRIBIR. Cambie el permiso a "Editor" en Google Drive.'
                }, { status: 403 });
            }
        } catch (error: any) {
            if (error.code === 404) {
                return NextResponse.json({
                    success: false,
                    error: `El robot no tiene acceso a la carpeta (404). Verifique los permisos en Drive.`
                }, { status: 404 });
            }
            throw error;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const response = await drive.files.create({
            requestBody: {
                name: file.name,
                parents: [folderId],
            },
            media: {
                mimeType: file.type || 'application/octet-stream',
                body: stream,
            },
            fields: 'id, webViewLink',
            supportsAllDrives: true,
        });

        if (response.data.id) {
            return NextResponse.json({
                success: true,
                fileId: response.data.id,
                viewLink: response.data.webViewLink
            });
        }

        return NextResponse.json({ success: false, error: 'No se pudo obtener el ID del archivo.' }, { status: 500 });

    } catch (error: any) {
        console.error('Error uploading to Drive:', error);

        if (error.message?.includes('storage quota')) {
            return NextResponse.json({
                success: false,
                error: 'Error de Cuota: La carpeta debe estar en una Unidad Compartida (Shared Drive), no en Mi Unidad.'
            }, { status: 507 });
        }

        return NextResponse.json({
            success: false,
            error: error.message || 'Error al subir archivo a Drive.'
        }, { status: 500 });
    }
}
