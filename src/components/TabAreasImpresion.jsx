import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

export default function TabAreasImpresion({ isDirty, setIsDirty }) {
  const [areasLista, setAreasLista] = useState([]);
  const [examenesPlana, setExamenesPlana] = useState([]);
  const [areaFiltroId, setAreaFiltroId] = useState("sin_asignar");
  const [busquedaAreas, setBusquedaAreas] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarAreasYExamenes();
  }, []);

  async function cargarAreasYExamenes() {
    setLoading(true);
    setIsDirty(false);
    const { data: aData } = await supabase.from("lab_areas").select("*").order("orden_visual");
    const { data: eData } = await supabase.from("examenes").select("id, codigo, articulo, lab_area_id, orden_impresion").order("orden_impresion");
    
    setAreasLista((aData || []).map(a => ({ ...a, is_dirty_area: false })));
    setExamenesPlana((eData || []).map(e => ({ ...e, is_dirty_area: false })));
    setLoading(false);
  }

  function handleCambioArea(id, areaId) {
    const value = areaId === "" ? null : areaId;
    setExamenesPlana(prev => prev.map(e => e.id === id ? { ...e, lab_area_id: value, is_dirty_area: true } : e));
    setIsDirty(true);
  }

  function handleCambioOrdenExamen(id, newOrden) {
    const value = newOrden === "" ? null : Number(newOrden);
    setExamenesPlana(prev => prev.map(e => e.id === id ? { ...e, orden_impresion: value, is_dirty_area: true } : e));
    setIsDirty(true);
  }

  function handleCambioAreaProp(id, field, value) {
    const finalValue = (field === 'orden_visual') ? (value === "" ? null : Number(value)) : value;
    setAreasLista(prev => prev.map(a => a.id === id ? { ...a, [field]: finalValue, is_dirty_area: true } : a));
    setIsDirty(true);
  }

  async function guardarCambiosAreas() {
    setGuardando(true);
    const toastId = toast.loading("Guardando organización...");
    try {
      const examenesCambiados = examenesPlana.filter(e => e.is_dirty_area);
      const promesasExamenes = examenesCambiados.map(ex => 
        supabase.from("examenes").update({ lab_area_id: ex.lab_area_id, orden_impresion: ex.orden_impresion }).eq("id", ex.id)
      );
      
      const areasCambiadas = areasLista.filter(a => a.is_dirty_area);
      const promesasAreas = areasCambiadas.map(a => 
        supabase.from("lab_areas").update({ 
            orden_visual: a.orden_visual,
            tubo_id: a.tubo_id,
            tubo_nombre: a.tubo_nombre
        }).eq("id", a.id)
      );
      
      await Promise.all([...promesasExamenes, ...promesasAreas]);
      
      setExamenesPlana(prev => prev.map(e => ({ ...e, is_dirty_area: false })));
      setAreasLista(prev => prev.map(a => ({ ...a, is_dirty_area: false })).sort((a,b) => (a.orden_visual || 0) - (b.orden_visual || 0)));
      setIsDirty(false);
      toast.success("Organización guardada exitosamente", { id: toastId });
    } catch (e) {
      toast.error("Error al guardar: " + e.message, { id: toastId });
    } finally {
      setGuardando(false);
    }
  }

  async function handleCrearMacroarea() {
    const nueva = window.prompt("Nombre de la nueva Macroárea (Ej: INMUNOLOGÍA ESPECIAL):");
    if (!nueva || !nueva.trim()) return;
    const nombreClean = nueva.trim().toUpperCase();

    const toastId = toast.loading("Creando área...");
    const { data, error } = await supabase.from("lab_areas").insert({ nombre: nombreClean, orden_visual: areasLista.length + 1 }).select();
    
    if (error) {
      if (error.code === '23505') toast.error("Esa área ya existe", { id: toastId });
      else toast.error("Error al crear área", { id: toastId });
      return;
    }
    
    setAreasLista(prev => [...prev, { ...data[0], is_dirty_area: false }].sort((a, b) => (a.orden_visual || 0) - (b.orden_visual || 0)));
    toast.success("Macroárea creada exitosamente", { id: toastId });
  }

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", width: "100%" }}>
      {/* COLUMNA IZQUIERDA: ÁREAS */}
      <div style={{ width: "320px", backgroundColor: "#ffffff", borderRight: "1px solid #cbd5e1", display: "flex", flexDirection: "column", zIndex: 20 }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Categorías (Áreas)</h2>
          <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Configura el orden y tubo por defecto de cada área.</p>
        </div>
        
        <div className="lis-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>Cargando áreas...</div>
          ) : (
            <>
              <div className={`master-list-item ${areaFiltroId === "sin_asignar" ? "active" : ""}`} onClick={() => setAreaFiltroId("sin_asignar")}>
                <div style={{ fontWeight: "800", fontSize: "13px", color: areaFiltroId === "sin_asignar" ? "#fff" : "#ea580c" }}>⚠️ Sin Asignar</div>
                <div style={{ fontSize: "11px", opacity: 0.8 }}>{examenesPlana.filter(e => !e.lab_area_id).length} exámenes requieren tu atención</div>
              </div>
              
              {areasLista.map(a => (
                <div key={a.id} className={`master-list-item ${areaFiltroId === a.id ? "active" : ""}`} onClick={() => setAreaFiltroId(a.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: "900", fontSize: "13px" }}>{a.nombre}</div>
                    <input type="number" value={a.orden_visual || ""} onClick={(e) => e.stopPropagation()} onChange={(e) => handleCambioAreaProp(a.id, 'orden_visual', e.target.value)} title="Orden de impresión del Área" style={{ width: "35px", padding: "2px", textAlign: "center", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "11px", color: "#0f172a", outline: "none", fontWeight: "bold" }} />
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }} onClick={(e) => e.stopPropagation()}>
                     <input placeholder="ID Tubo (.1)" title="ID del Tubo (Ej: 1, 2, 3)" value={a.tubo_id || ""} onChange={(e) => handleCambioAreaProp(a.id, 'tubo_id', e.target.value)} style={{ width: "80px", padding: "4px", fontSize: "10px", border: "1px solid #cbd5e1", borderRadius: "4px", outline: "none", color: "#0f172a", fontWeight: "bold" }} />
                     <input placeholder="Tipo de Muestra (Ej: EDTA)" title="Nombre de la Muestra (Ej: SANGRE TOTAL)" value={a.tubo_nombre || ""} onChange={(e) => handleCambioAreaProp(a.id, 'tubo_nombre', e.target.value)} style={{ flex: 1, padding: "4px", fontSize: "10px", border: "1px solid #cbd5e1", borderRadius: "4px", outline: "none", color: "#0f172a", fontWeight: "bold" }} />
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "6px" }}>{examenesPlana.filter(e => e.lab_area_id === a.id).length} exámenes en esta área</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: "12px", borderTop: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}>
           <button onClick={handleCrearMacroarea} style={{ width: "100%", padding: "10px", backgroundColor: "#ffffff", border: "1px dashed #0ea5e9", color: "#0ea5e9", fontWeight: "700", borderRadius: "6px", cursor: "pointer", transition: "0.2s" }} onMouseOver={(e) => e.target.style.backgroundColor = "#e0f2fe"} onMouseOut={(e) => e.target.style.backgroundColor = "#ffffff"}>➕ Nueva Macroárea</button>
        </div>
      </div>

      {/* COLUMNA DERECHA: CONFIGURADOR DE ORDEN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
        <div style={{ padding: "16px 24px", backgroundColor: "#ffffff", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700", letterSpacing: "0.05em", marginBottom: "2px" }}>ORDEN DE IMPRESIÓN PARA:</div>
            <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>{areaFiltroId === "sin_asignar" ? "Exámenes Sin Asignar" : areasLista.find(a => a.id === areaFiltroId)?.nombre}</h1>
          </div>

          <div style={{ position: "relative", width: "300px" }}>
            <input type="text" placeholder="🔍 Buscar examen por código o nombre..." value={busquedaAreas} onChange={(e) => setBusquedaAreas(e.target.value)} style={{ width: "100%", padding: "8px 30px 8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", backgroundColor: "#f8fafc" }} />
            {busquedaAreas && (<button onClick={() => setBusquedaAreas("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontWeight: "bold" }}>✕</button>)}
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {isDirty && <span style={{ color: "#d97706", fontWeight: "700", fontSize: "13px" }}>⚠️ Hay configuraciones sin guardar</span>}
            <button onClick={guardarCambiosAreas} disabled={guardando || !isDirty} style={{ backgroundColor: isDirty ? "#059669" : "#e2e8f0", color: isDirty ? "#ffffff" : "#94a3b8", padding: "8px 24px", borderRadius: "6px", fontWeight: "700", fontSize: "13px", border: "none", cursor: isDirty ? "pointer" : "not-allowed", transition: "all 0.2s" }}>{guardando ? "Guardando..." : "Guardar Organización"}</button>
          </div>
        </div>

        <div className="lis-scroll" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "15%" }}>Código</th>
                  <th style={{ width: "45%" }}>Nombre del Examen (Perfil)</th>
                  <th style={{ width: "25%", textAlign: "center" }}>Área Padre</th>
                  <th style={{ width: "15%", textAlign: "center" }}>Nº de Orden Visual</th>
                </tr>
              </thead>
              <tbody>
                {examenesPlana.filter(e => areaFiltroId === "sin_asignar" ? !e.lab_area_id : e.lab_area_id === areaFiltroId).filter(e => !busquedaAreas || (e.codigo || "").toLowerCase().includes(busquedaAreas.toLowerCase()) || (e.articulo || "").toLowerCase().includes(busquedaAreas.toLowerCase())).sort((a, b) => (a.orden_impresion || 999) - (b.orden_impresion || 999)).map(ex => (
                    <tr key={ex.id} style={{ backgroundColor: ex.is_dirty_area ? "#fef3c7" : "transparent" }}>
                      <td style={{ fontWeight: "700", color: "#64748b" }}>{ex.codigo}</td>
                      <td style={{ fontWeight: "800", color: "#0f172a" }}>{ex.articulo}</td>
                      <td style={{ textAlign: "center" }}><select value={ex.lab_area_id || ""} onChange={(e) => handleCambioArea(ex.id, e.target.value)} className="cell-input" style={{ width: "90%", fontWeight: "600", color: ex.lab_area_id ? "#0369a1" : "#ea580c", background: ex.lab_area_id ? "#f0f9ff" : "#fff7ed" }}><option value="">-- Sin Asignar --</option>{areasLista.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></td>
                      <td style={{ textAlign: "center" }}><input type="number" value={ex.orden_impresion || ""} onChange={(e) => handleCambioOrdenExamen(ex.id, e.target.value)} className="cell-input" placeholder="Ej: 1" style={{ width: "60px", textAlign: "center", fontWeight: "900", color: "#0f172a", fontSize: "14px", border: "1px solid #94a3b8" }} /></td>
                    </tr>
                ))}
                {examenesPlana.filter(e => areaFiltroId === "sin_asignar" ? !e.lab_area_id : e.lab_area_id === areaFiltroId).length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "#94a3b8", fontStyle: "italic" }}>No hay exámenes en esta categoría, o no coinciden con la búsqueda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}