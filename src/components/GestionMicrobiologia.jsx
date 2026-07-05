import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

// Función para capitalizar solo la primera letra (Ej: Cefepime)
function formatAntibiotico(texto) {
  if (!texto) return "";
  const lower = texto.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function GestionMicrobiologia() {
  const [subTab, setSubTab] = useState("ANTIBIOTICOS");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados para Antibióticos
  const [antibioticos, setAntibioticos] = useState([]);
  
  // Estados para Breakpoints
  const [breakpoints, setBreakpoints] = useState([]);
  const [gruposUnicos, setGruposUnicos] = useState([]);
  const [grupoActivo, setGrupoActivo] = useState("");

  // Estados para Modal de Cambios sin Guardar
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      // 1. Cargar catálogo de antibióticos
      const { data: antData } = await supabase.from("lab_antibioticos").select("*").order("nombre");
      if (antData) setAntibioticos(antData.map(a => ({ ...a, is_dirty: false })));

      // 2. Cargar breakpoints
      const { data: breakData } = await supabase.from("lab_breakpoints").select("*").order("antibiotico");
      if (breakData) {
        setBreakpoints(breakData.map(b => ({ ...b, is_dirty: false })));
        const grupos = [...new Set(breakData.map(b => b.bacteria_grupo).filter(Boolean))].sort();
        setGruposUnicos(grupos);
        if (grupos.length > 0 && !grupoActivo) setGrupoActivo(grupos[0]);
      }
    } catch (error) {
      toast.error("Error al cargar datos de microbiología.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LÓGICA DE NAVEGACIÓN SEGURA (SMART LOCK)
  // ==========================================
  const hayCambiosAntibioticos = antibioticos.some(a => a.is_dirty);
  const hayCambiosBreakpoints = breakpoints.some(b => b.is_dirty);

  function intentarCambiarTab(nuevoTab) {
    if (subTab === nuevoTab) return;
    const hasChanges = subTab === "ANTIBIOTICOS" ? hayCambiosAntibioticos : hayCambiosBreakpoints;
    if (hasChanges) {
      setPendingAction({ type: 'TAB', value: nuevoTab });
      setShowUnsavedModal(true);
    } else {
      setSubTab(nuevoTab);
    }
  }

  function intentarCambiarGrupo(nuevoGrupo) {
    if (grupoActivo === nuevoGrupo) return;
    if (hayCambiosBreakpoints) {
      setPendingAction({ type: 'GRUPO', value: nuevoGrupo });
      setShowUnsavedModal(true);
    } else {
      setGrupoActivo(nuevoGrupo);
    }
  }

  async function descartarCambios() {
    await cargarDatos(); // Recarga la info limpia de Supabase
    toast("Cambios descartados", { icon: "🧹" });
  }

  function confirmarDescarte() {
    setShowUnsavedModal(false);
    descartarCambios().then(() => {
      if (pendingAction?.type === 'TAB') setSubTab(pendingAction.value);
      if (pendingAction?.type === 'GRUPO') setGrupoActivo(pendingAction.value);
      setPendingAction(null);
    });
  }

  // ==========================================
  // LÓGICA DE ANTIBIÓTICOS
  // ==========================================
  function handleAntChange(id, field, value) {
    let valLimpio = value;
    if (field === "nombre") valLimpio = formatAntibiotico(value); // 🚀 Autocorrección Cefepime
    
    setAntibioticos(prev => prev.map(a => a.id === id ? { ...a, [field]: valLimpio, is_dirty: true } : a));
  }

  async function guardarAntibioticos() {
    const sucios = antibioticos.filter(a => a.is_dirty);
    if (sucios.length === 0) return toast("No hay cambios que guardar", { icon: "ℹ️" });
    
    setGuardando(true);
    const toastId = toast.loading("Guardando antibióticos...");
    try {
      const promesas = sucios.map(a => 
        supabase.from("lab_antibioticos").update({ 
          nombre: a.nombre, simbolo: a.simbolo, contenido: a.contenido 
        }).eq("id", a.id)
      );
      await Promise.all(promesas);
      setAntibioticos(prev => prev.map(a => ({ ...a, is_dirty: false })));
      toast.success("Antibióticos actualizados", { id: toastId });
    } catch (error) {
      toast.error("Error al guardar", { id: toastId });
    } finally {
      setGuardando(false);
    }
  }

  async function agregarAntibiotico() {
    const nombre = window.prompt("Nombre del nuevo antibiótico:");
    if (!nombre || !nombre.trim()) return;
    
    const nombreLimpio = formatAntibiotico(nombre.trim()); // 🚀 Autocorrección
    const toastId = toast.loading("Creando...");
    const { data, error } = await supabase.from("lab_antibioticos").insert({ 
      nombre: nombreLimpio 
    }).select().single();

    if (error) return toast.error("Error al crear", { id: toastId });
    
    setAntibioticos(prev => [...prev, { ...data, is_dirty: false }]);
    toast.success("Antibiótico creado", { id: toastId });
  }

  async function eliminarAntibiotico(id) {
    if (!window.confirm("¿Seguro de eliminar este antibiótico del catálogo?")) return;
    const { error } = await supabase.from("lab_antibioticos").delete().eq("id", id);
    if (error) return toast.error("No se puede eliminar (posiblemente esté en uso).");
    setAntibioticos(prev => prev.filter(a => a.id !== id));
    toast.success("Antibiótico eliminado");
  }

  // ==========================================
  // LÓGICA DE BREAKPOINTS (PANELES)
  // ==========================================
  function handleBreakChange(id, field, value) {
    setBreakpoints(prev => prev.map(b => b.id === id ? { ...b, [field]: value, is_dirty: true } : b));
  }

  async function guardarBreakpoints() {
    const sucios = breakpoints.filter(b => b.is_dirty);
    if (sucios.length === 0) return toast("No hay cambios que guardar", { icon: "ℹ️" });
    
    setGuardando(true);
    const toastId = toast.loading("Guardando valores de corte...");
    try {
      const promesas = sucios.map(b => 
        supabase.from("lab_breakpoints").update({ 
          antibiotico: b.antibiotico, metodo: b.metodo, sensible: b.sensible, intermedio: b.intermedio, resistente: b.resistente 
        }).eq("id", b.id)
      );
      await Promise.all(promesas);
      setBreakpoints(prev => prev.map(b => ({ ...b, is_dirty: false })));
      toast.success("Panel actualizado", { id: toastId });
    } catch (error) {
      toast.error("Error al guardar", { id: toastId });
    } finally {
      setGuardando(false);
    }
  }

  async function agregarReglaPanel() {
    if (!grupoActivo) return toast.error("Seleccione un grupo bacteriano primero.");
    const toastId = toast.loading("Añadiendo regla...");
    const { data, error } = await supabase.from("lab_breakpoints").insert({ 
      bacteria_grupo: grupoActivo, metodo: "MIC", antibiotico: "NUEVO ANTIBIÓTICO" 
    }).select().single();

    if (error) return toast.error("Error al añadir regla", { id: toastId });
    
    setBreakpoints(prev => [...prev, { ...data, is_dirty: false }]);
    toast.success("Regla añadida (Por favor edite los valores)", { id: toastId });
  }

  async function crearNuevoGrupo() {
    const nombre = window.prompt("Nombre del nuevo Grupo Bacteriano (Ej: ENTEROBACTERIAS):");
    if (!nombre || !nombre.trim()) return;
    const nombreLimpio = nombre.trim().toUpperCase(); // 🚀 Los grupos siempre en MAYÚSCULAS
    if (gruposUnicos.includes(nombreLimpio)) return toast.error("Ese grupo ya existe.");
    
    setGruposUnicos(prev => [...prev, nombreLimpio].sort());
    intentarCambiarGrupo(nombreLimpio);
    toast.success(`Grupo ${nombreLimpio} creado. Añada antibióticos al panel.`);
  }

  async function eliminarRegla(id) {
    if (!window.confirm("¿Quitar este antibiótico del panel?")) return;
    const { error } = await supabase.from("lab_breakpoints").delete().eq("id", id);
    if (error) return toast.error("Error al eliminar.");
    setBreakpoints(prev => prev.filter(b => b.id !== id));
  }

  // 🚀 ORDENAMIENTO ALFABÉTICO AUTOMÁTICO
  const antibioticosOrdenados = [...antibioticos].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  const breaksDelGrupo = breakpoints
    .filter(b => b.bacteria_grupo === grupoActivo)
    .sort((a, b) => (a.antibiotico || "").localeCompare(b.antibiotico || ""));

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Cargando configuración de Microbiología...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", backgroundColor: "#f8fafc" }}>
      <style>{`
        .micro-sub-tab { padding: 10px 20px; font-weight: bold; cursor: pointer; border-bottom: 2px solid transparent; color: #64748b; font-size: 12px; }
        .micro-sub-tab.active { color: #0284c7; border-bottom-color: #0284c7; background: #fff; }
        .table-input { width: 100%; border: 1px solid transparent; background: transparent; padding: 4px; border-radius: 3px; font-size: 12px; color: #0f172a; }
        .table-input:focus { border-color: #0284c7; background: #fff; outline: none; }
        .table-input.dirty { background: #fef3c7; border-color: #f59e0b; }
      `}</style>

      {/* SUB-MENÚ */}
      <div style={{ display: "flex", background: "#e2e8f0", borderBottom: "1px solid #cbd5e1", flexShrink: 0 }}>
        <div className={`micro-sub-tab ${subTab === "ANTIBIOTICOS" ? "active" : ""}`} onClick={() => intentarCambiarTab("ANTIBIOTICOS")}>
          💊 Catálogo de Antibióticos
        </div>
        <div className={`micro-sub-tab ${subTab === "PANELES" ? "active" : ""}`} onClick={() => intentarCambiarTab("PANELES")}>
          🧫 Paneles y Breakpoints (C.I.M)
        </div>
      </div>

      {/* VISTA 1: ANTIBIÓTICOS */}
      {subTab === "ANTIBIOTICOS" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>Catálogo General de Antibióticos</h2>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Total: {antibioticosOrdenados.length} registrados</span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={agregarAntibiotico} style={{ background: "#fff", border: "1px dashed #0284c7", color: "#0284c7", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>+ Nuevo Antibiótico</button>
              
              {/* 🚀 BOTÓN DESCARTAR */}
              <button onClick={descartarCambios} disabled={guardando || !hayCambiosAntibioticos} style={{ background: hayCambiosAntibioticos ? "#fee2e2" : "#f1f5f9", color: hayCambiosAntibioticos ? "#ef4444" : "#94a3b8", border: `1px solid ${hayCambiosAntibioticos ? '#fca5a5' : '#cbd5e1'}`, padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: hayCambiosAntibioticos ? "pointer" : "not-allowed" }}>
                ✕ Descartar
              </button>

              <button onClick={guardarAntibioticos} disabled={guardando || !hayCambiosAntibioticos} style={{ background: hayCambiosAntibioticos ? "#0284c7" : "#cbd5e1", color: "#fff", border: "none", padding: "6px 16px", borderRadius: "6px", fontWeight: "bold", cursor: hayCambiosAntibioticos ? "pointer" : "not-allowed" }}>
                💾 Guardar Cambios
              </button>
            </div>
          </div>

          <div className="lis-scroll" style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", overflowY: "auto", flex: 1, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Nombre del Antibiótico</th>
                  <th style={{ width: "25%", textAlign: "center" }}>Símbolo</th>
                  <th style={{ width: "25%", textAlign: "center" }}>Contenido (µg)</th>
                  <th style={{ width: "10%", textAlign: "center" }}>Borrar</th>
                </tr>
              </thead>
              <tbody>
                {antibioticosOrdenados.map(a => (
                  <tr key={a.id}>
                    <td><input className={`table-input ${a.is_dirty ? 'dirty' : ''}`} value={a.nombre || ""} onChange={e => handleAntChange(a.id, "nombre", e.target.value)} style={{ fontWeight: "bold" }} placeholder="Ej: Cefepime" /></td>
                    <td style={{ textAlign: "center" }}><input className={`table-input ${a.is_dirty ? 'dirty' : ''}`} value={a.simbolo || ""} onChange={e => handleAntChange(a.id, "simbolo", e.target.value)} style={{ textAlign: "center" }} placeholder="Ej: P" /></td>
                    <td style={{ textAlign: "center" }}><input className={`table-input ${a.is_dirty ? 'dirty' : ''}`} value={a.contenido || ""} onChange={e => handleAntChange(a.id, "contenido", e.target.value)} style={{ textAlign: "center" }} placeholder="Ej: 10 µg" /></td>
                    <td style={{ textAlign: "center" }}><button onClick={() => eliminarAntibiotico(a.id)} className="btn-action delete" title="Eliminar antibiótico">🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: PANELES Y BREAKPOINTS */}
      {subTab === "PANELES" && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          
          {/* Columna Izquierda: Grupos Bacterianos */}
          <div style={{ width: "280px", background: "#fff", borderRight: "1px solid #cbd5e1", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "15px", borderBottom: "1px solid #cbd5e1", background: "#f8fafc" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", color: "#0f172a" }}>Grupos Bacterianos</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Seleccione un panel para configurar.</div>
            </div>
            <div className="lis-scroll" style={{ flex: 1, overflowY: "auto" }}>
              {gruposUnicos.map(g => (
                <div key={g} onClick={() => intentarCambiarGrupo(g)} style={{ padding: "12px 15px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: grupoActivo === g ? "#e0f2fe" : "#fff", borderLeft: grupoActivo === g ? "4px solid #0284c7" : "4px solid transparent", fontWeight: grupoActivo === g ? "bold" : "normal", color: grupoActivo === g ? "#0369a1" : "#334155", fontSize: "12px" }}>
                  🦠 {g}
                </div>
              ))}
            </div>
            <div style={{ padding: "15px", borderTop: "1px solid #cbd5e1", background: "#f8fafc" }}>
              <button onClick={crearNuevoGrupo} style={{ width: "100%", background: "#fff", border: "1px dashed #0284c7", color: "#0284c7", padding: "8px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>➕ Nuevo Grupo</button>
            </div>
          </div>

          {/* Columna Derecha: Configuración del Panel Activo */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px", background: "#f8fafc", overflow: "hidden" }}>
            {grupoActivo ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>EDITANDO PANEL:</div>
                    <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a" }}>{grupoActivo}</h2>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={agregarReglaPanel} style={{ background: "#fff", border: "1px dashed #16a34a", color: "#16a34a", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>+ Añadir al Panel</button>
                    
                    {/* 🚀 BOTÓN DESCARTAR */}
                    <button onClick={descartarCambios} disabled={guardando || !hayCambiosBreakpoints} style={{ background: hayCambiosBreakpoints ? "#fee2e2" : "#f1f5f9", color: hayCambiosBreakpoints ? "#ef4444" : "#94a3b8", border: `1px solid ${hayCambiosBreakpoints ? '#fca5a5' : '#cbd5e1'}`, padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: hayCambiosBreakpoints ? "pointer" : "not-allowed" }}>
                      ✕ Descartar
                    </button>

                    <button onClick={guardarBreakpoints} disabled={guardando || !hayCambiosBreakpoints} style={{ background: hayCambiosBreakpoints ? "#0284c7" : "#cbd5e1", color: "#fff", border: "none", padding: "6px 16px", borderRadius: "6px", fontWeight: "bold", cursor: hayCambiosBreakpoints ? "pointer" : "not-allowed" }}>
                      💾 Guardar Panel
                    </button>
                  </div>
                </div>

                <div className="lis-scroll" style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", overflowY: "auto", flex: 1, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <table className="data-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "30%" }}>Antibiótico</th>
                        <th style={{ width: "15%", textAlign: "center" }}>Método</th>
                        <th style={{ width: "15%", textAlign: "center", color: "#15803d" }}>Sensible (S)</th>
                        <th style={{ width: "15%", textAlign: "center", color: "#a16207" }}>Intermedio (I)</th>
                        <th style={{ width: "15%", textAlign: "center", color: "#b91c1c" }}>Resistente (R)</th>
                        <th style={{ width: "10%", textAlign: "center" }}>Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breaksDelGrupo.map(b => (
                        <tr key={b.id}>
                          <td>
                            <select className={`table-input ${b.is_dirty ? 'dirty' : ''}`} value={b.antibiotico || ""} onChange={e => handleBreakChange(b.id, "antibiotico", e.target.value)} style={{ fontWeight: "bold", cursor: "pointer" }}>
                              <option value="">-- Seleccionar --</option>
                              <option value="NUEVO ANTIBIÓTICO" disabled>NUEVO ANTIBIÓTICO</option>
                              {antibioticosOrdenados.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                            </select>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <select className={`table-input ${b.is_dirty ? 'dirty' : ''}`} value={b.metodo || "MIC"} onChange={e => handleBreakChange(b.id, "metodo", e.target.value)} style={{ textAlign: "center", cursor: "pointer" }}>
                              <option value="MIC">MIC</option>
                              <option value="HALO">HALO</option>
                            </select>
                          </td>
                          <td style={{ textAlign: "center" }}><input className={`table-input ${b.is_dirty ? 'dirty' : ''}`} value={b.sensible || ""} onChange={e => handleBreakChange(b.id, "sensible", e.target.value)} style={{ textAlign: "center", color: "#15803d", fontWeight: "bold" }} placeholder="Ej: <=1" /></td>
                          <td style={{ textAlign: "center" }}><input className={`table-input ${b.is_dirty ? 'dirty' : ''}`} value={b.intermedio || ""} onChange={e => handleBreakChange(b.id, "intermedio", e.target.value)} style={{ textAlign: "center", color: "#a16207", fontWeight: "bold" }} placeholder="Ej: 2-4" /></td>
                          <td style={{ textAlign: "center" }}><input className={`table-input ${b.is_dirty ? 'dirty' : ''}`} value={b.resistente || ""} onChange={e => handleBreakChange(b.id, "resistente", e.target.value)} style={{ textAlign: "center", color: "#b91c1c", fontWeight: "bold" }} placeholder="Ej: >=8" /></td>
                          <td style={{ textAlign: "center" }}><button onClick={() => eliminarRegla(b.id)} className="btn-action delete" title="Quitar del panel">🗑️</button></td>
                        </tr>
                      ))}
                      {breaksDelGrupo.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#94a3b8", fontStyle: "italic" }}>No hay antibióticos asignados a este panel.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexDirection: "column" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🧫</div>
                <h3 style={{ margin: 0 }}>Selecciona un grupo bacteriano</h3>
                <p style={{ fontSize: "12px" }}>O crea uno nuevo en la barra lateral.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CAMBIOS SIN GUARDAR */}
      {showUnsavedModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", width: "400px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", textAlign: "center", marginBottom: "8px" }}>⚠️ Cambios sin guardar</h2>
            <p style={{ color: "#475569", fontSize: "14px", textAlign: "center", marginBottom: "24px" }}>Tienes modificaciones pendientes. ¿Deseas descartarlas y continuar?</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={() => setShowUnsavedModal(false)} style={{ flex: 1, backgroundColor: "#f1f5f9", color: "#334155", padding: "10px", borderRadius: "8px", fontWeight: "700", border: "1px solid #cbd5e1", cursor: "pointer" }}>Volver</button>
              <button onClick={confirmarDescarte} style={{ flex: 1, backgroundColor: "#ef4444", color: "#ffffff", padding: "10px", borderRadius: "8px", fontWeight: "700", border: "none", cursor: "pointer" }}>Descartar cambios</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}