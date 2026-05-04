import { v2 as cloudinary } from 'cloudinary';

export async function uploadToCloudinary(file: File, publicId: string): Promise<string> {
    // Verificar variables de entorno
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log('--- Cloudinary Config Debug ---');
    console.log('CLOUDINARY_CLOUD_NAME:', cloudName ? `${cloudName.substring(0, 3)}...` : 'MISSING');
    console.log('CLOUDINARY_API_KEY:', apiKey ? `${apiKey.substring(0, 3)}...` : 'MISSING');
    console.log('CLOUDINARY_API_SECRET:', apiSecret ? 'PRESENT (hidden)' : 'MISSING');

    if (!cloudName || !apiKey || !apiSecret) {
        let missing = [];
        if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
        if (!apiKey) missing.push('CLOUDINARY_API_KEY');
        if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
        throw new Error(`Cloudinary environment variables are missing: ${missing.join(', ')}`);
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    });

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'ryders/fotos_corporativas',
                    public_id: publicId,
                    overwrite: true,
                    resource_type: 'auto',
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary Stream Error:', error);
                        return reject(new Error(`Cloudinary upload failed: ${error.message}`));
                    }
                    resolve(result?.secure_url || '');
                }
            );

            uploadStream.on('error', (err) => {
                console.error('Upload Stream event error:', err);
                reject(err);
            });

            uploadStream.end(buffer);
        });
    } catch (error: any) {
        console.error('Error in uploadToCloudinary:', error);
        throw new Error(`Error subiendo a Cloudinary: ${error.message}`);
    }
}
