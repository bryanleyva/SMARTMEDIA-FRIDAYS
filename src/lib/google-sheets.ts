import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Interfaces for our data
export interface UserRow {
    DNI: string;
    'NOMBRES COMPLETOS': string;
    USER: string;
    CLAVE: string;
    ROL: 'ADMIN' | 'SPECIAL' | 'STANDAR';
    CARGO?: string;
    SUPERVISOR?: string;
    TELEFONO: string;
    SESSION_TOKEN?: string;
    FOTO?: string;
}

export interface BaseRow {
    // Define structure based on requirements later
    [key: string]: any;
}

// Singleton for Auth
// robust key cleaning for Vercel env vars
const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
    : undefined;

const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
    ],
});

export const auth = serviceAccountAuth;
export const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID || '', serviceAccountAuth);

let lastDocLoad = 0;
const DOC_CACHE_TTL = 10000; // 10 seconds

export async function loadDoc() {
    const now = Date.now();
    if (now - lastDocLoad < DOC_CACHE_TTL) {
        return;
    }

    let retries = 3;
    while (retries > 0) {
        try {
            await doc.loadInfo();
            lastDocLoad = Date.now();
            return;
        } catch (e) {
            retries--;
            console.warn(`loadDoc failed, retries left: ${retries}`, e);
            if (retries === 0) throw e;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
    }
}

import { UserCache } from './user-cache';

export async function getUserByCredentials(username: string, password: string): Promise<UserRow | null> {
    const cache = UserCache.getInstance();
    await cache.ensureInitialized();

    // We fetch fresh rows specifically for login to ensure token write works on current state
    await loadDoc(); // Refresh doc metadata
    const sheet = doc.sheetsByTitle['USUARIOS'];
    if (!sheet) throw new Error('Hoja USUARIOS no encontrada');
    const rows = await sheet.getRows();

    const userRow = rows.find(row => row.get('USER') === username && row.get('CLAVE') === password);

    if (!userRow) return null;

    // Generate and save new unique session token
    const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    userRow.set('SESSION_TOKEN', newToken);
    await userRow.save();

    // Trigger cache update so other threads see the new token faster
    await cache.refresh();

    return {
        DNI: userRow.get('DNI'),
        'NOMBRES COMPLETOS': userRow.get('NOMBRES COMPLETOS'),
        USER: userRow.get('USER'),
        CLAVE: userRow.get('CLAVE'),
        ROL: userRow.get('ROL') as any,
        CARGO: userRow.get('CARGO'),
        SUPERVISOR: userRow.get('SUPERVISOR'),
        TELEFONO: userRow.get('TELEFONO'),
        SESSION_TOKEN: newToken,
        FOTO: userRow.get('FOTO'),
    };
}

export async function checkSessionToken(username: string, token: string): Promise<boolean> {
    const cache = UserCache.getInstance();
    await cache.ensureInitialized(); // Uses 15s TTL

    const userRow = cache.findUser(username);
    if (!userRow) return false;

    const currentToken = userRow.get('SESSION_TOKEN');
    return currentToken === token;
}

export async function getAvailableBase(limit: number = 10, assignedUser: string) {
    await loadDoc();
    const sheet = doc.sheetsByTitle['BASE'];
    if (!sheet) throw new Error('Hoja BASE no encontrada');

    const rows = await sheet.getRows();

    // Filter for unassigned rows (assuming column 'ASIGNADO' exists and is empty for available rows)
    // Also check if 'ASIGNADO' header exists, if not maybe we need to define it.
    // We assume the sheet headers are: [DATA_COLUMNS..., 'ASIGNADO']

    const availableRows = rows.filter(row => !row.get('ASIGNADO') || row.get('ASIGNADO') === '');

    const assignedData: any[] = [];

    // Take up to 'limit' rows
    for (let i = 0; i < Math.min(limit, availableRows.length); i++) {
        const row = availableRows[i];
        row.set('ASIGNADO', assignedUser);
        // Add timestamp if needed? row.set('FECHA_ASIGNACION', new Date().toISOString());
        await row.save(); // Save one by one (or could use sheet.saveUpdatedCells() for batch if optimized)

        assignedData.push(row.toObject());
    }

    return assignedData;
}

export async function getAssignedData(user: string) {
    await loadDoc();
    const sheet = doc.sheetsByTitle['BASE'];
    if (!sheet) return []; // Or throw error

    const rows = await sheet.getRows();
    // Filter where ASIGNADO == user
    const userRows = rows.filter(row => row.get('ASIGNADO') === user);

    return userRows.map(row => row.toObject());
}
