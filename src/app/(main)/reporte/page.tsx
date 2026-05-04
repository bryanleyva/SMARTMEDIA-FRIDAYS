import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVentasData, getGoalData } from "@/app/actions/leads";
import ReportDashboard from "@/components/ReportDashboard";
import { UserCache } from "@/lib/user-cache";

export default async function ReportePage(props: { searchParams: Promise<{ mes?: string, anio?: string }> }) {
    const searchParams = await props.searchParams;
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const userRole = (session.user as any)?.role?.trim().toUpperCase();
    const isStandard = userRole === 'STANDAR' || userRole === 'STANDARD';

    // Peru Time for defaults
    const now = new Date();
    const peruTime = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(now);

    const currentMonth = parseInt(peruTime.find(p => p.type === 'month')?.value || '1');
    const currentYear = parseInt(peruTime.find(p => p.type === 'year')?.value || '2026');

    // Determine target Month/Year
    let targetMonth = currentMonth;
    let targetYear = currentYear;

    if (searchParams.mes) targetMonth = parseInt(searchParams.mes);
    if (searchParams.anio) targetYear = parseInt(searchParams.anio);

    const [allVentas, goalResult] = await Promise.all([
        getVentasData(),
        getGoalData()
    ]);

    // Aggregation Logic refined based on user specific list
    const finalStatuses = ['ACTIVADO', 'RECHAZADO', 'ERROR DE DATA', 'VENTA CAIDA', 'ANULADO'];

    // Filter VENTAS: 
    // - Final Statuses: Strict match for Month/Year
    // - Ongoing Statuses: Cumulative (Current Month + Previous Months) aka "Backlog"
    const periodVentas = allVentas.filter(v => {
        const finalStatuses = ['ACTIVADO', 'RECHAZADO', 'ERROR DE DATA', 'VENTA CAIDA', 'ANULADO'];
        const estado = (v.estado || '').trim().toUpperCase();

        let dateStr = v.fechaInicio || v.fecha;
        if (finalStatuses.includes(estado)) {
            // Priority for closed deals: fechaFin > fechaActivacion > fechaInicio
            dateStr = v.fechaFin || v.fechaActivacion || dateStr;
        }

        if (!dateStr && !v.fechaPeriodo) return false;

        let m: number, y: number;
        if (v.fechaPeriodo && /^\d{2}\/\d{4}$/.test(v.fechaPeriodo)) {
            const partsP = v.fechaPeriodo.split('/');
            m = parseInt(partsP[0]);
            y = parseInt(partsP[1]);
        } else {
            // Format: DD/MM/YYYY or D/M/YYYY
            const datePart = dateStr.split(',')[0].trim();
            const parts = datePart.split('/');
            if (parts.length < 3) return false;
            m = parseInt(parts[1]);
            y = parseInt(parts[2]);
        }

        // Peru Time for real-time comparison
        const realMonth = currentMonth;
        const realYear = currentYear;
        const isViewingCurrentMonth = targetMonth === realMonth && targetYear === realYear;

        let isTimeMatch = false;

        if (v.fechaPeriodo || finalStatuses.includes(estado)) {
            // Strict Month/Year match for closed deals or deals with explicit period
            isTimeMatch = (m === targetMonth && y === targetYear);
        } else {
            // Open deals without explicit period: ONLY show in the current real month
            // If viewing history (past months), hide them.
            if (isViewingCurrentMonth) {
                if (y < targetYear) isTimeMatch = true;
                else if (y === targetYear && m <= targetMonth) isTimeMatch = true;
            } else {
                isTimeMatch = false;
            }
        }

        if (!isTimeMatch) return false;

        // HR Role Filter: Only see ACTIVADO
        const userCargo = (session.user as any)?.cargo?.trim().toUpperCase();
        if (userCargo === 'RECURSOS HUMANOS') {
            if (estado !== 'ACTIVADO') return false;
        }

        if (estado === 'PENDIENTE APROBACION') return false;

        const ruc = (v.ruc || '').trim();
        const hasLines = (parseInt(v.lineas?.toString().replace(/,/g, '') || '0') || 0) > 0;
        const hasReason = (v.razonSocial || '').trim() !== '';

        if (estado === 'PENDIENTE' && !ruc && !hasLines && !hasReason) {
            return false;
        }

        return true;
    });

    // NEW: Separate personal sales from global period sales
    const personalVentas = periodVentas.filter(v => {
        if (isStandard) {
            const executiveName = (session.user.name || '').trim().toUpperCase();
            const saleExecutive = (v.ejecutivo || '').trim().toUpperCase();
            return saleExecutive === executiveName;
        }
        return true;
    });

    const goal = goalResult.goal || 1000;

    // Aggregation Logic refined based on user specific list
    const categories = [
        { label: 'RECHAZADO', color: '#ef4444', statuses: ['RECHAZADO', 'ERROR DE DATA', 'VENTA CAIDA', 'ANULADO'] },
        { label: 'NUEVOS INGRESOS', color: '#f97316', statuses: ['NUEVO INGRESO', 'PENDIENTE', 'NUEVO'] },
        { label: 'PENDIENTE INGRESOS', color: '#fb923c', statuses: ['PENDIENTE INGRESO'] },
        { label: 'INGRESADO', color: '#f59e0b', statuses: ['INGRESADO'] },
        { label: 'OBSERVADO POR ENTEL', color: '#eab308', statuses: ['OBSERVADO POR ENTEL', 'OBSERVADO', 'EN EVALUACION'] },
        { label: 'DESPACHO', color: '#84cc16', statuses: ['APROBADO', 'DESPACHO'] },
        { label: 'PENDIENTE ENVÍO', color: '#4ade80', statuses: ['PENDIENTE ENVÍO'] },
        { label: 'PROCESO DE ACTIVACION', color: '#22c55e', statuses: ['PROCESO DE ACTIVACION', 'EN PROCESO DE ACTIVACION', 'FLUXO', 'EN DESPACHO'] },
        { label: 'ACTIVADO', color: '#10b981', statuses: ['ACTIVADO'] },
    ];

    const safeParse = (val: any) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const s = String(val).trim();
        let clean = s.replace(/[^0-9,.]/g, '');
        if (!clean) return 0;

        const lastComma = clean.lastIndexOf(',');
        const lastDot = clean.lastIndexOf('.');

        if (lastComma > lastDot) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else if (lastDot > lastComma) {
            clean = clean.replace(/,/g, '');
        } else if (lastComma !== -1) {
            clean = clean.replace(',', '.');
        }
        return parseFloat(clean) || 0;
    };

    const reportData = categories.map(cat => {
        const filtered = personalVentas.filter(v => cat.statuses.includes(v.estado?.trim().toUpperCase()));
        const count = filtered.reduce((acc, v) => acc + safeParse(v.lineas), 0);
        const cfReal = filtered.reduce((acc, v) => acc + (safeParse(v.cargoFijo) / 1.18), 0);
        const salesCount = filtered.length;

        return {
            status: cat.label,
            label: cat.label,
            count,
            cfReal,
            salesCount,
            color: cat.color
        };
    });

    // Add TOTAL GENERAL (Excluding RECHAZADO)
    const totalLines = reportData.reduce((acc, rd) => rd.label !== 'RECHAZADO' ? acc + rd.count : acc, 0);
    const totalCF = reportData.reduce((acc, rd) => rd.label !== 'RECHAZADO' ? acc + rd.cfReal : acc, 0);
    const totalSales = reportData.reduce((acc, rd) => rd.label !== 'RECHAZADO' ? acc + rd.salesCount : acc, 0);

    reportData.push({
        status: 'TOTAL GENERAL',
        label: 'TOTAL GENERAL',
        count: totalLines,
        cfReal: totalCF,
        salesCount: totalSales,
        color: '#ffffff' // Neutral/Premium white for the total
    });

    // Executive Ranking Aggregation
    const userCache = UserCache.getInstance();
    await userCache.ensureInitialized();
    const allUsers = userCache.getAll();
    const standardUsers = allUsers.filter((u: any) => u.get('ROL')?.trim().toUpperCase() === 'STANDAR');

    const execMap: {
        [key: string]: {
            lineasActivas: number,
            cfTotalNet: number,
            lineasTotales: number,
            ventasActivas: number,
            ventasTotales: number,
            supervisor?: string,
            breakdown: { label: string, count: number, cfReal: number, salesCount: number, color: string }[]
        }
    } = {};

    const supMap: {
        [key: string]: {
            lineasActivas: number,
            cfTotalNet: number,
            lineasTotales: number,
            ventasActivas: number,
            ventasTotales: number,
            breakdown: { label: string, count: number, cfReal: number, salesCount: number, color: string }[]
        }
    } = {};

    // Initialize with all standard users
    standardUsers.forEach((u: any) => {
        const name = (u.get('NOMBRES COMPLETOS') || '').trim().toUpperCase();
        if (name) {
            execMap[name] = {
                lineasActivas: 0,
                cfTotalNet: 0,
                lineasTotales: 0,
                ventasActivas: 0,
                ventasTotales: 0,
                supervisor: (u.get('SUPERVISOR') || 'SIN SUPERVISOR').trim().toUpperCase(),
                breakdown: categories
                    .filter(c => c.label !== 'RECHAZADO')
                    .map(c => ({ label: c.label, count: 0, cfReal: 0, salesCount: 0, color: c.color }))
            };
        }
    });

    periodVentas.forEach(v => {
        const name = (v.ejecutivo || '').trim().toUpperCase();
        const supName = (v.supervisor || 'SIN SUPERVISOR').trim().toUpperCase();

        const estado = v.estado?.trim().toUpperCase();
        const isActivated = estado === 'ACTIVADO';
        const lineas = safeParse(v.lineas);
        const cf = safeParse(v.cargoFijo) / 1.18;

        // EXECUTIVE MAPPING
        if (name) {
            if (!execMap[name]) {
                // If the sale record has a supervisor, use it. 
                // A supervisor selling personally usually has their own name as supervisor in the sheet.
                let supervisor = supName;

                // Fallback for missing supervisor in record
                if (supervisor === 'SIN SUPERVISOR' || supervisor === 'DIRECTO') {
                    const userRow = standardUsers.find((u: any) => (u.get('NOMBRES COMPLETOS') || '').trim().toUpperCase() === name);
                    const userSup = (userRow?.get('SUPERVISOR') || '').trim().toUpperCase();
                    if (userSup && userSup !== 'DIRECTO') {
                        supervisor = userSup;
                    } else {
                        supervisor = name; // Self-supervised
                    }
                }

                execMap[name] = {
                    lineasActivas: 0,
                    cfTotalNet: 0,
                    lineasTotales: 0,
                    ventasActivas: 0,
                    ventasTotales: 0,
                    supervisor,
                    breakdown: categories
                        .filter(c => c.label !== 'RECHAZADO')
                        .map(c => ({ label: c.label, count: 0, cfReal: 0, salesCount: 0, color: c.color }))
                };
            }

            if (isActivated) {
                execMap[name].lineasActivas += lineas;
                execMap[name].cfTotalNet += cf;
                execMap[name].ventasActivas += 1;
            }

            const category = categories.find(c => c.statuses.includes(estado));

            // Re-evaluating lineasTotales: Count everything that isn't explicitly RECHAZADO
            // This ensures supervisors who make sales with "odd" statuses still show up.
            if (estado !== 'RECHAZADO') {
                execMap[name].lineasTotales += lineas;
                execMap[name].ventasTotales += 1;
                if (category) {
                    const bItem = execMap[name].breakdown.find(b => b.label === category.label);
                    if (bItem) {
                        bItem.count += lineas;
                        bItem.cfReal += cf;
                        bItem.salesCount += 1;
                    }
                }
            }
        }

        // SUPERVISOR MAPPING
        if (!supMap[supName]) {
            supMap[supName] = {
                lineasActivas: 0,
                cfTotalNet: 0,
                lineasTotales: 0,
                ventasActivas: 0,
                ventasTotales: 0,
                breakdown: categories
                    .filter(c => c.label !== 'RECHAZADO')
                    .map(c => ({ label: c.label, count: 0, cfReal: 0, salesCount: 0, color: c.color }))
            };
        }

        if (isActivated) {
            supMap[supName].lineasActivas += lineas;
            supMap[supName].cfTotalNet += cf;
            supMap[supName].ventasActivas += 1;
        }

        const supCategory = categories.find(c => c.statuses.includes(estado));
        if (supCategory && supCategory.label !== 'RECHAZADO') {
            supMap[supName].lineasTotales += lineas;
            supMap[supName].ventasTotales += 1;
            const bItem = supMap[supName].breakdown.find(b => b.label === supCategory.label);
            if (bItem) {
                bItem.count += lineas;
                bItem.cfReal += cf;
                bItem.salesCount += 1;
            }
        }
    });

    const rankingData = Object.entries(execMap).map(([name, stats]) => ({
        name,
        lineasActivas: stats.lineasActivas,
        cfTotalNet: stats.cfTotalNet,
        lineasTotales: stats.lineasTotales,
        ventasActivas: stats.ventasActivas,
        ventasTotales: stats.ventasTotales,
        statusBreakdown: stats.breakdown,
        supervisor: (stats as any).supervisor,
        arpu: stats.lineasActivas > 0 ? stats.cfTotalNet / stats.lineasActivas : 0
    })).sort((a: any, b: any) => b.cfTotalNet - a.cfTotalNet);

    const supRankingData = Object.entries(supMap).map(([name, stats]) => ({
        name,
        lineasActivas: stats.lineasActivas,
        cfTotalNet: stats.cfTotalNet,
        lineasTotales: stats.lineasTotales,
        ventasActivas: stats.ventasActivas,
        ventasTotales: stats.ventasTotales,
        statusBreakdown: stats.breakdown,
        arpu: stats.lineasActivas > 0 ? stats.cfTotalNet / stats.lineasActivas : 0
    })).sort((a: any, b: any) => b.lineasActivas - a.lineasActivas);

    return (
        <ReportDashboard
            rankingData={rankingData}
            supRankingData={supRankingData}
            rawVentas={personalVentas}
            reportData={reportData}
            isStandard={isStandard}
            userRole={userRole}
            userName={session.user.name || ''}
            goal={goal}
            selectedMonth={targetMonth}
            selectedYear={targetYear}
        />
    );
}
