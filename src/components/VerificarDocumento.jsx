import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Toaster, toast } from "react-hot-toast";

export default function VerificarDocumento() {
  const [orden, setOrden] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorValidacion, setErrorValidacion] = useState(false);

  // Estados para la edición por parte del paciente
  const [editando, setEditando] = useState(false);
  const [datosEditables, setDatosEditables] = useState({
    paciente_nombre: "",
    paciente_telefono: "",
    paciente_email: ""
  });

  useEffect(() => {
    validarToken();
  }, []);

  async function validarToken() {
    setCargando(true);
    const queryParams = new URLSearchParams(window.location.search);
    // Leemos el token de la URL (puede venir como 'token' o 't' dependiendo de tu código QR)
    const token = queryParams.get("token") || queryParams.get("t");

    if (!token) {
      setErrorValidacion(true);
      setCargando(false);
      return;
    }

    try {
      // 1. Buscar la cotización por token
      const { data: cotizacion } = await supabase
        .from("cotizaciones")
        .select("id")
        .eq("verify_token", token)
        .single();

      if (cotizacion) {
        // 2. Buscar la orden asociada en el LIS
        const { data } = await supabase
          .from("lab_ordenes")
          .select("id, codigo_orden, paciente_nombre, paciente_telefono, paciente_email, procedencia, created_at")
          .eq("cotizacion_id", cotizacion.id)
          .single();

        if (data) {
          setOrden(data);
          setDatosEditables({
            paciente_nombre: data.paciente_nombre || "",
            paciente_telefono: data.paciente_telefono || "",
            paciente_email: data.paciente_email || ""
          });
        } else {
           setErrorValidacion(true);
        }
      } else {
        setErrorValidacion(true);
      }
    } catch (e) {
      console.error(e);
      setErrorValidacion(true);
    } finally {
      setCargando(false);
    }
  }

  async function guardarCambios() {
    const loadingToast = toast.loading("Actualizando sus datos...");
    try {
      const { error } = await supabase
        .from("lab_ordenes")
        .update({
          paciente_nombre: datosEditables.paciente_nombre,
          paciente_telefono: datosEditables.paciente_telefono,
          paciente_email: datosEditables.paciente_email
        })
        .eq("id", orden.id);

      if (error) throw error;

      // Actualizar estado local tras éxito
      setOrden({ ...orden, ...datosEditables });
      setEditando(false);
      toast.dismiss(loadingToast);
      toast.success("¡Información actualizada correctamente!");
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error("Error al actualizar la base de datos.");
      console.error(e);
    }
  }

  if (cargando) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h3 style={{ color: "#475569" }}>⏳ Verificando documento...</h3>
      </div>
    );
  }

  if (errorValidacion) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h3 style={{ color: "#dc2626" }}>❌ Error: Documento no encontrado o código QR inválido.</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <Toaster />
      
      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #16a34a", padding: "15px", borderRadius: "8px", marginBottom: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#16a34a", margin: 0 }}>✅ Documento Auténtico</h2>
        <p style={{ margin: "5px 0 0 0", color: "#15803d" }}>Esta orden está registrada oficialmente en la base de datos de TRIDLAB.</p>
      </div>

      <h3 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "10px", color: "#1e293b" }}>Orden: {orden.codigo_orden}</h3>
      
      {editando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: 0, color: "#334155" }}>Actualizar Datos de Contacto</h4>
          
          <div>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>Nombre Completo:</label>
            <input 
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "5px", boxSizing: "border-box" }}
              value={datosEditables.paciente_nombre} 
              onChange={(e) => setDatosEditables({...datosEditables, paciente_nombre: e.target.value})} 
              placeholder="Nombre completo" 
            />
          </div>
          
          <div>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>WhatsApp:</label>
            <input 
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "5px", boxSizing: "border-box" }}
              value={datosEditables.paciente_telefono} 
              onChange={(e) => setDatosEditables({...datosEditables, paciente_telefono: e.target.value})} 
              placeholder="Ej: 0991234567" 
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>Correo Electrónico:</label>
            <input 
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "5px", boxSizing: "border-box" }}
              value={datosEditables.paciente_email} 
              onChange={(e) => setDatosEditables({...datosEditables, paciente_email: e.target.value})} 
              placeholder="correo@ejemplo.com" 
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setEditando(false)} style={{ flex: 1, padding: "12px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", color: "#475569" }}>
              Cancelar
            </button>
            <button onClick={guardarCambios} style={{ flex: 1, padding: "12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              Guardar Cambios
            </button>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 10px 0" }}><strong style={{ color: "#475569" }}>Nombre:</strong><br/> <span style={{ fontSize: "16px", fontWeight: "bold" }}>{orden.paciente_nombre}</span></p>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
            <p style={{ margin: 0 }}><strong style={{ color: "#475569" }}>Teléfono:</strong><br/> {orden.paciente_telefono || "No registrado"}</p>
            <p style={{ margin: 0, textAlign: "right" }}><strong style={{ color: "#475569" }}>Correo:</strong><br/> {orden.paciente_email || "No registrado"}</p>
          </div>
          
          <button 
            onClick={() => setEditando(true)} 
            style={{ width: "100%", padding: "14px", backgroundColor: "#0284c7", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", marginTop: "10px" }}
          >
            Actualizar mis datos de contacto
          </button>
        </div>
      )}
    </div>
  );
}