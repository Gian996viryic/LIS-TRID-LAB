import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { generarReporteImpresion } from "../utils/impresionReporte"; 

export default function PortalConvenios({ convenioAuth, tokenUrl, onLogout }) {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // 🚀 ESTADOS DE FILTRO
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTiempo, setFiltroTiempo] = useState("historico"); 
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const ordenesPorPagina = 15; 

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroEstado, filtroTiempo, fechaInicio, fechaFin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarOrdenes();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaActual, busqueda, filtroEstado, filtroTiempo, fechaInicio, fechaFin]);

  async function cargarOrdenes() {
    setCargando(true);
    const desde = (paginaActual - 1) * ordenesPorPagina;
    const hasta = desde + ordenesPorPagina - 1;

    try {
      let query;

      if (tokenUrl) {
        query = supabase.rpc("verificar_orden_qr_seguro", { p_codigo_orden: tokenUrl }, { count: 'exact' });
      } else if (convenioAuth) {
        query = supabase.rpc("get_ordenes_convenio_seguro", {
          p_nombre: convenioAuth.nombre,
          p_pin: convenioAuth.pin_secreto
        }, { count: 'exact' });
      } else {
        setOrdenes([]);
        setCargando(false);
        return;
      }

      if (!tokenUrl) {
        if (busqueda) {
          query = query.or(`paciente_nombre.ilike.%${busqueda}%,paciente_cedula.ilike.%${busqueda}%`);
        }

        if (filtroEstado === "Validado") {
          query = query.eq("estado_validacion", "validado"); // Filtrado estricto si solo quieren Listos
        } else if (filtroEstado === "Pendiente") {
          query = query.neq("estado_validacion", "validado");
        }

        const hoy = new Date();
        if (filtroTiempo === "hoy") {
          const inicioDia = new Date(hoy.setHours(0, 0, 0, 0)).toISOString();
          query = query.gte("created_at", inicioDia);
        } else if (filtroTiempo === "semana") {
          const hace7Dias = new Date(hoy.setDate(hoy.getDate() - 7)).toISOString();
          query = query.gte("created_at", hace7Dias);
        } else if (filtroTiempo === "mes") {
          const hace30Dias = new Date(hoy.setDate(hoy.getDate() - 30)).toISOString();
          query = query.gte("created_at", hace30Dias);
        } else if (filtroTiempo === "personalizado" && fechaInicio && fechaFin) {
          const finDelDia = new Date(fechaFin);
          finDelDia.setHours(23, 59, 59, 999);
          query = query.gte("created_at", new Date(fechaInicio).toISOString())
                       .lte("created_at", finDelDia.toISOString());
        }
      }

      query = query.order("created_at", { ascending: false }).range(desde, hasta);

      const { data, count, error } = await query;
      if (error) throw error;
      
      setOrdenes(data || []);
      setTotalRegistros(count || 0);
    } catch (error) {
      toast.error(`Error BD: ${error.message}`);
    } finally {
      setCargando(false);
    }
  }

  const handleDescargar = async (orden) => {
    // Si la orden está pendiente, bloqueamos el intento
    if (orden.estado_validacion === 'pendiente') {
       return toast.error("Los resultados aún se encuentran en procesamiento.");
    }

    const toastId = toast.loading("Preparando documento...");
    try {
      let queryResultados;
      let queryCultivos;
      
      // 🚀 ASIGNAMOS LAS FUNCIONES SQL SEGÚN SI ES QR O LOGIN
      if (tokenUrl) {
        queryResultados = supabase.rpc("get_resultados_qr_seguro", { p_codigo_orden: tokenUrl });
        queryCultivos = supabase.rpc("get_cultivos_qr_seguro", { p_codigo_orden: tokenUrl });
      } else {
        queryResultados = supabase.rpc("get_resultados_orden_convenio", {
          p_orden_id: orden.id,
          p_nombre_convenio: convenioAuth.nombre,
          p_pin: convenioAuth.pin_secreto
        });
        queryCultivos = supabase.rpc("get_cultivos_orden_convenio", {
          p_orden_id: orden.id,
          p_nombre_convenio: convenioAuth.nombre,
          p_pin: convenioAuth.pin_secreto
        });
      }

      // Descargamos AMBAS tablas al mismo tiempo para ganar velocidad
      const [resObj, cultObj] = await Promise.all([queryResultados, queryCultivos]);

      if (resObj.error) throw resObj.error;

      let cult = [];
      if (cultObj.error) {
          console.warn("Aviso SQL Cultivos:", cultObj.error);
          toast.error("Falta ejecutar código SQL de convenios.", { id: toastId });
      } else {
          cult = cultObj.data || [];
      }

      // 🚀 PASAMOS TODO AL REPORTE
      await generarReporteImpresion({ 
          ordenSeleccionada: orden, 
          resultados: resObj.data || [], 
          cultivosExternos: cult || []
      });
      
      toast.dismiss(toastId);
    } catch (err) {
      toast.error(`Error al generar PDF: ${err.message}`, { id: toastId });
    }
  };

  const totalPaginas = Math.ceil(totalRegistros / ordenesPorPagina) || 1;
  const desdeItem = (paginaActual - 1) * ordenesPorPagina;

  return (
    <div className="portal-convenios-wrapper">
      <Toaster position="top-right" />
      
      <style>{`
        .portal-convenios-wrapper { 
          position: fixed !important; 
          top: 0; left: 0; right: 0; bottom: 0;
          overflow-y: auto !important; 
          overflow-x: hidden; 
          background: #0a0514; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #f8fafc; 
          -webkit-overflow-scrolling: touch;
          z-index: 9999;
        }
        .pc-navbar { background: #140d2b; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        .pc-brand { display: flex; align-items: center; gap: 15px; }
        .pc-logo { height: 35px; filter: drop-shadow(0 0 5px rgba(255,255,255,0.3)); }
        .pc-title { margin: 0; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; color: #06b6d4; }
        .pc-subtitle { font-size: 11px; color: #06b6d4; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold; }
        .pc-user-info { display: flex; align-items: center; gap: 20px; }
        .pc-logout-btn { background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .pc-logout-btn:hover { background: rgba(239, 68, 68, 0.1); }
        .pc-content { 
          padding: 30px; 
          max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; flex: 1; 
        }
        .pc-page-header { margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 15px; }
        .pc-filters-glass { background: rgba(20, 13, 43, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 25px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: end; }
        .pc-input-group { display: flex; flex-direction: column; gap: 6px; }
        .pc-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
        .pc-input, .pc-select { background: #0a0514; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px 15px; border-radius: 8px; font-size: 13px; outline: none; transition: 0.2s; }
        .pc-input:focus, .pc-select:focus { border-color: #06b6d4; box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2); }
        .pc-table-container { background: #140d2b; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow-x: auto; }
        .pc-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .pc-table th { background: rgba(0,0,0,0.3); color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 15px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .pc-table td { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; color: #e2e8f0; vertical-align: middle; }
        .pc-table tr:hover { background: rgba(255,255,255,0.02); }
        .pc-badge { 
          padding: 4px 10px; 
          border-radius: 20px; 
          font-size: 11px; 
          font-weight: 700; 
          text-transform: uppercase; 
          white-space: nowrap; 
        }
        .badge-validado { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-parcial { background: rgba(14, 165, 233, 0.15); color: #22d3ee; border: 1px solid rgba(14, 165, 233, 0.3); } /* Cyan brillante para el convenio */
        .badge-pendiente { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .pc-btn-action { background: rgba(6, 182, 212, 0.1); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 5px; justify-content: center; }
        .pc-btn-action:hover:not(:disabled) { background: rgba(6, 182, 212, 0.2); }
        .pc-btn-action:disabled { opacity: 0.4; cursor: not-allowed; border-color: rgba(255,255,255,0.1); color: #94a3b8; }
        .pc-pagination { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05); }
        .pc-page-info { font-size: 13px; color: #94a3b8; }
        .pc-page-controls { display: flex; align-items: center; gap: 12px; }
        .pc-page-btn { background: #0a0514; color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .pc-page-btn:hover:not(:disabled) { border-color: #06b6d4; color: #06b6d4; }
        .pc-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        @media (max-width: 768px) {
          .pc-navbar { position: relative; flex-direction: column; gap: 15px; padding: 15px; }
          .pc-user-info { width: 100%; justify-content: space-between; }
          .pc-content { padding: 15px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
          .pc-page-header h2 { font-size: 20px; }
          .pc-filters-glass { grid-template-columns: 1fr; }
          .pc-pagination { flex-direction: column; gap: 15px; text-align: center; }
        }
      `}</style>

      <nav className="pc-navbar">
        <div className="pc-brand">
          <img src="/logo-tridlab.png" alt="TridLab" className="pc-logo" />
          <div><h1 className="pc-title">TRIDLAB WEB</h1><div className="pc-subtitle">Convenio</div></div>
        </div>
        <div className="pc-user-info">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{convenioAuth ? convenioAuth.nombre : (ordenes[0]?.procedencia || "Cargando...")}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{tokenUrl ? "Documento Verificado" : "Institución Autorizada"}</div>
          </div>
          {tokenUrl ? (
            <button className="pc-logout-btn" style={{ borderColor: '#06b6d4', color: '#06b6d4' }} onClick={() => window.location.href = '/convenios'}>Ir al Login</button>
          ) : (
            <button className="pc-logout-btn" onClick={onLogout}>Cerrar Sesión</button>
          )}
        </div>
      </nav>

      <main className="pc-content">
        <div className="pc-page-header">
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#ffffff' }}>Resultados de Pacientes</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>{tokenUrl ? "Validación de documento oficial del laboratorio." : "Gestione y descargue los análisis vinculados a su institución."}</p>
          </div>
          {!tokenUrl && (
            <button onClick={cargarOrdenes} className="pc-btn-action" style={{ padding: '10px 15px' }}>↻ Actualizar Datos</button>
          )}
        </div>

        {!tokenUrl && (
          <div className="pc-filters-glass">
            <div className="pc-input-group"><label className="pc-label">Buscar Paciente / Cédula</label><input type="text" className="pc-input" placeholder="Ej. Juan Pérez..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
            <div className="pc-input-group">
              <label className="pc-label">Estado del Examen</label>
              <select className="pc-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="Todos">Todos los estados</option>
                <option value="Validado">Validados (Listos)</option>
                <option value="Pendiente">Pendientes (En proceso)</option>
              </select>
            </div>
            <div className="pc-input-group">
              <label className="pc-label">Rango de Tiempo</label>
              <select className="pc-select" value={filtroTiempo} onChange={(e) => setFiltroTiempo(e.target.value)}>
                <option value="historico">Histórico Completo</option>
                <option value="hoy">Hoy</option>
                <option value="semana">Últimos 7 días</option>
                <option value="mes">Últimos 30 días</option>
                <option value="personalizado">Fechas Personalizadas...</option>
              </select>
            </div>
            {filtroTiempo === "personalizado" && (
              <><div className="pc-input-group"><label className="pc-label">Desde</label><input type="date" className="pc-input" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></div><div className="pc-input-group"><label className="pc-label">Hasta</label><input type="date" className="pc-input" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></div></>
            )}
          </div>
        )}

        <div className="pc-table-container">
          <table className="pc-table">
            <thead>
              <tr><th>N° Orden</th><th>Fecha Ingreso</th><th>Paciente</th><th>Estado</th><th style={{ textAlign: 'center' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Obteniendo información cifrada...</td></tr>
              ) : ordenes.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No se encontraron órdenes para esta institución con los filtros actuales.</td></tr>
              ) : (
                ordenes.map((orden) => {
                  
                  // LÓGICA DE ETIQUETAS (Igual a Pacientes)
                  const estadoBadge = orden.estado_validacion || 'pendiente';
                  let classBadge = 'badge-pendiente'; let textoBadge = 'EN PROCESO';
                  
                  if (estadoBadge === 'validado') { classBadge = 'badge-validado'; textoBadge = 'VALIDADO'; } 
                  else if (estadoBadge === 'parcial') { classBadge = 'badge-parcial'; textoBadge = 'LISTO PARCIALMENTE'; }
                  
                  const puede_descargar = estadoBadge !== 'pendiente';

                  return (
                    <tr key={orden.id}>
                      <td style={{ fontWeight: 'bold', color: '#06b6d4' }}>{orden.codigo_orden}</td>
                      <td>{new Date(orden.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td><div style={{ fontWeight: 'bold' }}>{orden.paciente_nombre}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {orden.paciente_cedula}</div></td>
                      <td>
                        <span className={`pc-badge ${classBadge}`}>{textoBadge}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button className="pc-btn-action" onClick={() => handleDescargar(orden)} disabled={!puede_descargar}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> 
                            Ver PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {!cargando && totalRegistros > 0 && !tokenUrl && (
            <div className="pc-pagination">
              <span className="pc-page-info">
                Mostrando <b>{desdeItem + 1}</b> a <b>{Math.min(desdeItem + ordenesPorPagina, totalRegistros)}</b> de <b>{totalRegistros}</b> órdenes
              </span>
              <div className="pc-page-controls">
                <button className="pc-page-btn" onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))} disabled={paginaActual === 1}>Anterior</button>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e2e8f0', minWidth: '90px', textAlign: 'center' }}>Página {paginaActual} de {totalPaginas}</span>
                <button className="pc-page-btn" onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaActual >= totalPaginas}>Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}