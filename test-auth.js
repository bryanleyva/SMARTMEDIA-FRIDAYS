// Test rápido: ¿el service account puede leer el sheet?
const { google } = require('googleapis');

const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

(async () => {
    try {
        console.log('Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
        console.log('Sheet ID:', process.env.GOOGLE_SHEET_ID);
        console.log('Private key empieza con:', privateKey.substring(0, 50));
        console.log('\nIntentando conectar...\n');

        const res = await sheets.spreadsheets.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
        });

        console.log('✓ ÉXITO. Sheet:', res.data.properties.title);
        console.log('  Hojas:', res.data.sheets.map(s => s.properties.title).join(', '));
    } catch (e) {
        console.log('✗ ERROR:', e.message);
        console.log('\nCódigo:', e.code);
        console.log('Status:', e.response?.status);
    }
})();