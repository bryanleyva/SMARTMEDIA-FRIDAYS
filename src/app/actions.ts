'use server';

import { getAvailableBase, BaseRow } from '@/lib/google-sheets';

export async function distributeLeads(user: string) {
    try {
        // Attempt to get 10 records
        const assignedRows = await getAvailableBase(10, user);

        return {
            success: assignedRows.length > 0,
            count: assignedRows.length,
            data: assignedRows
        };
    } catch (error) {
        console.error('Error distributing leads:', error);
        return { success: false, count: 0, error: 'Internal Error' };
    }
}
