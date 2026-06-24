'use server';

import { put } from '@vercel/blob';

export async function uploadFileToDrive(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'No se ha seleccionado ningún archivo.' };
        }

        const blob = await put(file.name, file, {
            access: 'public',
            contentType: file.type || 'application/octet-stream',
        });

        return {
            success: true,
            fileId: blob.url,
            viewLink: blob.url,
        };

    } catch (error: any) {
        console.error('Error uploading to Vercel Blob:', error);
        return { success: false, error: error.message || 'Error al subir archivo.' };
    }
}
