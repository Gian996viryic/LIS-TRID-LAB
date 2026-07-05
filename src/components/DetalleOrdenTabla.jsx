import React, { useState, useEffect, memo } from "react";

function fmtDate(v) { if (!v) return ""; try { const d = new Date(v); const pad = (n) => String(n).padStart(2, "0"); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; } catch { return String(v); } }
function fmtDateShort(v) { if (!v) return ""; try { const d = new Date(v); const pad = (n) => String(n).padStart(2, "0"); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`; } catch { return String(v); } }
function fmtTime(v) { if (!v) return ""; try { const d = new Date(v); const pad = (n) => String(n).padStart(2, "0"); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; } catch { return String(v); } }

function calcularFlag(row, valorAProbar) {
  const valStr = valorAProbar != null ? String(valorAProbar).trim() : "";
  if (valStr === "") return "";
  const num = Number(valStr.replace(',', '.'));
  if (Number.isNaN(num)) return ""; 
  if (row.rango_min !== null && row.rango_min !== undefined && num < Number(row.rango_min)) return "bajo";
  if (row.rango_max !== null && row.rango_max !== undefined && num > Number(row.rango_max)) return "alto";
  return "normal";
}

function referenciaTexto(row) {
  if (row.rango_texto) return row.rango_texto;
  if (row.rango_min !== null && row.rango_min !== undefined && row.rango_max !== null && row.rango_max !== undefined) return `${row.rango_min} - ${row.rango_max}`;
  return "";
}

function StatusBoxes({ tieneValor, validado }) {
  let color = "#d4d4d4"; if (tieneValor) color = validado ? "#84cc16" : "#f59e0b"; 
  return (
    <div style={{ display: "flex", gap: "2px", alignItems: "center", justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 6, height: 8, backgroundColor: color, border: "1px solid #999" }} />)}
    </div>
  );
}

const CeldaResultado = memo(({ row, index, onUpdate, handleKeyDown, bloqueado }) => {
  const [valLocal, setValLocal] = useState(row.local_resultado_numero || "");
  const [flagLocal, setFlagLocal] = useState(calcularFlag(row, row.local_resultado_numero));

  useEffect(() => { setValLocal(row.local_resultado_numero || ""); setFlagLocal(calcularFlag(row, row.local_resultado_numero)); }, [row.local_resultado_numero, row.rango_min, row.rango_max]);

  const isRed = flagLocal === "alto" || flagLocal === "bajo";
  const procesarGuardado = () => { if (valLocal !== (row.local_resultado_numero || "")) onUpdate(row.id, "local_resultado_numero", valLocal); };

  return (
    <>
      <input 
        className="inf-input cell-resultado-input" 
        style={{ height: "100%", color: isRed ? "#dc2626" : "#111", fontWeight: isRed ? "bold" : "normal", background: row.local_hist1 && !valLocal ? "#fef3c7" : "transparent", cursor: bloqueado ? "not-allowed" : "text" }} 
        type="text" autoComplete="off" data-index={index} value={valLocal} 
        onChange={(e) => { setValLocal(e.target.value); setFlagLocal(calcularFlag(row, e.target.value)); }}
        onBlur={procesarGuardado} onKeyDown={(e) => { if (e.key === 'Enter') { procesarGuardado(); handleKeyDown(e, index); } }}
        list={row.opciones_predefinidas ? `dl-${row.id}` : undefined}
      />
      {row.opciones_predefinidas && (<datalist id={`dl-${row.id}`}>{String(row.opciones_predefinidas).split(',').map((op, i) => <option key={i} value={op.trim()} />)}</datalist>)}
    </>
  );
});

export default function DetalleOrdenTabla({ 
  loadingDetalle, groupedResultados, examCounts, userNames,
  toggleAllSelection, updateResultado, handleKeyDown, setConfigModalObs 
}) {
  let lastAreaName = null;
  let lastExamName = null;

  if (loadingDetalle) return <div style={{ padding: 20 }}>Cargando analitos y configuración...</div>;
  if (groupedResultados.length === 0) return <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>No hay exámenes que coincidan con el filtro actual.</div>;

  return (
    <table className="inf-table"> 
      <colgroup>
        <col style={{ width: "2%" }} />   <col style={{ width: "4%" }} />   <col style={{ width: "14%" }} />
        <col style={{ width: "6%" }} />   <col style={{ width: "5%" }} />   <col style={{ width: "2%" }} />
        <col style={{ width: "8%" }} />   <col style={{ width: "2%" }} />   <col style={{ width: "2%" }} />
        <col style={{ width: "5%" }} />   <col style={{ width: "6%" }} />   <col style={{ width: "6%" }} />
        <col style={{ width: "4%" }} />   <col style={{ width: "4%" }} />   <col style={{ width: "6%" }} />
        <col style={{ width: "4%" }} />   <col style={{ width: "4%" }} />   <col style={{ width: "6%" }} />
        <col style={{ width: "5%" }} />   <col style={{ width: "5%" }} />
      </colgroup>
      <thead>
        <tr>
          <th title="Seleccionar Todas las Pruebas"><input type="checkbox" onChange={(e) => toggleAllSelection(e.target.checked)} /></th>
          <th title="Código de Prueba">Cód</th><th title="Nombre de la Prueba">Prueba</th><th title="Resultado Numérico o Texto">Res.</th>
          <th title="Unidad de Medida">Unid.</th><th title="Indicador Gráfico (Alto/Bajo)">*</th><th title="Valor de Referencia">V. Ref.</th>
          <th title="Alarma (High/Low/Normal)">A.</th><th title="Añadir Comentario">+</th><th title="Estado de la Prueba">Estado</th>
          <th title="Usuario que Valida">U. Val.</th><th title="Fecha de Validación">F. Val.</th><th title="Hora de Validación">H. Val.</th>
          <th title="Repeticiones">Rep.</th><th title="Fecha de Resultado">F. Res.</th><th title="Hora de Resultado">H. Res.</th>
          <th title="Instrumento de Medición">Inst.</th><th title="Usuario de Resultado">U. Res.</th>
          
          <th title="Último resultado validado">Histórico 1</th>
          <th title="Penúltimo resultado validado">Histórico 2</th>
        </tr>
      </thead>
      <tbody>
        {groupedResultados.map((row, index) => {
          const flag = calcularFlag(row, row.local_resultado_numero);
          const arrow = flag === "alto" ? "▲" : flag === "bajo" ? "▼" : "";
          const strValTest = row.local_resultado_numero != null ? String(row.local_resultado_numero).trim() : "";
          const comTest = row.local_comentario_resultado != null ? String(row.local_comentario_resultado).trim() : "";
          const tieneValor = strValTest !== "" || comTest !== "";
          
          const currentArea = row.db_area_nombre;
          const showAreaHeader = lastAreaName !== currentArea;
          lastAreaName = currentArea;

          const currentExamName = row.nombre_examen ? String(row.nombre_examen).trim() : "EXAMEN GENERAL";
          const isOrinaArea = currentArea.toUpperCase().includes("ORINA") || currentArea.toUpperCase().includes("URO");
          const isHecesArea = currentArea.toUpperCase().includes("HECES") || currentArea.toUpperCase().includes("COPRO") || currentArea.toUpperCase().includes("PARASITO");
          
          const isTrueProfile = examCounts[currentExamName] > 1 && (currentExamName.toUpperCase().includes("PERFIL") || currentExamName.toUpperCase().includes("HEMOGRAMA") || currentExamName.toUpperCase().includes("BIOMETRIA") || currentExamName.toUpperCase().includes("CURVA") || currentExamName.toUpperCase().includes("PANEL"));
          const showExamHeader = isTrueProfile && lastExamName !== currentExamName && !isOrinaArea && !isHecesArea;
          lastExamName = currentExamName;

          const isFirstOrina = isOrinaArea && row.nombre_analito === "Color";
          const isMicroOrina = isOrinaArea && row.nombre_analito === "Células Epiteliales Escamosas";
          const isFirstHeces = isHecesArea && row.nombre_analito === "Color";
          const isMicroHeces = isHecesArea && row.nombre_analito === "Leucocitos";

          const rawRefText = referenciaTexto(row);
          const refEsLarga = rawRefText.length > 20;
          const refCortada = refEsLarga ? rawRefText.substring(0, 17) + "..." : rawRefText;
          const tooltipHtml = rawRefText.split(';').map(s => s.trim()).join("<br/>");
          const analitoNombreLimpio = (row.nombre_analito || "").toUpperCase();

          return (
            <React.Fragment key={row.id || `fallback-${index}`}>
              {showAreaHeader && (<tr><td colSpan="20" style={{ background: "#0f172a", fontWeight: "900", color: "#f8fafc", textAlign: "center", padding: "6px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>🧪 {currentArea}</td></tr>)}
              {showExamHeader && (<tr style={{ background: "#e0f2fe", borderTop: "2px solid #bae6fd" }}><td colSpan="20" style={{ fontWeight: "800", color: "#0284c7", textAlign: "left", padding: "4px 12px", fontSize: "11px", textTransform: "uppercase" }}>📋 {currentExamName}</td></tr>)}
              
              {isFirstOrina && (<tr style={{ background: "#f8fafc" }}><td colSpan="20" style={{ fontWeight: "bold", color: "#475569", textAlign: "center", padding: "4px", fontSize: "10px", fontStyle: "italic" }}>--- EXAMEN FÍSICO Y QUÍMICO ---</td></tr>)}
              {isMicroOrina && (<tr style={{ background: "#f8fafc" }}><td colSpan="20" style={{ fontWeight: "bold", color: "#475569", textAlign: "center", padding: "4px", fontSize: "10px", fontStyle: "italic" }}>--- EXAMEN MICROSCÓPICO (SEDIMENTO) ---</td></tr>)}
              {isFirstHeces && (<tr style={{ background: "#f8fafc" }}><td colSpan="20" style={{ fontWeight: "bold", color: "#475569", textAlign: "center", padding: "4px", fontSize: "10px", fontStyle: "italic" }}>--- EXAMEN MACROSCÓPICO ---</td></tr>)}
              {isMicroHeces && (<tr style={{ background: "#f8fafc" }}><td colSpan="20" style={{ fontWeight: "bold", color: "#475569", textAlign: "center", padding: "4px", fontSize: "10px", fontStyle: "italic" }}>--- EXAMEN MICROSCÓPICO ---</td></tr>)}

              <tr className={row.local_selected ? "selected" : ""}>
                <td style={{ textAlign: "center" }}><input type="checkbox" checked={row.local_selected} onChange={(e) => updateResultado(row.id, "local_selected", e.target.checked)} /></td>
                <td style={{ color: "#666", textAlign: "center" }}>{row.analito_id || (row.id ? row.id.toString().slice(-4) : "-")}</td>
                <td style={{ fontWeight: "bold", textAlign: "left", paddingLeft: (isTrueProfile && !isOrinaArea && !isHecesArea) ? "16px" : "4px" }}>{(isTrueProfile && !isOrinaArea && !isHecesArea) ? "↳ " : ""}{analitoNombreLimpio}</td>
                
                <td style={{ padding: 0, position: "relative" }}>
                  {row.is_calculado ? (
                    <>
                      <div style={{ position: "absolute", top: 1, bottom: 1, left: 1, right: 1, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "3px", pointerEvents: "none" }}></div>
                      <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", opacity: 0.7, pointerEvents: "none" }}>🧮</span>
                      <input className="inf-input" style={{ position: "relative", zIndex: 1, height: "100%", width: "100%", color: flag === "alto" || flag === "bajo" ? "#dc2626" : "#1e293b", fontWeight: "bold", background: "transparent", textAlign: "center" }} type="text" value={row.local_resultado_numero || ""} readOnly title="Valor calculado automáticamente" />
                    </>
                  ) : (<CeldaResultado row={row} index={index} onUpdate={updateResultado} handleKeyDown={handleKeyDown} />)}
                </td>
                
                <td style={{ color: "#555", textAlign: "center" }}>{row.unidad || ""}</td>
                <td style={{ textAlign: "center", color: flag === "alto" || flag === "bajo" ? "#dc2626" : "", fontWeight: "bold" }}>{arrow}</td>
                
                <td style={{ color: "#666", textAlign: "center" }}>
                  {refEsLarga ? (<div className="tooltip-container"><span style={{ color: "#0284c7", fontWeight: "600" }}>{refCortada}</span><span className="tooltip-text" dangerouslySetInnerHTML={{ __html: tooltipHtml }}></span></div>) : (<span>{rawRefText}</span>)}
                </td>

                <td style={{ textAlign: "center", fontWeight: "bold", color: "#666" }}>{flag === "alto" ? "H" : flag === "bajo" ? "L" : "N"}</td>
                
                <td style={{ textAlign: "center", color: "#0369a1", fontWeight: "bold", cursor: "pointer", background: row.local_comentario_resultado ? "#e0f2fe" : "" }} onClick={() => setConfigModalObs({ isOpen: true, rowId: row.id, analitoNombre: analitoNombreLimpio, valorActual: row.local_comentario_resultado || "" })}>
                  {row.local_comentario_resultado ? "💬" : "+"}
                </td>
                
                <td style={{ textAlign: "center" }}><StatusBoxes tieneValor={tieneValor} validado={row.local_validado} /></td>
                <td style={{ color: "#111", fontWeight: "bold", textAlign: "center" }}>{row.validado_por ? (userNames[row.validado_por] || "SISTEMA") : ""}</td>
                <td style={{ color: "#555", textAlign: "center" }}>{fmtDate(row.validado_at)}</td>
                <td style={{ color: "#555", textAlign: "center" }}>{fmtTime(row.validado_at)}</td>
                <td style={{ color: "#b45309", textAlign: "center", fontWeight: "bold" }}>{row.local_repeticion || ""}</td>
                <td style={{ color: "#555", textAlign: "center" }}>{fmtDate(row.editado_at)}</td>
                <td style={{ color: "#555", textAlign: "center" }}>{fmtTime(row.editado_at)}</td>
                <td style={{ color: "#555", fontStyle: "italic", textAlign: "center" }}>MANUAL</td>
                <td style={{ color: "#555", textAlign: "center" }}>{row.editado_por ? (userNames[row.editado_por] || "SISTEMA") : ""}</td>
                
                {/* 🚀 HISTÓRICOS COMPACTOS CON TOOLTIP (HOVER) */}
                <td 
                  title={row.local_hist1 !== "" ? `Validado el: ${new Date(row.local_hist1_date).toLocaleString()}` : ""}
                  style={{ color: "#4f46e5", fontWeight: "bold", textAlign: "center", background: row.local_hist1 !== "" ? "#eef2ff" : "", cursor: row.local_hist1 !== "" ? "help" : "default" }}
                >
                  {row.local_hist1 || ""}
                </td>
                
                <td 
                  title={row.local_hist2 !== "" ? `Validado el: ${new Date(row.local_hist2_date).toLocaleString()}` : ""}
                  style={{ color: "#4f46e5", fontWeight: "bold", textAlign: "center", background: row.local_hist2 !== "" ? "#eef2ff" : "", cursor: row.local_hist2 !== "" ? "help" : "default" }}
                >
                  {row.local_hist2 || ""}
                </td>

              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}