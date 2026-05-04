'use server';

import { uploadToCloudinary } from '@/lib/cloudinary';
import { doc, loadDoc } from '@/lib/google-sheets';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function updateProfile(username: string, formData: FormData) {
    try {
        console.log(`[updateProfile] DEBUG: Starting update for user identifier: "${username}"`);

        // 1. Validate Session on Server
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            console.error('[updateProfile] ERROR: No active session found');
            return { success: false, error: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.' };
        }

        // Security check: Ensure the user is updating their own profile
        const sessionUser = session.user.email;
        if (sessionUser !== username) {
            console.warn(`[updateProfile] WARNING: User "${sessionUser}" tried to update profile for "${username}"`);
            // We'll proceed with sessionUser to be safe, or just reject
            return { success: false, error: 'No tienes permiso para actualizar este perfil.' };
        }

        const phone = formData.get('phone') as string;
        const file = formData.get('photo') as File | null;

        console.log('[updateProfile] DEBUG: Loading spreadsheet doc...');
        await loadDoc();
        const sheet = doc.sheetsByTitle['USUARIOS'];
        const rows = await sheet.getRows();

        // Trim and normalize for safer lookup
        const cleanUsername = username.trim();
        const userRow = rows.find(row => {
            const rowUser = (row.get('USER') || '').toString().trim();
            return rowUser.toLowerCase() === cleanUsername.toLowerCase();
        });

        if (!userRow) {
            console.error(`[updateProfile] User not found: "${cleanUsername}"`);
            return { success: false, error: 'Usuario no encontrado en la base de datos' };
        }

        console.log(`[updateProfile] User found: ${userRow.get('NOMBRES COMPLETOS')}`);

        // Update Phone
        if (phone) {
            userRow.set('TELEFONO', phone);
        }

        let photoUrl = undefined;
        if (file && file.size > 0) {
            try {
                // Sanitize publicId for Cloudinary (replace special chars like @, .)
                const sanitizedId = cleanUsername.replace(/[@.]/g, '_');
                const cloudinaryPublicId = `${sanitizedId}_profile`;

                console.log(`[updateProfile] Uploading photo to Cloudinary as: ${cloudinaryPublicId}`);
                photoUrl = await uploadToCloudinary(file, cloudinaryPublicId);
                userRow.set('FOTO', photoUrl);
            } catch (clError: any) {
                console.error('[updateProfile] Cloudinary upload error:', clError);
                return { success: false, error: 'Error al subir imagen: ' + clError.message };
            }
        }

        await userRow.save();
        revalidatePath('/');

        console.log(`[updateProfile] Success for "${cleanUsername}"`);
        return { success: true, photoUrl };
    } catch (error: any) {
        console.error('[updateProfile] CRITICAL ERROR:', error);
        return { success: false, error: error.message || 'Error desconocido al actualizar perfil' };
    }
}
