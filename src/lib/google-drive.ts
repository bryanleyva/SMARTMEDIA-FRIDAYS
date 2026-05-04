import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.split(String.fromCharCode(92) + 'n').join('\n'),
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

export async function uploadProfilePicture(file: File, username: string): Promise<string> {
    try {
        // Fallback hardcoded for debugging
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1TjAt7TMjPsLQLL0qpfxPbxdV8WgPwdiI';
        if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID not set');

        // Convert File to Buffer/Stream
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const response = await drive.files.create({
            requestBody: {
                name: `${username}_profile.jpg`,
                parents: [folderId],
            },
            media: {
                mimeType: file.type,
                body: stream,
            },
            fields: 'id, webContentLink, webViewLink',
        });

        const fileId = response.data.id;
        if (!fileId) throw new Error('Upload failed');

        // Make file public so it can be viewed in the app
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Construct a direct viewable link (thumbnail link is better for avatars usually, but webContentLink works)
        // Using a trick for direct display if needed, or just standard google drive display
        return response.data.webContentLink || '';
    } catch (error: any) {
        console.error('Drive upload error:', error);
        console.error('Error details:', error.response?.data);
        throw new Error(`Fallo subida a Drive: ${error.message}`);
    }
}
