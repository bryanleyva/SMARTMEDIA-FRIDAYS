export interface PipelineColumn {
    id: string;
    label: string;
    percent: string;
    color: string;
    bg: string;
    glow: string;
}

export const COLUMNS: PipelineColumn[] = [
    {
        id: 'INTERESADO',
        label: 'Interesado',
        percent: '25%',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.05)',
        glow: 'rgba(245, 158, 11, 0.2)'
    },
    {
        id: 'NEGOCIACION',
        label: 'Negociación',
        percent: '50%',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.05)',
        glow: 'rgba(16, 185, 129, 0.2)'
    },
    {
        id: 'SI VERBAL',
        label: 'Si Verbal',
        percent: '75%',
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.05)',
        glow: 'rgba(59, 130, 246, 0.2)'
    },
    {
        id: 'NUEVO INGRESO',
        label: 'Nuevo Ingreso',
        percent: '100%',
        color: '#ec4899',
        bg: 'rgba(236, 72, 153, 0.05)',
        glow: 'rgba(236, 72, 153, 0.2)'
    },
    {
        id: 'VENTA SUBIDA',
        label: 'Venta Subida',
        percent: 'DONE',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.05)',
        glow: 'rgba(139, 92, 246, 0.2)'
    }
];
