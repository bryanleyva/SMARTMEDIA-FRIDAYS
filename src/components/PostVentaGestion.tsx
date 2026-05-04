'use client';

import { useState, useEffect, useTransition } from 'react';
import { PostVentaRecord } from '@/app/actions/postventa';
import { PostVentaObservacion, savePostVentaObservacion, getPostVentaHistorial } from '@/app/actions/postventa-actions';
import { AppSwal } from '@/lib/sweetalert';

interface Props {
    cuentas: PostVentaRecord[];
    usuario: string;
    prevMonth: string;
}

type Vista = 'gestion' | 'historial';

const SEG_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
    'SOHO':      { bg: '#6366f115', text: '#818cf8', glow: '#6366f140' },
    'LOW PYME':  { bg: '#0ea5e915', text: '#38bdf8', glow: '#0ea5e940' },
    'HIGH PYME': { bg: '#8b5cf615', text: '#a78bfa', glow: '#8b5cf640' },
    'GRANDES':   { bg: '#f59e0b15', text: '#fbbf24', glow: '#f59e0b40' },
    'CORPOS':    { bg: '#10b98115', text: '#34d399', glow: '#10b98140' },
};
const getSeg = (s: string) => SEG_COLORS[s?.toUpperCase()] ?? { bg: '#ffffff08', text: '#94a3b8', glow: '#ffffff20' };

export default function PostVentaGestion({ cuentas, usuario, prevMonth }: Props) {
    const [vista, setVista] = useState<Vista>('gestion');
    const [idx, setIdx] = useState(0);
    const [obs, setObs] = useState('');
    const [guardadas, setGuardadas] = useState<Set<string>>(new Set());
    const [historial, setHistorial] = useState<PostVentaObservacion[]>([]);
    const [loadingHist, setLoadingHist] = useState(false);
    const [isPending, startTransition] = useTransition();

    const cuenta = cuentas[idx] ?? null;
    const total = cuentas.length;
    const progreso = total > 0 ? Math.round((guardadas.size / total) * 100) : 0;
    const segColor = cuenta ? getSeg(cuenta.segmento) : getSeg('');
    const yaGuardada = cuenta ? guardadas.has(cuenta.ruc) : false;
    const terminado = guardadas.size === total && total > 0;

    // Cargar historial cuando cambia de vista
    useEffect(() => {
        if (vista === 'historial') {
            setLoadingHist(true);
            getPostVentaHistorial(usuario).then(r => {
                if (r.success) setHistorial(r.data ?? []);
                setLoadingHist(false);
            });
        }
    }, [vista, usuario]);

    // Limpiar observación al cambiar de cuenta
    useEffect(() => { setObs(''); }, [idx]);

    const handleGuardar = () => {
        if (!obs.trim()) {
            AppSwal.fire({ icon: 'warning', title: 'Escribe una observación', text: 'Debes ingresar una observación antes de continuar.', confirmButtonColor: '#10b981' });
            return;
        }
        if (!cuenta) return;

        startTransition(async () => {
            const res = await savePostVentaObservacion({
                ruc: cuenta.ruc,
                razonSocial: cuenta.razonSocial,
                telefono: cuenta.telefono,
                ejecutivoOriginal: cuenta.ejecutivo,
                lineas: cuenta.lineas,
                cargoFijo: cuenta.cargoFijo,
                segmento: cuenta.segmento,
                observacion: obs.trim(),
                usuario,
            });

            if (res.success) {
                setGuardadas(prev => new Set([...prev, cuenta.ruc]));
                // Avanzar automáticamente si no es la última
                if (idx < total - 1) {
                    setTimeout(() => setIdx(i => i + 1), 600);
                }
            } else {
                AppSwal.fire({ icon: 'error', title: 'Error', text: res.error ?? 'No se pudo guardar', confirmButtonColor: '#ef4444' });
            }
        });
    };

    const handleSiguiente = () => {
        if (idx < total - 1) setIdx(i => i + 1);
    };

    const handleAnterior = () => {
        if (idx > 0) setIdx(i => i - 1);
    };

    return (
        <div style={{ color: 'white', maxWidth: '820px', margin: '0 auto' }}>
            <style>{`
                /* ── tabs ── */
                .pv-tabs { display:flex; gap:0.5rem; margin-bottom:2rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:1rem; padding:4px; width:fit-content; }
                .pv-tab { padding:8px 20px; border-radius:0.75rem; font-size:0.8rem; font-weight:800; letter-spacing:0.05em; cursor:pointer; border:none; background:transparent; color:#64748b; transition:all 0.2s; text-transform:uppercase; }
                .pv-tab.active { background:rgba(16,185,129,0.15); color:#34d399; box-shadow:inset 0 0 0 1px rgba(16,185,129,0.3); }

                /* ── progress ── */
                .pv-progress-wrap { margin-bottom:1.75rem; }
                .pv-progress-labels { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; }
                .pv-progress-text { font-size:0.72rem; font-weight:800; color:#64748b; letter-spacing:0.06em; text-transform:uppercase; }
                .pv-progress-count { font-size:0.8rem; font-weight:900; color:#34d399; }
                .pv-bar-bg { height:6px; background:rgba(255,255,255,0.06); border-radius:999px; overflow:hidden; }
                .pv-bar-fill { height:100%; background:linear-gradient(90deg,#10b981,#34d399); border-radius:999px; transition:width 0.6s cubic-bezier(0.4,0,0.2,1); }

                /* ── card de cuenta ── */
                .pv-cuenta-card { border-radius:1.5rem; overflow:hidden; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.025); margin-bottom:1.25rem; transition:border-color 0.3s; }
                .pv-cuenta-card.guardada { border-color:rgba(16,185,129,0.35); background:rgba(16,185,129,0.03); }
                .pv-cuenta-top { padding:1.75rem 2rem 1.25rem; display:flex; align-items:flex-start; gap:1.25rem; }
                .pv-cuenta-avatar { width:52px; height:52px; border-radius:1rem; display:flex; align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0; }
                .pv-cuenta-info { flex:1; min-width:0; }
                .pv-cuenta-ruc { font-size:0.68rem; font-weight:900; color:#475569; letter-spacing:0.12em; margin-bottom:3px; display:flex; align-items:center; gap:0.5rem; }
                .pv-ruc-tag { font-size:0.58rem; padding:2px 8px; border-radius:999px; font-weight:900; }
                .pv-ruc10 { background:rgba(99,102,241,0.2); color:#818cf8; border:1px solid rgba(99,102,241,0.3); }
                .pv-ruc20 { background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.25); }
                .pv-cuenta-nombre { font-size:1.3rem; font-weight:950; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:-0.01em; }
                .pv-cuenta-seg { display:inline-block; font-size:0.62rem; font-weight:900; padding:3px 10px; border-radius:999px; margin-top:6px; letter-spacing:0.05em; }
                .pv-cuenta-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; border-top:1px solid rgba(255,255,255,0.05); }
                .pv-data-cell { padding:1rem 2rem; border-right:1px solid rgba(255,255,255,0.04); }
                .pv-data-cell:last-child { border-right:none; }
                .pv-data-label { font-size:0.6rem; font-weight:900; color:#475569; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px; }
                .pv-data-value { font-size:0.95rem; font-weight:700; color:#e2e8f0; }
                .pv-data-value.tel { color:#38bdf8; font-size:1.05rem; }

                /* ── observacion ── */
                .pv-obs-wrap { margin-bottom:1.25rem; }
                .pv-obs-label { font-size:0.7rem; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem; }
                .pv-obs-required { color:#f43f5e; font-size:0.9rem; }
                .pv-obs-textarea { width:100%; min-height:110px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:1rem; padding:1rem 1.25rem; color:white; font-size:0.9rem; resize:vertical; outline:none; transition:border-color 0.2s, box-shadow 0.2s; font-family:inherit; box-sizing:border-box; }
                .pv-obs-textarea:focus { border-color:rgba(16,185,129,0.5); box-shadow:0 0 0 3px rgba(16,185,129,0.08); }
                .pv-obs-textarea::placeholder { color:#334155; }
                .pv-obs-textarea:disabled { opacity:0.5; cursor:not-allowed; }

                /* ── acciones ── */
                .pv-actions { display:flex; gap:0.75rem; align-items:center; }
                .pv-btn { padding:12px 24px; border-radius:0.875rem; font-size:0.82rem; font-weight:800; cursor:pointer; border:none; letter-spacing:0.04em; text-transform:uppercase; transition:all 0.2s; display:flex; align-items:center; gap:0.5rem; }
                .pv-btn:disabled { opacity:0.35; cursor:not-allowed; transform:none !important; }
                .pv-btn-guardar { background:linear-gradient(135deg,#10b981,#059669); color:white; flex:1; justify-content:center; box-shadow:0 4px 15px rgba(16,185,129,0.25); }
                .pv-btn-guardar:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(16,185,129,0.35); }
                .pv-btn-nav { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:#94a3b8; padding:12px 16px; }
                .pv-btn-nav:not(:disabled):hover { background:rgba(255,255,255,0.09); color:white; }
                .pv-btn-siguiente { background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); color:#818cf8; }
                .pv-btn-siguiente:not(:disabled):hover { background:rgba(99,102,241,0.25); }

                /* ── guardada badge ── */
                .pv-saved-badge { display:flex; align-items:center; gap:0.5rem; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.25); border-radius:0.75rem; padding:10px 16px; color:#34d399; font-size:0.8rem; font-weight:800; }

                /* ── terminado ── */
                .pv-done { text-align:center; padding:4rem 2rem; }
                .pv-done-icon { font-size:4rem; margin-bottom:1rem; }
                .pv-done-title { font-size:2rem; font-weight:950; color:white; margin:0 0 0.5rem; }
                .pv-done-sub { color:#64748b; font-size:0.95rem; }

                /* ── historial ── */
                .pv-hist-grid { display:flex; flex-direction:column; gap:0.75rem; }
                .pv-hist-card { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.07); border-radius:1.25rem; padding:1.25rem 1.5rem; }
                .pv-hist-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; gap:1rem; }
                .pv-hist-nombre { font-size:0.95rem; font-weight:800; color:white; }
                .pv-hist-ruc { font-size:0.68rem; font-weight:700; color:#475569; }
                .pv-hist-fecha { font-size:0.68rem; color:#475569; white-space:nowrap; }
                .pv-hist-obs { font-size:0.85rem; color:#94a3b8; line-height:1.5; background:rgba(255,255,255,0.03); border-radius:0.75rem; padding:0.75rem 1rem; border-left:3px solid rgba(16,185,129,0.4); }
                .pv-hist-meta { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.6rem; }
                .pv-hist-chip { font-size:0.65rem; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:999px; padding:3px 10px; }
                .pv-empty-hist { text-align:center; padding:3rem; color:#475569; }

                /* ── nav dots ── */
                .pv-nav-info { display:flex; align-items:center; gap:0.5rem; margin-left:auto; }
                .pv-nav-num { font-size:0.78rem; font-weight:800; color:#475569; }

                /* spinner */
                @keyframes spin { to { transform:rotate(360deg); } }
                .pv-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.2); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }
            `}</style>

            {/* ── TABS ── */}
            <div className="pv-tabs">
                <button className={`pv-tab ${vista === 'gestion' ? 'active' : ''}`} onClick={() => setVista('gestion')}>
                    📞 Gestión
                </button>
                <button className={`pv-tab ${vista === 'historial' ? 'active' : ''}`} onClick={() => setVista('historial')}>
                    📋 Mis registros
                </button>
            </div>

            {/* ══════════ VISTA GESTIÓN ══════════ */}
            {vista === 'gestion' && (
                <>
                    {total === 0 ? (
                        <div className="pv-done">
                            <div className="pv-done-icon">📭</div>
                            <div className="pv-done-title">Sin cuentas este mes</div>
                            <div className="pv-done-sub">No hay ventas ACTIVADAS en {prevMonth}</div>
                        </div>
                    ) : terminado ? (
                        <div className="pv-done">
                            <div className="pv-done-icon">🎉</div>
                            <div className="pv-done-title">¡Gestión completada!</div>
                            <div className="pv-done-sub">Llamaste y registraste las {total} cuentas de {prevMonth}</div>
                            <button className="pv-btn pv-btn-siguiente" style={{ margin:'1.5rem auto 0', display:'flex' }} onClick={() => setVista('historial')}>
                                Ver mis registros →
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* PROGRESS */}
                            <div className="pv-progress-wrap">
                                <div className="pv-progress-labels">
                                    <span className="pv-progress-text">Progreso de llamadas — {prevMonth}</span>
                                    <span className="pv-progress-count">{guardadas.size} / {total}</span>
                                </div>
                                <div className="pv-bar-bg">
                                    <div className="pv-bar-fill" style={{ width: `${progreso}%` }} />
                                </div>
                            </div>

                            {/* CUENTA CARD */}
                            {cuenta && (
                                <div className={`pv-cuenta-card ${yaGuardada ? 'guardada' : ''}`}
                                     style={{ boxShadow: yaGuardada ? `0 0 30px ${segColor.glow}` : 'none' }}>
                                    <div className="pv-cuenta-top">
                                        <div className="pv-cuenta-avatar"
                                             style={{ background: segColor.bg, border: `1px solid ${segColor.glow}` }}>
                                            {cuenta.isRuc10 ? '👤' : '🏢'}
                                        </div>
                                        <div className="pv-cuenta-info">
                                            <div className="pv-cuenta-ruc">
                                                {cuenta.ruc}
                                                <span className={`pv-ruc-tag ${cuenta.isRuc10 ? 'pv-ruc10' : 'pv-ruc20'}`}>
                                                    {cuenta.isRuc10 ? 'RUC 10' : 'RUC 20'}
                                                </span>
                                            </div>
                                            <div className="pv-cuenta-nombre" title={cuenta.razonSocial}>
                                                {cuenta.razonSocial}
                                            </div>
                                            {cuenta.segmento && (
                                                <span className="pv-cuenta-seg"
                                                      style={{ background: segColor.bg, color: segColor.text, border: `1px solid ${segColor.glow}` }}>
                                                    {cuenta.segmento}
                                                </span>
                                            )}
                                        </div>
                                        {/* número de cuenta */}
                                        <div style={{ textAlign:'right', flexShrink:0 }}>
                                            <div style={{ fontSize:'0.65rem', fontWeight:900, color:'#334155', textTransform:'uppercase', letterSpacing:'0.08em' }}>Cuenta</div>
                                            <div style={{ fontSize:'2rem', fontWeight:950, color:'#1e293b', lineHeight:1 }}>
                                                <span style={{ color:'white' }}>{idx + 1}</span>
                                                <span style={{ fontSize:'1rem', color:'#334155' }}>/{total}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DATA CELLS */}
                                    <div className="pv-cuenta-grid">
                                        <div className="pv-data-cell">
                                            <div className="pv-data-label">📞 Teléfono</div>
                                            <div className="pv-data-value tel">{cuenta.telefono || '—'}</div>
                                        </div>
                                        <div className="pv-data-cell">
                                            <div className="pv-data-label">📶 Líneas</div>
                                            <div className="pv-data-value">{cuenta.lineas || '—'}</div>
                                        </div>
                                        <div className="pv-data-cell">
                                            <div className="pv-data-label">💰 Cargo Fijo</div>
                                            <div className="pv-data-value">S/ {cuenta.cargoFijo || '—'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* OBSERVACIÓN */}
                            <div className="pv-obs-wrap">
                                <div className="pv-obs-label">
                                    Observación de la llamada <span className="pv-obs-required">*</span>
                                </div>
                                {yaGuardada ? (
                                    <div className="pv-saved-badge">
                                        ✅ Observación guardada correctamente
                                    </div>
                                ) : (
                                    <textarea
                                        className="pv-obs-textarea"
                                        placeholder="Ej: Cliente atendió, confirma que ya está activado. Conforme con el servicio..."
                                        value={obs}
                                        onChange={e => setObs(e.target.value)}
                                        disabled={isPending}
                                    />
                                )}
                            </div>

                            {/* BOTONES */}
                            <div className="pv-actions">
                                <button
                                    className="pv-btn pv-btn-nav"
                                    onClick={handleAnterior}
                                    disabled={idx === 0}
                                    title="Cuenta anterior"
                                >
                                    ←
                                </button>

                                {yaGuardada ? (
                                    <button
                                        className="pv-btn pv-btn-siguiente"
                                        onClick={handleSiguiente}
                                        disabled={idx === total - 1}
                                        style={{ flex: 1, justifyContent: 'center' }}
                                    >
                                        Siguiente cuenta →
                                    </button>
                                ) : (
                                    <button
                                        className="pv-btn pv-btn-guardar"
                                        onClick={handleGuardar}
                                        disabled={isPending || !obs.trim()}
                                    >
                                        {isPending ? (
                                            <><div className="pv-spinner" /> Guardando...</>
                                        ) : (
                                            <>✓ Guardar y continuar</>
                                        )}
                                    </button>
                                )}

                                <button
                                    className="pv-btn pv-btn-nav"
                                    onClick={handleSiguiente}
                                    disabled={idx === total - 1}
                                    title="Saltar cuenta (sin guardar)"
                                >
                                    →
                                </button>
                            </div>

                            <div style={{ textAlign:'center', marginTop:'0.75rem', fontSize:'0.65rem', color:'#1e293b', fontWeight:700 }}>
                                La flecha → salta sin guardar · Debes escribir observación para registrar la llamada
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ══════════ VISTA HISTORIAL ══════════ */}
            {vista === 'historial' && (
                <>
                    <div style={{ marginBottom:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <h2 style={{ margin:0, fontSize:'1.1rem', fontWeight:900, color:'white' }}>
                            Mis llamadas registradas
                        </h2>
                        <span style={{ fontSize:'0.72rem', color:'#475569', fontWeight:700 }}>
                            {historial.length} registros
                        </span>
                    </div>

                    {loadingHist ? (
                        <div style={{ textAlign:'center', padding:'3rem', color:'#475569' }}>
                            <div className="pv-spinner" style={{ margin:'0 auto 1rem', width:30, height:30, borderWidth:3 }} />
                            Cargando historial...
                        </div>
                    ) : historial.length === 0 ? (
                        <div className="pv-empty-hist">
                            <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>📋</div>
                            <div style={{ fontWeight:700, color:'#64748b' }}>Aún no tienes registros</div>
                            <div style={{ fontSize:'0.82rem', marginTop:'0.4rem' }}>Empieza a gestionar cuentas en la pestaña Gestión</div>
                        </div>
                    ) : (
                        <div className="pv-hist-grid">
                            {historial.map((h, i) => {
                                const sc = getSeg(h.segmento);
                                return (
                                    <div className="pv-hist-card" key={i}>
                                        <div className="pv-hist-header">
                                            <div>
                                                <div className="pv-hist-nombre">{h.razonSocial}</div>
                                                <div className="pv-hist-ruc">{h.ruc}</div>
                                            </div>
                                            <div className="pv-hist-fecha">{h.fecha}</div>
                                        </div>
                                        <div className="pv-hist-obs">{h.observacion}</div>
                                        <div className="pv-hist-meta">
                                            {h.segmento && (
                                                <span className="pv-hist-chip" style={{ color: sc.text, borderColor: sc.glow }}>
                                                    {h.segmento}
                                                </span>
                                            )}
                                            {h.telefono && <span className="pv-hist-chip">📞 {h.telefono}</span>}
                                            {h.lineas && <span className="pv-hist-chip">📶 {h.lineas} líneas</span>}
                                            {h.ejecutivoOriginal && <span className="pv-hist-chip">👤 {h.ejecutivoOriginal}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}