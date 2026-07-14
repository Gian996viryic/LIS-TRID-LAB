import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function VerificarDocumento() {
  const [orden, setOrden] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorValidacion, setErrorValidacion] = useState(false);

  useEffect(() => {
    validarToken();
  }, []);

  async function validarToken() {
    setCargando(true);
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("token") || queryParams.get("t");

    if (!token) {
      setErrorValidacion(true);
      setCargando(false);
      return;
    }

    try {
      let ordenEncontrada = null;

      // 1. Buscar en lab_ordenes (Como número)
      const tokenNum = Number(token);
      if (!isNaN(tokenNum)) {
        const { data: porCodigoNum } = await supabase
          .from("lab_ordenes")
          .select("id, codigo_orden, paciente_nombre, paciente_cedula, paciente_telefono, procedencia, created_at")
          .eq("codigo_orden", tokenNum)
          .maybeSingle();
        if (porCodigoNum) ordenEncontrada = porCodigoNum;
      }

      // 2. Buscar en lab_ordenes (Como texto)
      if (!ordenEncontrada) {
        const { data: porCodigoTexto } = await supabase
          .from("lab_ordenes")
          .select("id, codigo_orden, paciente_nombre, paciente_cedula, paciente_telefono, procedencia, created_at")
          .eq("codigo_orden", token)
          .maybeSingle();
        if (porCodigoTexto) ordenEncontrada = porCodigoTexto;
      }

      // 3. Buscar por token de cotización (Compatibilidad)
      if (!ordenEncontrada) {
        const { data: cotizacion } = await supabase.from("cotizaciones").select("id").eq("verify_token", token).maybeSingle();
        if (cotizacion) {
          const { data: porCotizacion } = await supabase
            .from("lab_ordenes")
            .select("id, codigo_orden, paciente_nombre, paciente_cedula, paciente_telefono, procedencia, created_at")
            .eq("cotizacion_id", cotizacion.id)
            .maybeSingle();
          if (porCotizacion) ordenEncontrada = porCotizacion;
        }
      }

      if (ordenEncontrada) {
        setOrden(ordenEncontrada);
        let listaValidados = [];

        // 4. Extraer Resultados Generales CON ORDENAMIENTO LOGICO
        const { data: resultadosData, error: errRes } = await supabase
          .from("lab_orden_resultados")
          .select("*") 
          .eq("orden_id", ordenEncontrada.id)
          .order("id", { ascending: true }); // <--- AQUÍ ESTÁ EL TRUCO PARA EL ORDEN

        if (errRes) console.error("Error técnico al cargar resultados generales:", errRes);

        if (resultadosData && resultadosData.length > 0) {
          const resVal = resultadosData.filter(r => {
            const tieneValor = (r.resultado_numero !== null && r.resultado_numero !== undefined) || 
                               (r.resultado_texto !== null && r.resultado_texto.trim() !== "");
            
            const estaValidado = r.validado === true || 
                                 String(r.estado_validacion || "").toLowerCase().trim() === 'validado' ||
                                 String(r.estado || "").toLowerCase().trim() === 'validado' ||
                                 r.validado_por !== null;
                                 
            return tieneValor && estaValidado;
          });
          
          const mapeados = resVal.map(r => ({
             nombre: r.nombre_analito || r.nombre_examen || "Examen",
             valor: r.resultado_numero !== null && r.resultado_numero !== undefined ? r.resultado_numero : (r.resultado_texto || ""),
             unidad: r.unidad || ""
          }));
          listaValidados = [...listaValidados, ...mapeados];
        }

        // 5. Extraer Resultados de Microbiología (Cultivos) CON ORDENAMIENTO
        const { data: cultivosData, error: errCult } = await supabase
          .from("lab_cultivos_resultados")
          .select("*")
          .eq("orden_id", ordenEncontrada.id)
          .order("id", { ascending: true }); // <--- ORDEN PARA MICROBIOLOGÍA

        if (errCult) console.error("Error técnico al cargar cultivos:", errCult);

        if (cultivosData && cultivosData.length > 0) {
           const cultVal = cultivosData.filter(c => c.validado === true || c.mostrar_en_reporte === true);
           const mapeadosCult = cultVal.map(c => ({
              nombre: c.hemocultivo_indice || c.tipo_muestra || "Cultivo Microbiológico",
              valor: "VER REPORTE EN PDF",
              unidad: ""
           }));
           listaValidados = [...listaValidados, ...mapeadosCult];
        }

        setResultados(listaValidados);

      } else {
        setErrorValidacion(true);
      }
    } catch (e) {
      console.error("Error validando:", e);
      setErrorValidacion(true);
    } finally {
      setCargando(false);
    }
  }

  // PANTALLAS DE CARGA Y ERROR
  if (cargando) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <img src="/logo-tridlab.png" alt="TridLab" style={{ maxHeight: "60px", opacity: 0.5, marginBottom: "15px" }} />
        <h3 style={{ color: "#1F355E" }}>⏳ Verificando autenticidad...</h3>
      </div>
    );
  }

  if (errorValidacion) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif", maxWidth: "500px", margin: "0 auto" }}>
        <img src="/logo-tridlab.png" alt="TridLab" style={{ maxHeight: "70px", marginBottom: "20px" }} />
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #ef4444", padding: "20px", borderRadius: "8px" }}>
          <h3 style={{ color: "#dc2626", margin: "0 0 10px 0" }}>❌ Documento no encontrado</h3>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>Este documento podría haber sido alterado o no pertenece a la base de datos oficial de TridLab.</p>
        </div>
      </div>
    );
  }

  // Formatear Fecha
  const fechaGeneracion = orden?.created_at 
    ? new Date(orden.created_at).toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    : "Fecha no disponible";

  const procedenciaStr = String(orden.procedencia || "").toUpperCase().trim();
  const esAmbulatorio = (procedenciaStr === "AMBULATORIO" || procedenciaStr === "PARTICULAR");
  const urlDestino = esAmbulatorio ? "/resultados" : "/convenios";
  const textoBotonDestino = esAmbulatorio ? "Portal de Pacientes" : "Portal Institucional";

  return (
    <div style={{ padding: "30px 20px", maxWidth: "650px", margin: "0 auto", fontFamily: "sans-serif" }}>
      
      {/* HEADER CORPORATIVO TRIDLAB */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <img src="/logo-tridlab.png" alt="Laboratorio Clínico TridLab" style={{ maxHeight: "80px", objectFit: "contain" }} />
        <h1 style={{ color: "#1F355E", margin: "12px 0 4px 0", fontSize: "20px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Laboratorio Clínico TridLab</h1>
        <p style={{ color: "#0284c7", margin: 0, fontSize: "13px", fontWeight: "bold", fontStyle: "italic" }}>¡Ciencia, Salud y Tecnología a su servicio!</p>
      </div>

      {/* CUADRO DE ÉXITO */}
      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #16a34a", padding: "18px", borderRadius: "8px", marginBottom: "25px", textAlign: "center", boxShadow: "0 2px 10px rgba(22, 163, 74, 0.1)" }}>
        <h2 style={{ color: "#16a34a", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Documento Auténtico
        </h2>
        <p style={{ margin: "8px 0 0 0", color: "#15803d", fontSize: "14px" }}>Esta orden está registrada oficialmente y no ha sido alterada.</p>
      </div>

      <div style={{ borderBottom: "3px solid #0284c7", paddingBottom: "10px", margin: "0 0 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <h3 style={{ color: "#1F355E", margin: 0, fontSize: "18px" }}>
          Orden N°: <span style={{ color: "#0284c7" }}>{orden.codigo_orden}</span>
        </h3>
        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>{orden.procedencia || "AMBULATORIO"}</span>
      </div>
      
      {/* DATOS DEL PACIENTE */}
      <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
          <div>
            <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Paciente</p>
            <p style={{ margin: 0, color: "#1F355E", fontSize: "16px", fontWeight: "bold" }}>{orden.paciente_nombre}</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Identificación</p>
              <p style={{ margin: 0, color: "#334155", fontSize: "14px", fontWeight: "bold" }}>{orden.paciente_cedula || "No registrada"}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Teléfono</p>
              <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>{orden.paciente_telefono || "No registrado"}</p>
            </div>
          </div>

          <div>
            <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>Fecha de Registro</p>
            <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>{fechaGeneracion}</p>
          </div>
        </div>
      </div>

      {/* RESULTADOS INALTERABLES */}
      <div style={{ marginTop: "30px", border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
        <div style={{ backgroundColor: "#1F355E", padding: "15px", color: "white", fontWeight: "bold", fontSize: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Resultados Validados</span>
          <span style={{ fontSize: "11px", backgroundColor: "#0284c7", padding: "4px 10px", borderRadius: "12px", border: "1px solid #38bdf8", letterSpacing: "0.5px" }}>INALTERABLES</span>
        </div>
        
        {resultados.length > 0 ? (
          <div style={{ backgroundColor: "white", maxHeight: "350px", overflowY: "auto" }}>
            <table style={{ width: "100%", fontSize: "13px", textAlign: "left", borderCollapse: "collapse" }}>
              <tbody>
                {resultados.map((res, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ padding: "14px 15px", color: "#334155", fontWeight: "500" }}>{res.nombre}</td>
                    <td style={{ padding: "14px 15px", fontWeight: "bold", color: "#1F355E", textAlign: "right" }}>
                      {res.valor} <span style={{ color: "#64748b", fontWeight: "normal", fontSize: "12px", marginLeft: "4px" }}>{res.unidad}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "35px 20px", textAlign: "center", backgroundColor: "white", color: "#64748b", fontSize: "14px" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: "12px", display: "block", margin: "0 auto" }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <p style={{ margin: 0, color: "#475569" }}>Los resultados de esta orden aún se encuentran en proceso o no han sido validados por el responsable del laboratorio.</p>
          </div>
        )}
      </div>

      {/* BOTÓN DE REDIRECCIÓN */}
      <div style={{ marginTop: "35px", textAlign: "center", borderTop: "2px dashed #cbd5e1", paddingTop: "25px" }}>
        <p style={{ fontSize: "14px", color: "#475569", marginBottom: "15px" }}>
          ¿Desea descargar el reporte oficial en PDF o ver su historial clínico completo?
        </p>
        <button 
          onClick={() => window.location.href = urlDestino}
          style={{ width: "100%", padding: "16px", backgroundColor: "#0284c7", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)", transition: "all 0.2s", textTransform: "uppercase", letterSpacing: "0.5px" }}
          onMouseOver={(e) => e.target.style.backgroundColor = "#1F355E"}
          onMouseOut={(e) => e.target.style.backgroundColor = "#0284c7"}
        >
          Iniciar Sesión en {textoBotonDestino}
        </button>
      </div>

    </div>
  );
}