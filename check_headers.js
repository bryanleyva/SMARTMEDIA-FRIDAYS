const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

async function main() {
    // Load env manually
    const envPath = path.resolve(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let val = parts.slice(1).join('=').trim();
            // simple unquote
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            env[key] = val;
        }
    });

    console.log('Auth Email:', env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

    const serviceAccountAuth = new JWT({
        email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(env.GOOGLE_SHEET_ID, serviceAccountAuth);

    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['BASE CLARO'];
        if (!sheet) {
            console.error('Sheet BASE CLARO not found');
            return;
        }
        await sheet.loadHeaderRow();
        console.log('\n--- HEADERS FOUND ---');
        console.log(JSON.stringify(sheet.headerValues, null, 2));
        console.log('---------------------\n');

        if (!sheet.headerValues.includes('FECHA INICIO')) {
            console.error('CRITICAL: Column "FECHA INICIO" NOT FOUND!');
        } else {
            console.log('SUCCESS: Column "FECHA INICIO" exists.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
