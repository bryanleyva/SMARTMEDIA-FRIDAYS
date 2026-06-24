import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const maxDuration = 60;

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

        const blob = await put(file.name, file, {
            access: 'public',
            contentType: file.type || 'application/octet-stream',
            addRandomSuffix: true,
        });

        return NextResponse.json({
            success: true,
            fileId: blob.url,   // stored as URL; SessionLinker detects https:// prefix
            viewLink: blob.url,
        });

    } catch (error: any) {
        console.error('Error uploading to Vercel Blob:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al subir archivo.'
        }, { status: 500 });
    }
}
