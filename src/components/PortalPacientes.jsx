import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../supabaseClient";
import { generarReporteImpresion } from "../utils/impresionReporte"; 

const TECH_THEME = {
  bgDark: "#0f172a", accentBlue: "#0ea5e9", accentPurple: "#d946ef", accentGreen: "#4ade80", 
  glassBg: "rgba(15, 23, 42, 0.7)", glassBorder: "rgba(255, 255, 255, 0.08)", textWhite: "#ffffff", textCyan: "#22d3ee",
};

export default function PortalPacientes({ pacienteAuth, onLogout }) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTiempo, setFiltroTiempo] = useState("historico"); 
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const ordenesPorPagina = 10; 

  useEffect(() => { setPaginaActual(1); }, [busqueda, filtroEstado, filtroTiempo, fechaInicio, fechaFin]);

  useEffect(() => { 
    const timer = setTimeout(() => { cargarHistorial(); }, 400);
    return () => clearTimeout(timer);
  }, [paginaActual, busqueda, filtroEstado, filtroTiempo, fechaInicio, fechaFin]);

  async function cargarHistorial() {
    setLoading(true);
    const desde = (paginaActual - 1) * ordenesPorPagina;
    const hasta = desde + ordenesPorPagina - 1;

    try {
      let query = supabase.rpc("get_ordenes_paciente_seguro", { p_cedula: pacienteAuth.cedula.trim(), p_pin: pacienteAuth.pin_secreto }, { count: 'exact' });

      if (busqueda) query = query.ilike('codigo_orden', `%${busqueda}%`);

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
        const finDelDia = new Date(fechaFin); finDelDia.setHours(23, 59, 59, 999);
        query = query.gte("created_at", new Date(fechaInicio).toISOString()).lte("created_at", finDelDia.toISOString());
      }

      query = query.order("created_at", { ascending: false }).range(desde, hasta);

      const { data, count, error } = await query;
      if (error) throw error;
      
      // 🚀 CONFIANZA TOTAL EN EL ESTADO DE LA ORDEN (Sin doble conteos)
      let ordenesFinales = (data || []).map(orden => {
          const estadoReal = orden.estado_validacion || 'pendiente';
          return {
             ...orden,
             estado_validacion_real: estadoReal,
             puede_descargar: estadoReal !== 'pendiente'
          };
      });

      if (filtroEstado === "Validado") ordenesFinales = ordenesFinales.filter(o => o.estado_validacion_real === 'validado' || o.estado_validacion_real === 'parcial');
      else if (filtroEstado === "Pendiente") ordenesFinales = ordenesFinales.filter(o => o.estado_validacion_real === 'pendiente');

      setOrdenes(ordenesFinales); setTotalRegistros(count || 0);
    } catch (error) { toast.error("Error al conectar con el laboratorio."); } finally { setLoading(false); }
  }

  const handleDescargar = async (orden) => {
    if (!orden.puede_descargar) return toast.error("Los resultados aún se encuentran en procesamiento.");
    const toastId = toast.loading("Preparando documento...");
    
    try {
      const { data: res, error: errRes } = await supabase.rpc("get_resultados_orden_paciente", { p_orden_id: orden.id, p_cedula: pacienteAuth.cedula.trim(), p_pin: pacienteAuth.pin_secreto });
      if (errRes) throw errRes;
      
      let cult = [];
      try {
          const respCult = await supabase.rpc("get_cultivos_orden_paciente", { 
              p_orden_id: orden.id.toString(), 
              p_cedula: pacienteAuth.cedula.trim(), 
              p_pin: pacienteAuth.pin_secreto 
          });
          if (!respCult.error) cult = respCult.data || [];
      } catch (e) { console.warn("Aviso:", e); }

      await generarReporteImpresion({ 
          ordenSeleccionada: orden, 
          resultados: res || [], 
          cultivosExternos: cult || [] 
      });
      
      toast.dismiss(toastId);
    } catch (err) { 
      toast.error(`Error al generar el PDF. Revise su conexión.`, { id: toastId }); 
    }
  };

  const handleAyuda = () => { window.open("https://wa.me/593968624624?text=Hola,%20necesito%20ayuda%20con%20el%20Portal%20de%20Resultados", "_blank"); };

  const totalPaginas = Math.ceil(totalRegistros / ordenesPorPagina) || 1;
  const desdeItem = (paginaActual - 1) * ordenesPorPagina;

  return (
    <div className="portal-pacientes-wrapper">
      <Toaster position="top-center" />
      <style>{`
        .portal-pacientes-wrapper { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto !important; overflow-x: hidden; background: ${TECH_THEME.bgDark}; font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif; color: ${TECH_THEME.textWhite}; -webkit-overflow-scrolling: touch; z-index: 9999; }
        .portal-pacientes-wrapper * { box-sizing: border-box !important; }
        .pp-navbar { background: ${TECH_THEME.glassBg}; backdrop-filter: blur(15px); border-bottom: 1px solid ${TECH_THEME.glassBorder}; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; }
        .pp-brand { display: flex; align-items: center; gap: 15px; }
        .pp-logo { height: 35px; filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.8)); }
        .pp-title { margin: 0; font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
        .pp-title span { color: ${TECH_THEME.accentBlue}; font-weight: 400; }
        .pp-user-info { display: flex; align-items: center; gap: 15px; }
        .btn-tech { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.3s; text-transform: uppercase; letter-spacing: 0.5px; }
        .btn-tech:hover { background: rgba(255,255,255,0.1); border-color: ${TECH_THEME.accentBlue}; box-shadow: 0 0 15px rgba(14, 165, 233, 0.3); }
        .btn-salir-tech { background: linear-gradient(135deg, #ef4444, #991b1b); border: none; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
        .pp-content { padding: 30px; max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; }
        .pp-page-header { margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 15px; }
        .pp-filters-glass { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 25px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: end; }
        .pp-input-group { display: flex; flex-direction: column; gap: 6px; }
        .pp-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
        .pp-input, .pp-select { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px 15px; border-radius: 8px; font-size: 13px; outline: none; transition: 0.2s; font-family: inherit; }
        .pp-input:focus, .pp-select:focus { border-color: ${TECH_THEME.accentBlue}; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2); }
        .pp-table-container { background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); overflow-x: auto; }
        .pp-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .pp-table th { background: rgba(0,0,0,0.3); color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 15px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .pp-table td { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; color: #e2e8f0; vertical-align: middle; }
        .pp-table tr:hover { background: rgba(255,255,255,0.02); }
        .pp-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        .badge-validado { background: rgba(74, 222, 128, 0.15); color: ${TECH_THEME.accentGreen}; border: 1px solid rgba(74, 222, 128, 0.3); }
        .badge-parcial { background: rgba(14, 165, 233, 0.15); color: ${TECH_THEME.accentBlue}; border: 1px solid rgba(14, 165, 233, 0.3); }
        .badge-pendiente { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .pp-btn-action { background: rgba(14, 165, 233, 0.1); color: ${TECH_THEME.accentBlue}; border: 1px solid rgba(14, 165, 233, 0.3); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: 0.2s; font-weight: 600; display: flex; align-items: center; gap: 5px; justify-content: center; }
        .pp-btn-action:hover:not(:disabled) { background: rgba(14, 165, 233, 0.2); box-shadow: 0 0 10px rgba(14, 165, 233, 0.2); }
        .pp-btn-action:disabled { opacity: 0.4; cursor: not-allowed; border-color: rgba(255,255,255,0.1); color: #94a3b8; }
        .pp-pagination { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05); }
        .pp-page-info { font-size: 13px; color: #94a3b8; }
        .pp-page-controls { display: flex; align-items: center; gap: 12px; }
        .pp-page-btn { background: rgba(15, 23, 42, 0.8); color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .pp-page-btn:hover:not(:disabled) { border-color: ${TECH_THEME.accentBlue}; color: ${TECH_THEME.accentBlue}; }
        .pp-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <nav className="pp-navbar">
        <div className="pp-brand">
          <img src="/logo-tridlab.png" alt="TridLab" className="pp-logo" />
          <h1 className="pp-title">TRIDLAB <span>PORTAL</span></h1>
        </div>
        
        <div className="pp-user-info">
          <div style={{ textAlign: "right", marginRight: "5px" }}>
            <div style={{ fontWeight: "800", color: "#fff", fontSize: "14px", textTransform: "uppercase" }}>{pacienteAuth.nombre}</div>
            <div style={{ fontSize: "12px", color: TECH_THEME.textCyan, fontWeight: "700" }}>C.I: {pacienteAuth.cedula}</div>
          </div>
          <button className="btn-tech" onClick={handleAyuda}>AYUDA</button>
          <button className="btn-tech btn-salir-tech" onClick={onLogout}>SALIR</button>
        </div>
      </nav>

      <main className="pp-content">
        <div className="pp-page-header">
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#ffffff', fontWeight: '800' }}>Mi Historial Médico</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Visualice y descargue sus resultados de laboratorio.</p>
          </div>
          <button onClick={cargarHistorial} className="pp-btn-action" style={{ padding: '10px 15px' }}>↻ Actualizar Datos</button>
        </div>

        <div className="pp-table-container">
          <table className="pp-table">
            <thead>
              <tr><th>N° Orden</th><th>Fecha Ingreso</th><th>Paciente</th><th>Estado</th><th style={{ textAlign: 'center' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Sincronizando con el laboratorio...</td></tr>
              ) : ordenes.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No se encontraron órdenes en tu historial.</td></tr>
              ) : (
                ordenes.map((orden) => {
                  const estadoBadge = orden.estado_validacion_real;
                  let classBadge = 'badge-pendiente'; let textoBadge = 'EN PROCESO';
                  if (estadoBadge === 'validado') { classBadge = 'badge-validado'; textoBadge = 'VALIDADO'; } 
                  else if (estadoBadge === 'parcial') { classBadge = 'badge-parcial'; textoBadge = 'LISTO PARCIALMENTE'; }

                  return (
                    <tr key={orden.id}>
                      <td style={{ fontWeight: 'bold', color: TECH_THEME.accentBlue }}>{orden.codigo_orden}</td>
                      <td>{new Date(orden.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{orden.paciente_nombre}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>C.I: {orden.paciente_cedula}</div>
                      </td>
                      <td><span className={`pp-badge ${classBadge}`}>{textoBadge}</span></td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button className="pp-btn-action" onClick={() => handleDescargar(orden)} disabled={!orden.puede_descargar}>
                            Ver PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}