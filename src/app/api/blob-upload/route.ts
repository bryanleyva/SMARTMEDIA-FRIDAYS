import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BLOB_TOKEN } from '@/lib/blob-token';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            token: BLOB_TOKEN,
            onBeforeGenerateToken: async () => {
                const session = await getServerSession(authOptions);
                if (!session) throw new Error('No autorizado.');
                return {
                    allowedContentTypes: [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/octet-stream',
                        'image/jpeg',
                        'image/png',
                    ],
                    maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
                    addRandomSuffix: true,
                };
            },
            onUploadCompleted: async () => {
                // El archivo se mueve a Drive desde la Server Action.
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
}
