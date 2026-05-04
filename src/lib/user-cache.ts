import { doc, loadDoc } from './google-sheets';

export class UserCache {
    private static instance: UserCache;
    private rows: any[] = [];
    private lastFetch: number = 0;
    private CACHE_TTL = 15 * 1000; // 15 seconds for session checks
    private isLoading: boolean = false;

    private constructor() { }

    public static getInstance(): UserCache {
        if (!UserCache.instance) {
            UserCache.instance = new UserCache();
        }
        return UserCache.instance;
    }

    public async ensureInitialized() {
        const now = Date.now();
        if (this.rows.length === 0 || (now - this.lastFetch > this.CACHE_TTL)) {
            await this.refresh();
        }
    }

    public async refresh() {
        if (this.isLoading) {
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (this.rows.length > 0) return;
            }
            return;
        }

        try {
            this.isLoading = true;
            await loadDoc();
            const sheet = doc.sheetsByTitle['USUARIOS'];
            if (!sheet) return;

            const rows = await sheet.getRows();
            this.rows = rows;
            this.lastFetch = Date.now();
        } catch (error) {
            console.error('UserCache: Error refreshing', error);
        } finally {
            this.isLoading = false;
        }
    }

    public findUser(identifier: string) {
        if (!identifier) return undefined;
        const search = identifier.trim().toUpperCase();
        return this.rows.find(r =>
            (r.get('USER') || '').trim().toUpperCase() === search ||
            (r.get('NOMBRES COMPLETOS') || '').trim().toUpperCase() === search
        );
    }

    public getSupervisorForUser(userName: string) {
        if (!userName) return '';
        const user = this.findUser(userName);
        return user?.get('SUPERVISOR') || '';
    }

    public getTeamForSupervisor(supervisorName: string) {
        if (!supervisorName) return [];
        const search = supervisorName.trim().toUpperCase();
        return this.rows.filter(r =>
            (r.get('SUPERVISOR') || '').trim().toUpperCase() === search
        );
    }

    public getAll() {
        return this.rows;
    }
}
