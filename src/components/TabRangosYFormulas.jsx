import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

function diasAUnidad(dias) {
  if (dias === null || dias === undefined || dias === "") return { val: "", un: "A" };
  const d = Number(dias);
  if (d === 0) return { val: 0, un: "D" }; 
  if (d % 365 === 0) return { val: d / 365, un: "A" };
  if (d % 30 === 0) return { val: d / 30, un: "M" };
  return { val: d, un: "D" };
}

function unidadADias(val, un) {
  if (val === "" || val === null) return null;
  const v = Number(val);
  if (un === "A") return v * 365;
  if (un === "M") return v * 30;
  return v;
}

export default function TabRangosYFormulas({ isDirty, setIsDirty }) {
  const [examenesLista, setExamenesLista] = useState([]);
  const [unidadesLista, setUnidadesLista] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [busquedaIzquierda, setBusquedaIzquierda] = useState("");
  const [examenSeleccionado, setExamenSeleccionado] = useState(null);
  const [rows, setRows] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [analitosExpandidos, setAnalitosExpandidos] = useState({});

  useEffect(() => {
    cargarUnidades();
    cargarEstructuraCompleta();
  }, []);

  async function cargarUnidades() {
    const { data } = await supabase.from("lab_unidades").select("nombre").order("nombre");
    if (data) setUnidadesLista(data.map(u => u.nombre));
  }

  async function cargarEstructuraCompleta() {
    setLoading(true);
    const { data, error } = await supabase
      .from("lab_catalogo_analitos")
      .select(`
        id, nombre_analito, unidad, orden_visual, formula_calculo,
        examenes ( id, codigo, articulo ),
        lab_rangos_referencia ( id, sexo, edad_min_dias, edad_max_dias, rango_texto, rango_min, rango_max, unidad, activo )
      `)
      .order("orden_visual", { ascending: true });

    if (error) {
      toast.error("Error al cargar la base de datos");
      setLoading(false); return;
    }

    const mapExamenes = new Map();
    for (const item of data || []) {
      const ex = Array.isArray(item.examenes) ? item.examenes[0] : item.examenes;
      if (!ex) continue;
      if (!mapExamenes.has(ex.id)) {
        mapExamenes.set(ex.id, { id: ex.id, codigo: ex.codigo, nombre: ex.articulo, analitos: [] });
      }
      mapExamenes.get(ex.id).analitos.push(item);
    }

    setExamenesLista(Array.from(mapExamenes.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setLoading(false);
  }

  async function recargarExamenActual() {
    if (!examenSeleccionado) return;
    const { data, error } = await supabase.from("lab_catalogo_analitos").select(`
      id, nombre_analito, unidad, orden_visual, formula_calculo,
      lab_rangos_referencia ( id, sexo, edad_min_dias, edad_max_dias, rango_texto, rango_min, rango_max, unidad, activo )
    `).eq("examen_id", examenSeleccionado.id).order("orden_visual", { ascending: true });
    
    if (!error) {
       const examenActualizado = { ...examenSeleccionado, analitos: data || [] };
       setExamenSeleccionado(examenActualizado);
       cargarDetalleExamen(examenActualizado);
       cargarEstructuraCompleta(); 
    }
  }

  async function handleCrearAnalitoGlobal() {
    const nombre = window.prompt("Nombre del nuevo analito (Ej: PESO):");
    if (!nombre || !nombre.trim()) return;
    
    const maxOrden = rows.reduce((max, r) => r.esPrimeroDelGrupo ? Math.max(max, r.orden_visual || 0) : max, 0);
    const toastId = toast.loading("Inyectando nuevo analito...");
    
    const { error } = await supabase.from("lab_catalogo_analitos").insert({
      examen_id: examenSeleccionado.id,
      nombre_analito: nombre.trim().toUpperCase(),
      unidad: "",
      orden_visual: maxOrden + 1
    });

    if (error) return toast.error("Error al crear: " + error.message, { id: toastId });
    toast.success("Analito creado exitosamente", { id: toastId });
    recargarExamenActual();
  }

  async function handleEliminarAnalitoGlobal(analito_id, nombre) {
    if (!window.confirm(`⚠️ ¿ELIMINAR ANALITO?\n\nVas a eliminar permanentemente el analito "${nombre}" y todos sus rangos.\nEsta acción NO se puede deshacer. ¿Continuar?`)) return;
    const toastId = toast.loading("Eliminando de la base de datos...");
    const { error } = await supabase.from("lab_catalogo_analitos").delete().eq("id", analito_id);
    if (error) return toast.error("Error al eliminar: " + error.message, { id: toastId });
    toast.success("Analito eliminado", { id: toastId });
    recargarExamenActual();
  }

  async function handleActualizarNombreAnalito(analito_id, nuevoNombre) {
    if (!nuevoNombre || !nuevoNombre.trim()) return;
    const nombreClean = nuevoNombre.trim().toUpperCase();
    const row = rows.find(r => r.analito_id === analito_id);
    if (row && row.nombre_analito === nombreClean) return; 

    const { error } = await supabase.from("lab_catalogo_analitos").update({ nombre_analito: nombreClean }).eq("id", analito_id);
    if (!error) {
       setRows(prev => prev.map(r => r.analito_id === analito_id ? { ...r, nombre_analito: nombreClean } : r));
       toast.success("Nombre actualizado");
       cargarEstructuraCompleta(); 
    } else toast.error("Error al actualizar nombre en base de datos");
  }

  async function handleActualizarOrdenAnalito(analito_id, nuevoOrden) {
    const ordenNum = Number(nuevoOrden);
    if (isNaN(ordenNum)) return;
    const row = rows.find(r => r.analito_id === analito_id);
    if (row && row.orden_visual === ordenNum) return; 

    const { error } = await supabase.from("lab_catalogo_analitos").update({ orden_visual: ordenNum }).eq("id", analito_id);
    if (!error) {
       toast.success("Orden actualizado");
       recargarExamenActual(); 
    } else toast.error("Error al actualizar orden");
  }

  function cargarDetalleExamen(examen) {
    setExamenSeleccionado(examen);
    const flatRows = [];
    
    examen.analitos.forEach((analito) => {
      const rangos = analito.lab_rangos_referencia || [];
      const hasFormula = !!analito.formula_calculo;
      
      if (rangos.length === 0) {
        flatRows.push(crearFilaVacia(analito, true, 0, null, hasFormula, analito.formula_calculo));
      } else {
        rangos.sort((a, b) => a.id - b.id).forEach((r, idx) => {
          const minT = diasAUnidad(r.edad_min_dias);
          const maxT = diasAUnidad(r.edad_max_dias);
          
          flatRows.push({
            rowKey: `rango-${r.id}`,
            analito_id: analito.id,
            nombre_analito: analito.nombre_analito,
            orden_visual: analito.orden_visual || 0,
            rango_id: r.id,
            sexo: r.sexo ?? "ALL",
            local_min_val: minT.val, local_min_un: minT.un,
            local_max_val: maxT.val, local_max_un: maxT.un,
            rango_texto: r.rango_texto ?? "",
            rango_min: r.rango_min ?? "",
            rango_max: r.rango_max ?? "",
            unidad: r.unidad ?? analito.unidad ?? "",
            activo: r.activo ?? true,
            esNuevo: false,
            esPrimeroDelGrupo: idx === 0,
            totalVariaciones: rangos.length - 1,
            is_calculado: hasFormula, 
            formula_calculo: analito.formula_calculo || "" 
          });
        });
      }
    });
    setRows(flatRows);
    setAnalitosExpandidos({});
    setIsDirty(false);
  }

  function crearFilaVacia(analito, esPrimeroDelGrupo = false, hijasExistentes = 0, baseFila = null, isCalc = false, formulaStr = "") {
    return {
      rowKey: `nuevo-${analito.id || baseFila?.analito_id}-${Date.now()}-${Math.random()}`,
      analito_id: analito.id || baseFila?.analito_id,
      nombre_analito: analito.nombre_analito || baseFila?.nombre_analito,
      orden_visual: analito.orden_visual || baseFila?.orden_visual || 0,
      rango_id: null,
      sexo: baseFila ? baseFila.sexo : "ALL",
      local_min_val: baseFila ? baseFila.local_min_val : 0, local_min_un: baseFila ? baseFila.local_min_un : "A",
      local_max_val: baseFila ? baseFila.local_max_val : "", local_max_un: baseFila ? baseFila.local_max_un : "A",
      rango_texto: baseFila ? baseFila.rango_texto : "",
      rango_min: baseFila ? baseFila.rango_min : "",
      rango_max: baseFila ? baseFila.rango_max : "",
      unidad: baseFila ? baseFila.unidad : (analito.unidad || ""),
      activo: true, esNuevo: true, esPrimeroDelGrupo, totalVariaciones: hijasExistentes,
      is_calculado: baseFila ? baseFila.is_calculado : isCalc,
      formula_calculo: baseFila ? baseFila.formula_calculo : formulaStr
    };
  }

  function updateRow(rowKey, field, value) {
    setIsDirty(true);
    setRows((prev) => prev.map((row) => (row.rowKey === rowKey ? { ...row, [field]: value } : row)));
  }

  function toggleCalculado(rowKey, currentState) {
    setIsDirty(true);
    setRows(prev => prev.map(r => {
      if (r.rowKey === rowKey) return { ...r, is_calculado: !currentState, formula_calculo: !currentState ? "" : null };
      return r;
    }));
  }

  function insertarTokenFormula(rowKey, token) {
    if (!token) return;
    setIsDirty(true);
    setRows(prev => prev.map(r => {
      if (r.rowKey === rowKey) {
        const actual = r.formula_calculo ? r.formula_calculo.trim() : "";
        return { ...r, formula_calculo: actual ? `${actual} ${token}` : token };
      }
      return r;
    }));
  }

  async function handleCrearUnidad(rowKey) {
    const nueva = window.prompt("Nueva unidad (Ej: fmol/mL):");
    if (!nueva || !nueva.trim()) return;
    const nombreClean = nueva.trim();
    const { error } = await supabase.from("lab_unidades").insert({ nombre: nombreClean });
    if (error && error.code !== '23505') return toast.error("Error al guardar unidad en la base de datos");
    if (!unidadesLista.includes(nombreClean)) setUnidadesLista(prev => [...prev, nombreClean].sort());
    updateRow(rowKey, "unidad", nombreClean);
    toast.success(`Unidad ${nombreClean} agregada`);
  }

  function duplicarRango(index, rowActual) {
    setIsDirty(true);
    const nuevaFila = crearFilaVacia({}, false, 0, rowActual); 
    const nuevosRows = [...rows];
    const parentIndex = nuevosRows.findIndex(r => r.analito_id === rowActual.analito_id && r.esPrimeroDelGrupo);
    if (parentIndex !== -1) nuevosRows[parentIndex].totalVariaciones += 1;
    nuevosRows.splice(index + 1, 0, nuevaFila); 
    setRows(nuevosRows);
    setAnalitosExpandidos(prev => ({...prev, [rowActual.analito_id]: true}));
  }

  async function eliminarRango(rowKey, rango_id, analito_id) {
    if (!window.confirm("¿Seguro de eliminar este rango permanentemente?")) return;
    if (rango_id) {
      const toastId = toast.loading("Eliminando...");
      const { error } = await supabase.from("lab_rangos_referencia").delete().eq("id", rango_id);
      if (error) return toast.error("Error al eliminar", { id: toastId });
      toast.success("Rango eliminado", { id: toastId });
    }
    let nuevosRows = [...rows];
    const index = nuevosRows.findIndex(r => r.rowKey === rowKey);
    if (nuevosRows[index].esPrimeroDelGrupo && nuevosRows[index + 1] && nuevosRows[index + 1].analito_id === analito_id) {
      nuevosRows[index + 1].esPrimeroDelGrupo = true;
      nuevosRows[index + 1].totalVariaciones = (nuevosRows[index].totalVariaciones || 1) - 1;
    } else {
      const parentIndex = nuevosRows.findIndex(r => r.analito_id === analito_id && r.esPrimeroDelGrupo);
      if (parentIndex !== -1) nuevosRows[parentIndex].totalVariaciones = Math.max(0, nuevosRows[parentIndex].totalVariaciones - 1);
    }
    setRows(nuevosRows.filter(r => r.rowKey !== rowKey));
    setIsDirty(true);
  }

  async function guardarCambiosRangos() {
    setGuardando(true);
    const toastId = toast.loading("Guardando rangos y fórmulas...");
    try {
      const promesasRangos = rows.map((row) => {
        const minDiasFinal = unidadADias(row.local_min_val, row.local_min_un) || 0;
        const maxDiasFinal = unidadADias(row.local_max_val, row.local_max_un);
        const payload = {
          analito_id: row.analito_id, sexo: row.sexo || "ALL", edad_min_dias: minDiasFinal, edad_max_dias: maxDiasFinal,
          rango_texto: row.rango_texto?.trim() || null, rango_min: row.rango_min === "" || row.rango_min === null ? null : Number(row.rango_min),
          rango_max: row.rango_max === "" || row.rango_max === null ? null : Number(row.rango_max), unidad: row.unidad?.trim() || null, activo: !!row.activo,
        };
        if (row.rango_id) return supabase.from("lab_rangos_referencia").update(payload).eq("id", row.rango_id);
        else return supabase.from("lab_rangos_referencia").insert(payload);
      });

      const promesasFormulas = rows.filter(r => r.esPrimeroDelGrupo).map(r => {
        const formVal = r.is_calculado && r.formula_calculo ? r.formula_calculo.trim() : null;
        const unidadGlobal = r.unidad?.trim() || null; 
        
        return supabase.from("lab_catalogo_analitos").update({ 
          formula_calculo: formVal,
          unidad: unidadGlobal 
        }).eq("id", r.analito_id);
      });

      await Promise.all([...promesasRangos, ...promesasFormulas]);
      await cargarEstructuraCompleta();
      setIsDirty(false);
      toast.success("Cambios guardados", { id: toastId });
      
      if (examenSeleccionado) {
        const examenActualizado = examenesLista.find(e => e.id === examenSeleccionado.id) || examenSeleccionado;
        cargarDetalleExamen(examenActualizado);
      }
    } catch (e) {
      toast.error("Error al guardar: " + e.message, { id: toastId });
    } finally {
      setGuardando(false);
    }
  }

  const examenesFiltrados = useMemo(() => {
    const s = busquedaIzquierda.trim().toLowerCase();
    if (!s) return examenesLista;
    return examenesLista.filter((ex) => ex.codigo.toLowerCase().includes(s) || ex.nombre.toLowerCase().includes(s));
  }, [examenesLista, busquedaIzquierda]);

  const toggleExpandir = (id) => setAnalitosExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ display: "flex", flex: 1, height: "100%", overflow: "hidden", width: "100%" }}>
      {/* COLUMNA IZQUIERDA */}
      <div style={{ width: "320px", backgroundColor: "#ffffff", borderRight: "1px solid #cbd5e1", display: "flex", flexDirection: "column", zIndex: 20 }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>Menú de Exámenes</h2>
          <div style={{ position: "relative", width: "100%", boxSizing: "border-box" }}>
            <input 
              type="text" placeholder="Buscar examen..." value={busquedaIzquierda} onChange={(e) => setBusquedaIzquierda(e.target.value)} 
              style={{ width: "100%", padding: "8px 30px 8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
            />
            {busquedaIzquierda && (
              <button onClick={() => setBusquedaIzquierda("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            )}
          </div>
        </div>
        
        <div className="lis-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>Cargando catálogo...</div>
          ) : examenesFiltrados.map((ex) => (
            <div key={ex.id} className={`master-list-item ${examenSeleccionado?.id === ex.id ? "active" : ""}`} onClick={() => { if (!isDirty) cargarDetalleExamen(ex); else toast.error("Guarda primero los cambios."); }}>
              <div style={{ fontWeight: "700", fontSize: "13px" }}>{ex.nombre}</div>
              <div className="text-gray-500" style={{ fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                <span>{ex.codigo}</span><span>{ex.analitos.length} analitos</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUMNA DERECHA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#f8fafc", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", backgroundColor: "#ffffff", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {examenSeleccionado ? (
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700", letterSpacing: "0.05em", marginBottom: "2px" }}>EDITANDO RANGOS PARA:</div>
              <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>{examenSeleccionado.codigo} - {examenSeleccionado.nombre}</h1>
            </div>
          ) : <h1 style={{ fontSize: "18px", color: "#64748b" }}>Selecciona un examen</h1>}

          {examenSeleccionado && (
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {isDirty && <span style={{ color: "#d97706", fontWeight: "700", fontSize: "13px" }}>⚠️ Cambios sin guardar</span>}
              <button onClick={handleCrearAnalitoGlobal} style={{ backgroundColor: "#10b981", color: "white", padding: "8px 16px", borderRadius: "6px", fontWeight: "700", fontSize: "13px", border: "none", cursor: "pointer", transition: "all 0.2s" }}>➕ Nuevo Analito</button>
              <button onClick={guardarCambiosRangos} disabled={guardando || !isDirty} style={{ backgroundColor: isDirty ? "#0ea5e9" : "#e2e8f0", color: isDirty ? "#ffffff" : "#94a3b8", padding: "8px 24px", borderRadius: "6px", fontWeight: "700", fontSize: "13px", border: "none", cursor: isDirty ? "pointer" : "not-allowed", transition: "all 0.2s" }}>{guardando ? "Guardando..." : "Guardar Cambios"}</button>
            </div>
          )}
        </div>

        <div className="lis-scroll" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {examenSeleccionado ? (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "24%" }}>Analito & Fórmula</th>
                    <th style={{ width: "12%", textAlign: "center" }}>Aplica a (Sexo)</th>
                    <th style={{ width: "24%", textAlign: "center" }}>Rango de Edad</th>
                    <th style={{ width: "10%" }}>Texto</th>
                    <th style={{ width: "12%", textAlign: "center" }}>Numérico</th>
                    <th style={{ width: "12%" }}>Unidad</th>
                    <th style={{ width: "6%", textAlign: "center" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isExpanded = analitosExpandidos[row.analito_id];
                    if (!row.esPrimeroDelGrupo && !isExpanded) return null;

                    return (
                      <tr key={row.rowKey} className={row.esPrimeroDelGrupo ? "group-start" : "variation-row"}>
                        <td style={{ color: "#0f172a" }}>
                          {row.esPrimeroDelGrupo ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                                <input type="number" title="Orden Visual" defaultValue={row.orden_visual} onBlur={(e) => handleActualizarOrdenAnalito(row.analito_id, e.target.value)} style={{ width: "35px", padding: "2px", textAlign: "center", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", outline: "none", color: "#64748b" }} />
                                <input type="text" defaultValue={row.nombre_analito} onBlur={(e) => handleActualizarNombreAnalito(row.analito_id, e.target.value)} style={{ fontWeight: "800", fontSize: "13px", border: "1px solid transparent", background: "transparent", color: "#0f172a", flex: 1, outline: "none", padding: "2px 4px", borderRadius: "4px", transition: "0.2s" }} onFocus={(e) => { e.target.style.border = "1px solid #0ea5e9"; e.target.style.background = "#fff"; }} onBlurCapture={(e) => { e.target.style.border = "1px solid transparent"; e.target.style.background = "transparent"; }} title="Clic para editar el nombre del analito" />
                                <button onClick={() => handleEliminarAnalitoGlobal(row.analito_id, row.nombre_analito)} className="btn-action delete" title="Eliminar Analito" style={{ padding: "4px 6px" }}>🗑️</button>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                                <button onClick={() => toggleCalculado(row.rowKey, row.is_calculado)} style={{ background: row.is_calculado ? "#e0e7ff" : "#f1f5f9", color: row.is_calculado ? "#4338ca" : "#64748b", border: "1px solid", borderColor: row.is_calculado ? "#c7d2fe" : "#cbd5e1", borderRadius: "4px", padding: "2px 6px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>{row.is_calculado ? "🧮 Calculado" : "✍️ Manual"}</button>
                              </div>
                              {row.is_calculado && (
                                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #bae6fd", borderRadius: "6px", padding: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <input type="text" value={row.formula_calculo || ""} onChange={(e) => updateRow(row.rowKey, "formula_calculo", e.target.value)} placeholder="Fórmula. Ej: [COLESTEROL] - [HDL]" className="cell-input" style={{ backgroundColor: "#fff", fontFamily: "monospace", fontSize: "11px", width: "100%", border: "1px solid #cbd5e1" }} />
                                  <select className="cell-input" style={{ fontSize: "11px", padding: "6px", color: "#0284c7", fontWeight: "bold", cursor: "pointer", border: "1px solid #bae6fd" }} onChange={(e) => { insertarTokenFormula(row.rowKey, e.target.value); e.target.value = ""; }}>
                                    <option value="">🔍 + Buscar e insertar analito global...</option>
                                    {examenesLista.map(ex => ( <optgroup key={ex.id} label={`-- ${ex.nombre} --`}>{ex.analitos.map(a => <option key={a.id} value={`[${a.nombre_analito}]`}>{a.nombre_analito}</option>)}</optgroup> ))}
                                  </select>
                                </div>
                              )}
                              {row.totalVariaciones > 0 && (<button onClick={() => toggleExpandir(row.analito_id)} style={{ alignSelf: "flex-start", background: "none", border: "none", fontSize: "10px", color: "#0ea5e9", cursor: "pointer", fontWeight: "800", padding: 0, marginTop: "4px" }}>{isExpanded ? `▲ Ocultar variantes (${row.totalVariaciones})` : `▼ Ver variantes (${row.totalVariaciones})`}</button>)}
                            </div>
                          ) : (<div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "12px", color: "#94a3b8", paddingTop: "6px" }}><span>↳</span> <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Variante</span></div>)}
                        </td>

                        <td style={{ paddingTop: "10px" }}>
                          <select className="cell-input" style={{ width: "100%", fontWeight: "600", color: "#475569" }} value={row.sexo} onChange={(e) => updateRow(row.rowKey, "sexo", e.target.value)}>
                            <option value="ALL">Univ. (H/M/Ind)</option><option value="M">Hombres (M)</option><option value="F">Mujeres (F)</option><option value="OTRO">Otros</option>
                          </select>
                        </td>

                        <td style={{ paddingTop: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", backgroundColor: "#f8fafc", padding: "4px", borderRadius: "6px", border: "1px solid #e2e8f0", width: "fit-content", margin: "0 auto" }}>
                            <span style={{ fontSize: "11px", color: "#334155", fontWeight: "900" }}>DE</span>
                            <input type="number" className="cell-input" style={{ width: "42px", padding: "4px", textAlign: "center", background: "#fff" }} value={row.local_min_val} onChange={(e) => updateRow(row.rowKey, "local_min_val", e.target.value)} />
                            <select className="cell-input" style={{ width: "65px", padding: "4px 20px 4px 4px", background: "transparent", border: "none", fontWeight: "bold" }} value={row.local_min_un} onChange={(e) => updateRow(row.rowKey, "local_min_un", e.target.value)}><option value="A">Años</option><option value="M">Meses</option><option value="D">Días</option></select>
                            <span style={{ fontSize: "11px", color: "#334155", fontWeight: "900", margin: "0 2px" }}>A</span>
                            <input type="number" className="cell-input" placeholder="Máx" style={{ width: "42px", padding: "4px", textAlign: "center", background: "#fff" }} value={row.local_max_val} onChange={(e) => updateRow(row.rowKey, "local_max_val", e.target.value)} />
                            <select className="cell-input" style={{ width: "65px", padding: "4px 20px 4px 4px", background: "transparent", border: "none", fontWeight: "bold" }} value={row.local_max_un} onChange={(e) => updateRow(row.rowKey, "local_max_un", e.target.value)}><option value="A">Años</option><option value="M">Meses</option><option value="D">Días</option></select>
                          </div>
                        </td>

                        <td style={{ paddingTop: "10px" }}>
                          <input type="text" className="cell-input" style={{ width: "100%" }} placeholder="Ej: Negativo" value={row.rango_texto} onChange={(e) => updateRow(row.rowKey, "rango_texto", e.target.value)} />
                        </td>

                        <td style={{ paddingTop: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                            <input type="number" step="any" className="cell-input" style={{ width: "45px", textAlign: "center", fontWeight: "bold", color: "#0284c7" }} value={row.rango_min} onChange={(e) => updateRow(row.rowKey, "rango_min", e.target.value)} />
                            <span style={{ color: "#94a3b8", fontWeight: "bold" }}>-</span>
                            <input type="number" step="any" className="cell-input" style={{ width: "45px", textAlign: "center", fontWeight: "bold", color: "#0284c7" }} value={row.rango_max} onChange={(e) => updateRow(row.rowKey, "rango_max", e.target.value)} />
                          </div>
                        </td>

                        <td style={{ paddingTop: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <select className="cell-input" style={{ flex: 1, fontWeight: "600" }} value={row.unidad} onChange={(e) => updateRow(row.rowKey, "unidad", e.target.value)}>
                              <option value="">Ninguna</option>{unidadesLista.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <button onClick={() => handleCrearUnidad(row.rowKey)} style={{ background: "#e0f2fe", color: "#0284c7", border: "1px solid #bae6fd", borderRadius: "4px", width: "24px", height: "24px", fontWeight: "bold", cursor: "pointer", flexShrink: 0 }}>+</button>
                          </div>
                        </td>

                        <td style={{ paddingTop: "10px" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button className="btn-action" title="Duplicar hacia abajo (Variante)" onClick={() => duplicarRango(index, row)}>➕</button>
                              <button className="btn-action delete" title="Eliminar regla de rango" onClick={() => eliminarRango(row.rowKey, row.rango_id, row.analito_id)}>🗑️</button>
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: row.activo ? "#059669" : "#dc2626", fontWeight: "bold", cursor: "pointer" }}>
                              <input type="checkbox" style={{ accentColor: "#0ea5e9" }} checked={row.activo} onChange={(e) => updateRow(row.rowKey, "activo", e.target.checked)} />
                              {row.activo ? "ON" : "OFF"}
                            </label>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "48px" }}>📊</div><h2 style={{ fontSize: "18px", fontWeight: "700" }}>Modo Edición Rápida</h2><p>Selecciona un examen a la izquierda para empezar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}