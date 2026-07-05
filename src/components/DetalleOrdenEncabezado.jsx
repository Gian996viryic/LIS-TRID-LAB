import React from "react";

export default function DetalleOrdenEncabezado({ 
  orden, intentarCerrar, tieneDeuda, deuda, 
  tieneMicro, activeMainTab, setActiveMainTab,
  enCola, posicionActual, totalCola, handlePrev, handleNext // 🚀 NUEVAS PROPS
}) {
  return (
    <>
      <div style={{ background: "#d4d4d4", padding: "4px 8px", borderBottom: "1px solid #999", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span>Áreas de trabajo \ General \ <b>Validación por petición</b></span>
          
          {/* 🚀 CAJA DE NAVEGACIÓN (SOLO VISIBLE SI ESTÁS EN COLA) */}
          {enCola && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", border: "1px solid #94a3b8", borderRadius: "4px", padding: "2px 8px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
               <button onClick={handlePrev} disabled={posicionActual <= 1} style={{ border: "none", background: "transparent", cursor: posicionActual <= 1 ? "not-allowed" : "pointer", fontSize: "14px", opacity: posicionActual <= 1 ? 0.4 : 1, color: "#0369a1" }}>◀</button>
               <span style={{ fontSize: "11px", fontWeight: "bold", color: "#0f172a" }}>Validando: {posicionActual} de {totalCola}</span>
               <button onClick={handleNext} disabled={posicionActual >= totalCola} style={{ border: "none", background: "transparent", cursor: posicionActual >= totalCola ? "not-allowed" : "pointer", fontSize: "14px", opacity: posicionActual >= totalCola ? 0.4 : 1, color: "#0369a1" }}>▶</button>
               
               {/* Botón rápido para saltar a la siguiente sin tener que validar nada */}
               <button onClick={handleNext} style={{ border: "1px solid #cbd5e1", background: "#e2e8f0", cursor: "pointer", fontSize: "10px", fontWeight: "bold", color: "#475569", padding: "2px 6px", borderRadius: "3px", marginLeft: "4px" }} title="Saltar a la siguiente sin guardar cambios">Omitir ⏭</button>
            </div>
          )}
        </div>

        <button className="inf-btn" onClick={intentarCerrar} style={{ padding: "2px 8px", fontWeight: "bold", color: "#dc2626" }}>Cerrar ✕</button>
      </div>

      {tieneDeuda && (
        <div style={{ background: "#fef2f2", border: "2px solid #ef4444", color: "#b91c1c", padding: "8px", marginBottom: "4px", borderRadius: "6px", fontWeight: "bold", textAlign: "center", fontSize: "14px", textTransform: "uppercase", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", flexShrink: 0, boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)" }}>
          <span>⚠️ ATENCIÓN: ESTA ORDEN TIENE UN SALDO PENDIENTE DE ${deuda.toFixed(2)}</span>
          <span style={{ fontSize: "11px", fontWeight: "normal", background: "#ef4444", color: "white", padding: "3px 10px", borderRadius: "12px", letterSpacing: "1px" }}>Validación e impresión bloqueadas</span>
        </div>
      )}

      <div className="inf-panel" style={{ flexShrink: 0 }}>
        <div className="inf-header">Datos del paciente</div>
        <div style={{ padding: "4px 8px", display: "flex", gap: "40px", background: "#f9fafb" }}>
          <div><div style={{ color: "#666", fontSize: "10px" }}>Cédula</div><div style={{ fontWeight: "bold" }}>{orden?.paciente_cedula || "-"}</div></div>
          <div><div style={{ color: "#666", fontSize: "10px" }}>Apellidos, Nombre</div><div style={{ fontWeight: "bold" }}>{orden?.paciente_nombre?.toUpperCase() || "-"}</div></div>
          <div><div style={{ color: "#666", fontSize: "10px" }}>Sexo</div><div>{orden?.paciente_sexo === 'M' ? 'Hombre' : orden?.paciente_sexo === 'F' ? 'Mujer' : '-'}</div></div>
          <div><div style={{ color: "#666", fontSize: "10px" }}>Edad</div><div>{orden?.paciente_edad || "-"}</div></div>
          <div><div style={{ color: "#666", fontSize: "10px" }}>Procedencia / Médico</div><div>{orden?.procedencia || "AMBULATORIO"} / {orden?.solicitado_por || "-"}</div></div>
        </div>
      </div>

      {tieneMicro && (
        <div style={{ display: "flex", padding: "0 8px", marginTop: "4px", flexShrink: 0 }}>
          <button
            onClick={() => setActiveMainTab("general")}
            style={{ padding: "6px 16px", background: activeMainTab === "general" ? "#fff" : "#e5e7eb", border: "1px solid #9ca3af", borderBottom: activeMainTab === "general" ? "none" : "1px solid #9ca3af", borderTopLeftRadius: "6px", borderTopRightRadius: "6px", fontWeight: "bold", cursor: "pointer", color: activeMainTab === "general" ? "#0284c7" : "#64748b", zIndex: activeMainTab === "general" ? 2 : 1, position: "relative", top: "1px" }}
          >
            🩸 Exámenes Generales
          </button>
          <button
            onClick={() => setActiveMainTab("microbiologia")}
            style={{ padding: "6px 16px", background: activeMainTab === "microbiologia" ? "#fff" : "#e5e7eb", border: "1px solid #9ca3af", borderBottom: activeMainTab === "microbiologia" ? "none" : "1px solid #9ca3af", borderTopLeftRadius: "6px", borderTopRightRadius: "6px", fontWeight: "bold", cursor: "pointer", color: activeMainTab === "microbiologia" ? "#0284c7" : "#64748b", zIndex: activeMainTab === "microbiologia" ? 2 : 1, position: "relative", top: "1px", marginLeft: "4px" }}
          >
            🧫 Panel de Microbiología
          </button>
        </div>
      )}
    </>
  );
}