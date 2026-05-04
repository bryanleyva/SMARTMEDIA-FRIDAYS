import { doc, loadDoc } from '@/lib/google-sheets';
import { GoogleSpreadsheetRow } from 'google-spreadsheet';

export class LeadCache {
    private static instance: LeadCache;
    private rows: any[] = [];
    private lastFetch: number = 0;
    private CACHE_TTL = 30 * 1000; // 30 seconds for faster sync with Sheets
    private mutex: Promise<void> = Promise.resolve();

    private constructor() { }

    public static getInstance(): LeadCache {
        if (!LeadCache.instance) {
            LeadCache.instance = new LeadCache();
        }
        return LeadCache.instance;
    }

    /**
     * Initializes the cache if empty or stale.
     * This is a "lazy" load.
     */
    public async ensureInitialized() {
        const now = Date.now();
        if (this.rows.length === 0 || (now - this.lastFetch > this.CACHE_TTL)) {
            await this.refresh();
        }
    }

    /**
     * Helper to run an async task sequentially using a mutex
     */
    private async runLocked<T>(task: () => Promise<T>): Promise<T> {
        const previous = this.mutex;
        let resolveTask: (value: void | PromiseLike<void>) => void;
        this.mutex = new Promise(resolve => { resolveTask = resolve; });
        await previous;
        try {
            return await task();
        } finally {
            resolveTask!();
        }
    }

    /**
     * Internal implementation of refresh without locking.
     */
    private async _refresh() {
        try {
            console.log('LeadCache: refreshing data from Google Sheets...');
            await loadDoc();
            const sheet = doc.sheetsByTitle['BASE CLARO'];
            if (!sheet) {
                console.error('LeadCache: Sheet BASE CLARO not found');
                return;
            }

            await sheet.loadHeaderRow();
            const rows = await sheet.getRows();
            this.rows = rows;
            this.lastFetch = Date.now();
            console.log(`LeadCache: Loaded ${this.rows.length} rows.`);
        } catch (error) {
            console.error('LeadCache: Error refreshing data', error);
        }
    }

    /**
     * Force reloads data from Google Sheets
     */
    public async refresh() {
        return this.runLocked(async () => {
            await this._refresh();
        });
    }

    /**
     * ATOMIC ALLOCATION
     * Finds and assigns a lead in a single synchronous step to prevent race conditions.
     */
    public async allocateNextLead(userName: string, allowNewAllocation: boolean = true): Promise<{ type: 'resume' | 'allocate' | 'none', row?: any }> {
        return this.runLocked(async () => {
            // 1. Check for existing assigned lead (Resume)
            const normUser = userName.trim().toLowerCase();
            const pendingRow = this.rows.find(row => {
                const ejecutivo = (row.get('EJECUTIVO') || '').trim().toLowerCase();
                const estado = (row.get('ESTADO') || '').trim().toUpperCase();
                return ejecutivo === normUser && (!estado || estado === '' || estado === 'PENDIENTE');
            });

            if (pendingRow) {
                return { type: 'resume', row: pendingRow };
            }

            if (!allowNewAllocation) {
                return { type: 'none' };
            }

            // 2. Allocate new
            const availableRow = this.rows.find(row => {
                const ejecutivo = (row.get('EJECUTIVO') || '').trim();
                const ruc = row.get('RUC');
                if (!ruc) return false;
                return ejecutivo === '';
            });

            if (availableRow) {
                availableRow.set('EJECUTIVO', userName);

                const now = new Date();
                const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));

                const day = String(peruTime.getDate()).padStart(2, '0');
                const month = String(peruTime.getMonth() + 1).padStart(2, '0');
                const year = peruTime.getFullYear();
                const hours = String(peruTime.getHours()).padStart(2, '0');
                const minutes = String(peruTime.getMinutes()).padStart(2, '0');
                const seconds = String(peruTime.getSeconds()).padStart(2, '0');

                const fechaInicio = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
                availableRow.set('FECHA INICIO', fechaInicio);

                try {
                    await availableRow.save();
                } catch (e) {
                    console.error('Error saving allocated row:', e);
                }

                return { type: 'allocate', row: availableRow };
            }

            return { type: 'none' };
        });
    }

    /**
     * ATOMIC BATCH ASSIGNMENT
     * Refreshes data and allocates multiple leads by criteria in a single locked step.
     */
    public async batchAssignByCriteria(
        executiveName: string,
        quantity: number,
        criteria: (row: any) => boolean,
        fechaInicio: string
    ): Promise<{ success: boolean, count: number, error?: string }> {
        return this.runLocked(async () => {
            try {
                // 1. Force refresh to ensure we have the absolute latest state
                // We call the internal _refresh here because we are already inside a runLocked block
                await this._refresh();

                // 2. Filter candidates that are TRULY available right now
                const availableCandidates = this.rows.filter(row => {
                    const exec = (row.get('EJECUTIVO') || '').trim();
                    const ruc = row.get('RUC');
                    return ruc && exec === '' && criteria(row);
                }).slice(0, quantity);

                if (availableCandidates.length === 0) {
                    return { success: false, count: 0, error: 'No hay leads disponibles para este criterio.' };
                }

                // 3. Perform assignments
                let successCount = 0;
                for (const row of availableCandidates) {
                    row.set('EJECUTIVO', executiveName);
                    row.set('ESTADO', '');
                    row.set('FECHA INICIO', fechaInicio);

                    try {
                        await row.save();
                        successCount++;
                    } catch (e) {
                        console.error(`Error saving batch row ${row.get('RUC')}:`, e);
                    }
                }

                return { success: true, count: successCount };

            } catch (error: any) {
                console.error('Error in batchAssignByCriteria:', error);
                return { success: false, count: 0, error: error.message || 'Error en asignación masiva' };
            }
        });
    }

    public getByRuc(ruc: string) {
        return this.rows.find(r => r.get('RUC') === ruc);
    }

    public getAll() {
        return this.rows;
    }

    /**
     * Updates a persistent row in the cache and triggers async save to Sheets.
     * Hardened to prevent overwriting if another user assigned it first.
     */
    public async updateRow(ruc: string, updates: Record<string, any>, options?: { onlyIfUnassigned?: boolean }) {
        return this.runLocked(async () => {
            // Re-fetch row from in-memory (which might have been updated by a refresh)
            const row = this.getByRuc(ruc);
            if (!row) return false;

            if (options?.onlyIfUnassigned) {
                const currentExec = (row.get('EJECUTIVO') || '').trim();
                if (currentExec !== '') {
                    console.warn(`[LeadCache] Blocked update for RUC ${ruc}: Already assigned to ${currentExec}`);
                    return false;
                }
            }

            Object.keys(updates).forEach(key => {
                row.set(key, updates[key]);
            });

            try {
                await row.save();
                return true;
            } catch (e) {
                console.error('Error saving row to sheets', e);
                return false;
            }
        });
    }
}
