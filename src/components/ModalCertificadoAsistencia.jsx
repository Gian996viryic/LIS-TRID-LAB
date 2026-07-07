import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";
import { saveAs } from "file-saver";
import { generarPDFCertificadoAsistencia } from "../utils/generadorCertificadoPDF";

export default function ModalCertificadoAsistencia({ orden, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [responsableId, setResponsableId] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function fetchUsuarios() {
      const { data, error } = await supabase
        .from("lab_usuarios")
        .select("id, nombre, registro_senescyt, cargo, firma_path")
        .order("nombre");
      
      if (!error && data) {
        setUsuarios(data);
        if (data.length > 0) setResponsableId(data[0].id);
      }
      setCargando(false);
    }
    fetchUsuarios();
  }, []);

  async function handleGenerar() {
    if (!responsableId) return toast.error("Seleccione un responsable para la firma.");
    
    const responsableSeleccionado = usuarios.find(u => u.id === responsableId);
    
    const datosPaciente = {
      nombre: orden.paciente_nombre,
      cedula: orden.paciente_cedula
    };

    // CORRECCIÓN: Mandamos el dato con su nombre correcto
    const datosResponsable = {
      nombre: responsableSeleccionado.nombre,
      registro_senescyt: responsableSeleccionado.registro_senescyt || "S/N" 
    };

    const toastId = toast.loading("Generando certificado...");
    try {
      const pdfBlob = await generarPDFCertificadoAsistencia(datosPaciente, datosResponsable);
      saveAs(pdfBlob, `Certificado_Asistencia_${orden.paciente_cedula || orden.codigo_orden}.pdf`);
      toast.success("¡Certificado descargado con éxito!", { id: toastId });
      onClose(); 
    } catch (error) {
      toast.error("Error al generar: " + error.message, { id: toastId });
    }
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#f8fafc", border: "1px solid #999", width: "450px", borderRadius: "6px", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        
        <div style={{ background: "#4f46e5", color: "#fff", padding: "10px 16px", fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📄 Emitir Certificado de Asistencia</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>✕</button>
        </div>
        
        <div style={{ padding: "20px" }}>
          
          <div style={{ marginBottom: "15px", padding: "10px", background: "#e0e7ff", border: "1px dashed #6366f1", borderRadius: "4px" }}>
            <span style={{ fontSize: "11px", color: "#4338ca", display: "block", marginBottom: "4px" }}>Paciente Seleccionado:</span>
            <span style={{ fontWeight: "bold", color: "#1e1b4b", display: "block" }}>{orden.paciente_nombre}</span>
            <span style={{ fontSize: "11px", color: "#3730a3" }}>C.I: {orden.paciente_cedula || "N/A"}</span>
          </div>

          <label style={{ fontSize: "11px", color: "#475569", display: "block", marginBottom: "6px", fontWeight: "bold" }}>Responsable que firma el documento:</label>
          {cargando ? (
            <div style={{ fontSize: "12px", color: "#64748b" }}>Cargando usuarios...</div>
          ) : (
            <select 
              className="lis-input" 
              style={{ width: "100%", height: "30px", padding: "2px 8px", border: "1px solid #94a3b8", borderRadius: "4px" }} 
              value={responsableId} 
              onChange={e => setResponsableId(e.target.value)}
            >
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.cargo ? `(${u.cargo})` : ""}
                </option>
              ))}
            </select>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "25px" }}>
            <button 
              type="button" 
              style={{ background: "transparent", border: "1px solid #94a3b8", padding: "6px 16px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", color: "#475569" }} 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              style={{ fontWeight: "bold", border: "none", color: "white", background: "#4f46e5", padding: "6px 20px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", boxShadow: "0 2px 4px rgba(79, 70, 229, 0.3)" }} 
              onClick={handleGenerar}
              disabled={cargando || usuarios.length === 0}
            >
              ✅ Generar y Descargar PDF
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}