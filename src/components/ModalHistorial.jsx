import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ModalHistorial({ isOpen, onClose, pacienteCedula, pacienteNombre, analitosSeleccionados }) {
  const [filasMatriz, setFilasMatriz] = useState([]);
  const [columnasFechas, setColumnasFechas] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen && pacienteCedula && analitosSeleccionados.length > 0) {
      cargarHistorial();
    }
  }, [isOpen, pacienteCedula, analitosSeleccionados]);

  async function cargarHistorial() {
    setCargando(true);
    try {
      // Obtenemos el ID de la orden actual para EXCLUIRLA del historial
      const currentOrdenId = analitosSeleccionados[0]?.orden_id;

      // 1. Buscamos las órdenes pasadas validadas (Excluyendo la actual)
      let query = supabase
        .from("lab_ordenes")
        .select("id, codigo_orden, created_at")
        .eq("paciente_cedula", pacienteCedula)
        .order("created_at", { ascending: false });
        
      if (currentOrdenId) {
         query = query.neq("id", currentOrdenId);
      }

      const { data: ordenes, error: errOrdenes } = await query;
      if (errOrdenes) throw errOrdenes;

      let resultadosValidados = [];

      // 2. Extraemos las Llaves Maestras de las pruebas que marcaste con el "visto"
      const selectedIdents = new Set(
         analitosSeleccionados.map(a => 
           a.analito_id || (a.examen_id && a.nombre_analito ? `${a.examen_id}_${a.nombre_analito.trim().toUpperCase()}` : (a.nombre_analito ? a.nombre_analito.trim().toUpperCase() : ""))
         )
      );

      if (ordenes && ordenes.length > 0) {
        const ordenesIds = ordenes.map(o => o.id);

        const { data: resultados, error: errRes } = await supabase
          .from("lab_orden_resultados")
          .select("orden_id, analito_id, examen_id, nombre_analito, resultado_numero, resultado_texto")
          .in("orden_id", ordenesIds)
          .eq("validado", true);

        if (!errRes && resultados) {
          // 🚀 FILTRO ESTRICTO: Solo conservamos los resultados que pertenezcan a los analitos seleccionados
          resultadosValidados = resultados.filter(r => {
              const rIdent = r.analito_id || (r.examen_id && r.nombre_analito ? `${r.examen_id}_${r.nombre_analito.trim().toUpperCase()}` : (r.nombre_analito ? r.nombre_analito.trim().toUpperCase() : ""));
              return selectedIdents.has(rIdent);
          });
        }
      }

      // 3. 🚀 BORRADOR MÁGICO: Filtramos y ocultamos las columnas (órdenes) que no tengan datos útiles
      const ordenesUtiles = ordenes.filter(o => 
        resultadosValidados.some(r => r.orden_id === o.id)
      );

      // 4. Armamos las filas de la matriz
      const filas = analitosSeleccionados.map(a => {
        const valActual = a.local_resultado_numero !== "" && a.local_resultado_numero !== null ? a.local_resultado_numero : a.resultado_texto;
        const aIdent = a.analito_id || (a.examen_id && a.nombre_analito ? `${a.examen_id}_${a.nombre_analito.trim().toUpperCase()}` : (a.nombre_analito ? a.nombre_analito.trim().toUpperCase() : ""));

        const resultadosDeEsteAnalito = {};
        
        resultadosValidados.forEach(r => {
            const rIdent = r.analito_id || (r.examen_id && r.nombre_analito ? `${r.examen_id}_${r.nombre_analito.trim().toUpperCase()}` : (r.nombre_analito ? r.nombre_analito.trim().toUpperCase() : ""));
            
            if (rIdent === aIdent) {
                resultadosDeEsteAnalito[r.orden_id] = r.resultado_numero !== null ? r.resultado_numero : r.resultado_texto;
            }
        });

        return {
          analito: a.nombre_analito,
          unidad: a.unidad || "",
          actual: valActual,
          historicos: resultadosDeEsteAnalito,
          area_nombre: a.db_area_nombre || "OTROS",
          tubo_id: a.tubo_id || "3",
          area_orden: a.db_area_orden || 999,
          examen_orden: a.db_examen_orden || 999,
          orden_visual: a.orden_visual || 0,
        };
      });

      // 5. Ordenamiento EXACTO al de DetalleOrden (Por Tubo -> Área -> Examen -> Analito)
      filas.sort((a, b) => {
        const tuboA = Number(a.tubo_id);
        const tuboB = Number(b.tubo_id);
        if (tuboA !== tuboB) return tuboA - tuboB;
        if (a.area_orden !== b.area_orden) return a.area_orden - b.area_orden;
        if (a.examen_orden !== b.examen_orden) return a.examen_orden - b.examen_orden;
        return a.orden_visual - b.orden_visual;
      });

      setColumnasFechas(ordenesUtiles);
      setFilasMatriz(filas);
    } catch (error) {
      console.error("Error al cargar historial:", error);
    } finally {
      setCargando(false);
    }
  }

  let lastAreaName = null;

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#fff", width: "950px", maxWidth: "95vw", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Cabecera */}
        <div style={{ background: "#0f172a", color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px" }}>📊 Matriz Clínica (Delta Check)</h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Paciente: {pacienteNombre} | C.I: {pacienteCedula}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "18px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
        </div>

        {/* Cuerpo con Scroll Horizontal y Vertical */}
        <div style={{ padding: "16px", maxHeight: "60vh", overflow: "auto", background: "#f8fafc" }}>
          {cargando ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>⏳ Construyendo matriz comparativa...</div>
          ) : filasMatriz.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Seleccione al menos una prueba válida.</div>
          ) : columnasFechas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontStyle: "italic", border: "1px dashed #cbd5e1", borderRadius: "6px" }}>
              El paciente no tiene un historial previo validado para las pruebas que has seleccionado.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", background: "#fff", border: "1px solid #e2e8f0" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <tr>
                  <th style={{ background: "#e2e8f0", padding: "10px", textAlign: "left", borderBottom: "2px solid #cbd5e1", minWidth: "180px", color: "#334155" }}>
                    Prueba (Analito)
                  </th>
                  <th style={{ background: "#dcfce7", padding: "10px", textAlign: "center", borderBottom: "2px solid #86efac", borderRight: "2px solid #cbd5e1", minWidth: "120px", color: "#16a34a" }}>
                    <span style={{ display: "block", fontSize: "14px" }}>📍 ACTUAL</span>
                    <span style={{ fontWeight: "normal", fontSize: "10px" }}>En edición</span>
                  </th>
                  
                  {columnasFechas.map((col, i) => {
                    const fechaStr = new Date(col.created_at).toLocaleDateString();
                    return (
                      <th key={col.id} style={{ background: "#f1f5f9", padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #cbd5e1", minWidth: "130px", borderRight: "1px solid #e2e8f0", color: "#475569" }}>
                        <span style={{ display: "block", fontSize: "13px" }}>{fechaStr}</span>
                        <span style={{ fontWeight: "normal", fontSize: "10px", color: "#94a3b8" }}>{col.codigo_orden}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filasMatriz.map((fila, index) => {
                  
                  const showAreaHeader = lastAreaName !== fila.area_nombre;
                  lastAreaName = fila.area_nombre;

                  return (
                    <React.Fragment key={index}>
                      {showAreaHeader && (
                        <tr style={{ background: "#0f172a" }}>
                          <td colSpan={columnasFechas.length + 2} style={{ fontWeight: "900", color: "#f8fafc", textAlign: "center", padding: "6px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            🧪 {fila.area_nombre}
                          </td>
                        </tr>
                      )}

                      <tr style={{ borderBottom: "1px solid #e2e8f0", background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ padding: "10px", fontWeight: "bold", color: "#0369a1", borderRight: "1px dashed #e2e8f0", paddingLeft: "15px" }}>
                          {fila.analito} <span style={{fontSize: "10px", color: "#94a3b8", fontWeight: "normal"}}>({fila.unidad})</span>
                        </td>
                        
                        <td style={{ padding: "10px", textAlign: "center", borderRight: "2px solid #cbd5e1", background: "#f0fdf4" }}>
                          <span style={{ fontWeight: "bold", fontSize: "15px", color: "#15803d" }}>
                            {fila.actual || "-"}
                          </span>
                        </td>

                        {columnasFechas.map(col => {
                          const valorHistorico = fila.historicos[col.id];
                          return (
                            <td key={col.id} style={{ padding: "10px", textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
                              {valorHistorico ? (
                                 <span style={{ fontWeight: "bold", fontSize: "14px", color: "#1e40af" }}>{valorHistorico}</span>
                              ) : (
                                 <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie */}
        <div style={{ background: "#e2e8f0", padding: "10px 16px", textAlign: "right" }}>
          <button onClick={onClose} style={{ background: "#fff", border: "1px solid #94a3b8", padding: "6px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", color: "#475569" }}>Cerrar</button>
        </div>

      </div>
    </div>
  );
}