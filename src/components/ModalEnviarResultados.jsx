import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";

export default function ModalEnviarResultados({ isOpen, onClose, orden, resultados, onActualizarOrden }) {
  const [loading, setLoading] = useState(true);
  const [contacto, setContacto] = useState({ telefono: "", correo: "", nombreDestino: "", tipo: "" });

  useEffect(() => {
    if (isOpen && orden) {
      cargarDatosDestinatario();
    }
  }, [isOpen, orden]);

  async function cargarDatosDestinatario() {
    setLoading(true);
    try {
      if (!orden.procedencia || orden.procedencia.toUpperCase() === "AMBULATORIO") {
        // --- ES PACIENTE PARTICULAR ---
        const { data, error } = await supabase
          .from("lab_pacientes")
          .select("telefono, correo, nombre")
          .eq("cedula", orden.paciente_cedula)
          .maybeSingle();

        if (data) {
          setContacto({ telefono: data.telefono || "", correo: data.correo || "", nombreDestino: data.nombre, tipo: "PACIENTE" });
        }
      } else {
        // --- ES CONVENIO ---
        const { data, error } = await supabase
          .from("lab_convenios")
          .select("telefono, correo, nombre")
          .ilike("nombre", `%${orden.procedencia.trim()}%`)
          .maybeSingle();

        if (data) {
          setContacto({ telefono: data.telefono || "", correo: data.correo || "", nombreDestino: data.nombre, tipo: "CONVENIO" });
        } else {
          toast.error(`No se encontró el convenio "${orden.procedencia}" en la base de datos.`);
          setContacto({ telefono: "", correo: "", nombreDestino: orden.procedencia, tipo: "CONVENIO (No encontrado)" });
        }
      }
    } catch (error) {
      toast.error("Error al obtener datos de contacto.");
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DE ENVÍO ---
  const validados = resultados.filter(r => r.local_validado || r.validado);
  const esParcial = validados.length < resultados.length;
  const tipoReporte = esParcial ? "PARCIALES" : "COMPLETOS";

  // Generador del mensaje
  const generarCuerpoMensaje = () => {
    return `🔬 *LABORATORIO CLÍNICO TRIDLAB*\n\nHola *${contacto.nombreDestino}*,\nLe informamos que los resultados *${tipoReporte}* del paciente *${orden.paciente_nombre}* ya están listos para ser visualizados.\n\n📄 *Nº de Orden:* ${orden.codigo_orden}\n\nIngresa a nuestro portal web oficial para descargar el PDF:\n👉 https://cotizador-trid.vercel.app\n\n_¡Gracias por confiar en nosotros!_`;
  };

  async function registrarEnvio(campo) {
    try {
      const { error } = await supabase.from("lab_ordenes").update({ [campo]: true }).eq("id", orden.id);
      if (!error) {
        onActualizarOrden({ ...orden, [campo]: true });
      }
    } catch (e) { console.error("Error al registrar envío", e); }
  }

  function handleEnviarWhatsApp() {
    if (!contacto.telefono) return toast.error("No hay número de WhatsApp registrado.");
    let numFormateado = contacto.telefono.replace(/\D/g, "");
    if (numFormateado.startsWith("0")) numFormateado = "593" + numFormateado.substring(1);

    const mensaje = generarCuerpoMensaje();
    window.open(`https://wa.me/${numFormateado}?text=${encodeURIComponent(mensaje)}`, "_blank");
    
    registrarEnvio("notificado_ws");
    toast.success("Redirigiendo a WhatsApp...");
  }

  function handleEnviarCorreo() {
    if (!contacto.correo) return toast.error("No hay correo registrado.");
    const asunto = `Resultados ${tipoReporte} - Orden ${orden.codigo_orden} - TRIDLAB`;
    
    // Convertimos los asteriscos de negrita a texto plano para el correo
    let cuerpoCorreo = generarCuerpoMensaje().replace(/\*/g, ""); 
    
    window.location.href = `mailto:${contacto.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoCorreo)}`;
    
    registrarEnvio("notificado_email");
    toast.success("Abriendo cliente de correo...");
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: "12px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        
        <div style={{ backgroundColor: "#0284c7", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#fff", fontSize: "16px" }}>📤 Enviar Resultados</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>✕</button>
        </div>

        <div style={{ padding: "20px" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#64748b" }}>Buscando destinatario...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              
              {/* ALERTA DE PROCEDENCIA */}
              <div style={{ backgroundColor: contacto.tipo === "PACIENTE" ? "#f0fdf4" : "#fef3c7", padding: "10px", borderRadius: "8px", border: `1px solid ${contacto.tipo === "PACIENTE" ? "#bbf7d0" : "#fde68a"}` }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: contacto.tipo === "PACIENTE" ? "#16a34a" : "#d97706", textTransform: "uppercase" }}>
                  MODO DE ENVÍO: {contacto.tipo}
                </span>
                <div style={{ fontWeight: "900", color: "#0f172a", marginTop: "4px" }}>{contacto.nombreDestino}</div>
              </div>

              {/* CAMPOS EDITABLES POR SI ACASO */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "4px", display: "block" }}>WhatsApp de Destino:</label>
                <input 
                  type="text" 
                  value={contacto.telefono} 
                  onChange={e => setContacto({...contacto, telefono: e.target.value})} 
                  placeholder="Ej: 0991234567"
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "4px", display: "block" }}>Correo de Destino:</label>
                <input 
                  type="email" 
                  value={contacto.correo} 
                  onChange={e => setContacto({...contacto, correo: e.target.value})} 
                  placeholder="ejemplo@correo.com"
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                />
              </div>

              {/* RESUMEN DE PRUEBAS */}
              <div style={{ fontSize: "12px", color: "#475569", textAlign: "center", margin: "10px 0" }}>
                Se enviará notificación de <strong>{validados.length}</strong> pruebas validadas ({tipoReporte}).
              </div>

              {/* BOTONES DE ENVÍO Y ESTADO */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={handleEnviarWhatsApp} style={{ flex: 1, padding: "12px", backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <span>📲 WhatsApp</span>
                    {orden.notificado_ws && <span style={{ fontSize: "9px", backgroundColor: "#fff", color: "#16a34a", padding: "2px 6px", borderRadius: "10px" }}>✓ Ya enviado</span>}
                  </button>
                  
                  <button onClick={handleEnviarCorreo} style={{ flex: 1, padding: "12px", backgroundColor: "#ea4335", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <span>✉️ Correo</span>
                    {orden.notificado_email && <span style={{ fontSize: "9px", backgroundColor: "#fff", color: "#dc2626", padding: "2px 6px", borderRadius: "10px" }}>✓ Ya enviado</span>}
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}