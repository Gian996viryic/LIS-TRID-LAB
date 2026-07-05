import React, { useState, useEffect } from "react";

export default function ModalObservacion({ isOpen, onClose, analitoNombre, valorActual, onSave }) {
  const [texto, setTexto] = useState("");
  const [plantillasPersonalizadas, setPlantillasPersonalizadas] = useState([]);

  // Plantillas predefinidas del sistema (No se pueden borrar)
  const observacionesFrecuentes = [
    "Muestra ligeramente hemolizada.",
    "Muestra lipémica.",
    "Muestra ictérica.",
    "Muestra insuficiente para proceso completo.",
    "Presencia de coágulo en la muestra.",
    "Resultado verificado por repetición.",
    "Se sugiere correlacionar con la clínica del paciente.",
    "Se solicita nueva muestra para confirmar resultado."
  ];

  // Cuando se abre el modal, cargamos el texto actual y las plantillas guardadas en el navegador
  useEffect(() => {
    if (isOpen) {
      setTexto(valorActual || "");
      const guardadas = localStorage.getItem("tridlab_plantillas_obs");
      if (guardadas) {
        setPlantillasPersonalizadas(JSON.parse(guardadas));
      }
    }
  }, [isOpen, valorActual]);

  // Función para agregar la plantilla al texto actual
  const agregarPlantilla = (frase) => {
    setTexto((prev) => {
      const textoLimpio = prev.trim();
      return textoLimpio ? `${textoLimpio} ${frase}` : frase;
    });
  };

  // Función para guardar el texto actual como una nueva plantilla
  const guardarNuevaPlantilla = () => {
    const nuevoTexto = texto.trim();
    if (!nuevoTexto) return;
    
    // Evitar que guarden duplicados
    if (observacionesFrecuentes.includes(nuevoTexto) || plantillasPersonalizadas.includes(nuevoTexto)) {
      alert("Esta plantilla ya existe en la lista.");
      return;
    }

    const nuevas = [...plantillasPersonalizadas, nuevoTexto];
    setPlantillasPersonalizadas(nuevas);
    localStorage.setItem("tridlab_plantillas_obs", JSON.stringify(nuevas));
  };

  // Función para borrar una plantilla personalizada
  const eliminarPlantilla = (fraseParaBorrar, e) => {
    e.stopPropagation(); // Evita que al darle a la 'x' se agregue el texto
    if (window.confirm("¿Seguro que deseas eliminar esta plantilla personalizada?")) {
      const nuevas = plantillasPersonalizadas.filter(p => p !== fraseParaBorrar);
      setPlantillasPersonalizadas(nuevas);
      localStorage.setItem("tridlab_plantillas_obs", JSON.stringify(nuevas));
    }
  };

  const handleGuardar = () => {
    onSave(texto);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#fff", width: "550px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Cabecera */}
        <div style={{ background: "#0f172a", color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px" }}>💬 Observación para: {analitoNombre}</h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "18px", cursor: "pointer", fontWeight: "bold" }}>✕</button>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: "16px", background: "#f8fafc" }}>
          
          {/* Área de texto libre */}
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", color: "#475569", fontSize: "12px" }}>
            Detalle de la observación:
          </label>
          <textarea 
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            style={{ width: "100%", height: "80px", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }}
            placeholder="Escriba una observación o seleccione una rápida abajo..."
            autoFocus
          />

          {/* Botón para guardar personalizada */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <button 
              onClick={guardarNuevaPlantilla}
              disabled={!texto.trim()}
              style={{ background: texto.trim() ? "#fef3c7" : "#f1f5f9", color: texto.trim() ? "#b45309" : "#94a3b8", border: "1px solid", borderColor: texto.trim() ? "#fde68a" : "#e2e8f0", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", cursor: texto.trim() ? "pointer" : "not-allowed", fontWeight: "bold", transition: "all 0.2s" }}
            >
              ⭐ Guardar este texto como rápida
            </button>
          </div>

          {/* Plantillas rápidas */}
          <div style={{ marginTop: "12px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>
              ⚡ Textos Rápidos (Clic para añadir)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
              
              {/* Renderizamos las personalizadas primero (destacadas en verde) */}
              {plantillasPersonalizadas.map((frase, index) => (
                <div 
                  key={`custom-${index}`} 
                  onClick={() => agregarPlantilla(frase)}
                  style={{ background: "#dcfce7", color: "#16a34a", padding: "6px 10px", borderRadius: "15px", fontSize: "11px", cursor: "pointer", border: "1px solid #bbf7d0", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "6px" }}
                  title="Plantilla Personalizada"
                >
                  {frase}
                  <button 
                    onClick={(e) => eliminarPlantilla(frase, e)}
                    style={{ background: "transparent", border: "none", color: "#ef4444", fontWeight: "bold", cursor: "pointer", padding: "0 2px", fontSize: "12px" }}
                    title="Eliminar plantilla"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Renderizamos las del sistema (azules) */}
              {observacionesFrecuentes.map((frase, index) => (
                <div 
                  key={`sys-${index}`} 
                  onClick={() => agregarPlantilla(frase)}
                  style={{ background: "#e0f2fe", color: "#0369a1", padding: "6px 10px", borderRadius: "15px", fontSize: "11px", cursor: "pointer", border: "1px solid #bae6fd", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#bae6fd"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#e0f2fe"}
                >
                  {frase}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pie de botones */}
        <div style={{ background: "#e2e8f0", padding: "10px 16px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} style={{ background: "#fff", border: "1px solid #94a3b8", padding: "6px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", color: "#475569" }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} style={{ background: "#2563eb", border: "1px solid #1d4ed8", padding: "6px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", color: "#fff" }}>
            💾 Guardar Observación
          </button>
        </div>

      </div>
    </div>
  );
}