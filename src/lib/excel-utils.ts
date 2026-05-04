import { AppSwal } from '@/lib/sweetalert';

export async function exportVentasToExcel(filteredVentas: any[], selectedMonth: number, selectedYear: number) {
    if (filteredVentas.length === 0) {
        AppSwal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay ventas para exportar con los filtros actuales.' });
        return;
    }

    try {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ventas');

        // Columnas
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Ejecutivo', key: 'ejecutivo', width: 20 },
            { header: 'Supervisor', key: 'supervisor', width: 20 },
            { header: 'Fecha', key: 'fecha', width: 15 },
            { header: 'Estado', key: 'estado', width: 20 },
            { header: 'RUC', key: 'ruc', width: 15 },
            { header: 'Razón Social', key: 'razonSocial', width: 30 },
            { header: 'Departamento', key: 'departamento', width: 15 },
            { header: 'Provincia', key: 'provincia', width: 15 },
            { header: 'Distrito', key: 'distrito', width: 15 },
            { header: 'Dirección', key: 'direccion', width: 30 },
            { header: 'Correo', key: 'correo', width: 25 },
            { header: 'Segmento', key: 'segmento', width: 15 },
            { header: 'Producto', key: 'producto', width: 20 },
            { header: 'Proceso', key: 'proceso', width: 15 },
            { header: 'Detalle', key: 'detalle', width: 15 },
            { header: 'Líneas', key: 'lineas', width: 10 },
            { header: 'Cargo Fijo', key: 'cargoFijo', width: 15 },
            { header: 'DNI Titular', key: 'dni', width: 15 },
            { header: 'Contacto', key: 'contacto', width: 20 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Tipo Venta', key: 'tipoVenta', width: 15 },
            { header: 'SR Ingreso', key: 'srIngreso', width: 15 },
            { header: 'Num Orden', key: 'numOrden', width: 15 },
            { header: 'Fecha Activación', key: 'fechaActivacion', width: 15 },
            { header: 'Fecha Inicio', key: 'fechaInicio', width: 20 },
            { header: 'Fecha Fin', key: 'fechaFin', width: 20 },
            { header: 'Período Reporte', key: 'fechaPeriodo', width: 20 },
            { header: 'Observación Mesa', key: 'observacion', width: 30 },
            { header: 'Aprobación Sup', key: 'aprobacion', width: 15 },
        ];

        // Header Style
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF10B981' }
        };

        // Add Data
        filteredVentas.forEach(v => {
            worksheet.addRow({
                ...v,
                cargoFijo: parseFloat(v.cargoFijo?.toString().replace(/,/g, '') || '0')
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Ventas_Lishing_${selectedMonth}_${selectedYear}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting to excel:', error);
        AppSwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el archivo Excel.' });
    }
}
