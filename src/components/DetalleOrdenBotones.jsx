import React from "react";

export default function DetalleOrdenBotones({
  groupedResultadosLength, guardando, algunResultadoLleno, tieneDeuda, haySeleccionados,
  guardarCambios, intentarCerrar, repetirTodasSeleccionadas, handleImprimir,
  setMostrarHistorial, setShowModalEnvio, enCola // 🚀 RECIBIMOS LA BANDERA
}) {
  return (
    <div style={{ background: "#d4d4d4", padding: "6px 8px", borderTop: "1px solid #9ca3af", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <div style={{ fontSize: "11px", color: "#555" }}>
        &lt;&lt; &lt; &gt; &gt;&gt; página 1 de 1 | Registros: {groupedResultadosLength}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px" }}>
        <button className="inf-btn" onClick={() => alert("Función de Comentario global en desarrollo")}>💬 Comentario ▼</button>
        
        {/* 🚀 BOTÓN DINÁMICO: Cambia de texto y le avisa a guardarCambios si debe hacer Auto-Jump */}
        <button className="inf-btn inf-btn-primary" onClick={() => guardarCambios("VALIDAR_TODO", enCola)} disabled={guardando || !algunResultadoLleno || tieneDeuda}>
          {tieneDeuda ? "🔒 Validar Todo" : (enCola ? "✓ Validar y Siguiente ⏭" : "✓ Validar Todo")}
        </button>

        <button className="inf-btn" onClick={() => guardarCambios("GUARDAR_SOLO")} disabled={guardando}>💾 Guardar</button>
        <button className="inf-btn" onClick={intentarCerrar} disabled={guardando}>✕ Cancelar</button>
        <button className="inf-btn" onClick={repetirTodasSeleccionadas} disabled={guardando || !haySeleccionados}>↺ Repetir</button>
        
        <button className="inf-btn" onClick={handleImprimir} disabled={guardando || tieneDeuda}>
          {tieneDeuda ? "🔒 Imprimir / V.P." : "🖨 Imprimir / V.P."}
        </button>
        
        {/* 🚀 También el Val. Prueba hace Auto-Jump */}
        <button className="inf-btn" onClick={() => guardarCambios("VALIDAR_SELECCION", enCola)} disabled={guardando || !haySeleccionados || tieneDeuda}>
          {tieneDeuda ? "🔒 Val. Prueba" : (enCola ? "✓ Val. P. y Siguiente ⏭" : "✓ Val. Prueba")}
        </button>

        <button className="inf-btn" onClick={() => setMostrarHistorial(true)} disabled={guardando || !haySeleccionados}>📊 Historial Clínico</button>
        
        <button className="inf-btn" 
          onClick={setShowModalEnvio} 
          disabled={guardando || tieneDeuda} 
          style={{ background: tieneDeuda ? "#e5e7eb" : "linear-gradient(to bottom, #0284c7, #0369a1)", color: tieneDeuda ? "#9ca3af" : "white", borderColor: tieneDeuda ? "#d1d5db" : "#0c4a6e" }}
        >
          {tieneDeuda ? "🔒 Enviar Resultados" : "📤 Enviar Resultados"}
        </button>
      </div>
    </div>
  );
}