import { upload } from '@vercel/blob/client';
import { uploadFromBlobUrl } from '@/app/actions/drive';

/**
 * Sube un archivo en dos pasos:
 *  1. Navegador → Vercel Blob (sin límite de 4.5 MB ni CORS)
 *  2. Servidor mueve el archivo de Blob → Google Drive y borra el blob temporal
 * Devuelve el fileId (ID de Drive o URL de Blob como fallback).
 */
export async function uploadFileToDrive(file: File): Promise<string> {
    const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
    });

    const res = await uploadFromBlobUrl(blob.url, file.name, file.type);
    if (!res.success || !res.fileId) {
        throw new Error(res.error || `Error al subir el archivo: ${file.name}`);
    }
    return res.fileId;
}
