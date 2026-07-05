import React from "react";

export default function DetalleOrdenTubos({ orden, tubosUnicos, tubosActivos, toggleTubo, tieneMicro }) {
  return (
    <div style={{ display: "flex", gap: "4px", height: "90px", marginBottom: "4px", flexShrink: 0, padding: tieneMicro ? "4px" : "0" }}>
      <div className="inf-panel" style={{ flex: "0 0 250px", margin: 0 }}>
        <div className="inf-header">Detalle de Petición</div>
        <div style={{ padding: "4px", display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ color: "#666" }}>Petición</span>
          <input value={orden?.codigo_orden || ""} readOnly style={{ width: "120px", padding: "2px 4px", border: "1px solid #ccc", background: "#e5e7eb", fontWeight: "bold", fontSize: "11px" }} />
        </div>
      </div>
      <div className="inf-panel" style={{ flex: 1, overflowY: "auto", margin: 0 }}>
        <table className="inf-table">
          <colgroup><col style={{ width: "30px" }} /><col style={{ width: "150px" }} /><col style={{ width: "200px" }} /></colgroup>
          <tbody>
            {tubosUnicos.map((t) => (
              <tr key={t.id} className={tubosActivos.includes(t.id) ? "selected" : ""} onClick={() => toggleTubo(t.id)}>
                <td style={{ textAlign: "center" }}><input type="checkbox" checked={tubosActivos.includes(t.id)} readOnly /></td>
                <td style={{ color: "#0284c7", fontWeight: "bold", textAlign: "left" }}>{orden?.codigo_orden}.{t.id}</td>
                <td style={{ textAlign: "left" }}>{t.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}