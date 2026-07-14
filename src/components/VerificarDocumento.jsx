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

        // 4. Extraer Resultados Generales
        const { data: resultadosData, error: errRes } = await supabase
          .from("lab_orden_resultados")
          .select("*") 
          .eq("orden_id", ordenEncontrada.id);

        if (errRes) console.error("Error técnico:", errRes);

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
             unidad: r.unidad || "",
             raw: r // Guardamos datos crudos para el ordenamiento
          }));
          listaValidados = [...listaValidados, ...mapeados];
        }

        // 5. Extraer Resultados de Cultivos (Microbiología)
        const { data: cultivosData } = await supabase
          .from("lab_cultivos_resultados")
          .select("*")
          .eq("orden_id", ordenEncontrada.id);

        if (cultivosData && cultivosData.length > 0) {
           const cultVal = cultivosData.filter(c => c.validado === true || c.mostrar_en_reporte === true);
           const mapeadosCult = cultVal.map(c => ({
              nombre: c.hemocultivo_indice || c.tipo_muestra || "Cultivo Microbiológico",
              valor: "VER REPORTE EN PDF",
              unidad: "",
              raw: { grupo_nombre: "MICROBIOLOGÍA", nombre_examen: "CULTIVO", orden_visual: c.id }
           }));
           listaValidados = [...listaValidados, ...mapeadosCult];
        }

        // --- ALGORITMO DE ORDENAMIENTO (Mapeado de tu código fuente) ---
        listaValidados.sort((a, b) => {
          // 1ro: Ordenar por Área
          const areaA = (a.raw.grupo_nombre || "OTROS").toUpperCase();
          const areaB = (b.raw.grupo_nombre || "OTROS").toUpperCase();
          if (areaA !== areaB) return areaA.localeCompare(areaB);

          // 2do: Ordenar por Examen
          const examA = (a.raw.nombre_examen || "EXAMEN GENERAL").toUpperCase();
          const examB = (b.raw.nombre_examen || "EXAMEN GENERAL").toUpperCase();
          if (examA !== examB) return examA.localeCompare(examB);

          // 3ro: Ordenar por el orden visual del analito
          const visualA = a.raw.orden_visual || 0;
          const visualB = b.raw.orden_visual || 0;
          return visualA - visualB;
        });

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

  // BLINDAJE CONTRA MODO OSCURO AUTOMÁTICO Y PERMISO PARA SCROLL COMPLETO
  const contenedorPrincipalStyle = {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "#ffffff", // Forzamos fondo blanco
    color: "#0f172a", // Forzamos texto oscuro
    padding: "30px 20px",
    fontFamily: "sans-serif",
    boxSizing: "border-box",
    overflowY: "auto", // Permitimos scroll en la página completa
    colorScheme: "light" // Instrucción al navegador para no invertir colores
  };

  if (cargando) {
    return (
      <div style={{ ...contenedorPrincipalStyle, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "60px" }}>
        <img src="/logo-tridlab.png" alt="TridLab" style={{ maxHeight: "60px", opacity: 0.5, marginBottom: "15px" }} />
        <h3 style={{ color: "#1F355E" }}>⏳ Verificando autenticidad...</h3>
      </div>
    );
  }

  if (errorValidacion) {
    return (
      <div style={contenedorPrincipalStyle}>
        <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
          <img src="/logo-tridlab.png" alt="TridLab" style={{ maxHeight: "70px", marginBottom: "20px" }} />
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #ef4444", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ color: "#dc2626", margin: "0 0 10px 0" }}>❌ Documento no encontrado</h3>
            <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>Este documento podría haber sido alterado o no pertenece a la base de datos oficial de TridLab.</p>
          </div>
        </div>
      </div>
    );
  }

  const fechaGeneracion = orden?.created_at ? new Date(orden.created_at).toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Fecha no disponible";
  const procedenciaStr = String(orden.procedencia || "").toUpperCase().trim();
  const esAmbulatorio = (procedenciaStr === "AMBULATORIO" || procedenciaStr === "PARTICULAR");
  const urlDestino = esAmbulatorio ? "/resultados" : "/convenios";
  const textoBotonDestino = esAmbulatorio ? "Portal de Pacientes" : "Portal Institucional";

  // Variables para controlar la renderización de cabeceras de Área y Examen
  let lastAreaName = null;
  let lastExamName = null;

  return (
    <div style={contenedorPrincipalStyle}>
      <div style={{ maxWidth: "650px", margin: "0 auto", backgroundColor: "#ffffff" }}>
        
        {/* HEADER CORPORATIVO */}
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
        <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #cbd5e1", marginBottom: "30px" }}>
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

        {/* RESULTADOS INALTERABLES - AHORA CON CABECERAS Y SIN SCROLL INTERNO */}
        <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", backgroundColor: "#ffffff" }}>
          <div style={{ backgroundColor: "#1F355E", padding: "15px", color: "#ffffff", fontWeight: "bold", fontSize: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Resultados Validados</span>
            <span style={{ fontSize: "11px", backgroundColor: "#0284c7", color: "#ffffff", padding: "4px 10px", borderRadius: "12px", border: "1px solid #38bdf8", letterSpacing: "0.5px" }}>INALTERABLES</span>
          </div>
          
          {resultados.length > 0 ? (
            <table style={{ width: "100%", fontSize: "13px", textAlign: "left", borderCollapse: "collapse", backgroundColor: "#ffffff" }}>
              <tbody>
                {resultados.map((res, i) => {
                  const currentArea = (res.raw.grupo_nombre || "OTROS").toUpperCase();
                  const currentExam = (res.raw.nombre_examen || "EXAMEN GENERAL").toUpperCase();
                  
                  const showAreaHeader = lastAreaName !== currentArea;
                  lastAreaName = currentArea;
                  
                  const showExamHeader = lastExamName !== currentExam;
                  lastExamName = currentExam;

                  return (
                    <React.Fragment key={i}>
                      {/* Cabecera de Área (Oscura) */}
                      {showAreaHeader && (
                        <tr>
                          <td colSpan="2" style={{ backgroundColor: "#0f172a", color: "#ffffff", fontWeight: "900", textAlign: "center", padding: "8px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            🧪 {currentArea}
                          </td>
                        </tr>
                      )}
                      
                      {/* Cabecera de Examen (Celeste claro) */}
                      {showExamHeader && (
                        <tr style={{ backgroundColor: "#e0f2fe", borderTop: "2px solid #bae6fd" }}>
                          <td colSpan="2" style={{ color: "#0284c7", fontWeight: "800", textAlign: "left", padding: "6px 12px", fontSize: "11px", textTransform: "uppercase" }}>
                            📋 {currentExam}
                          </td>
                        </tr>
                      )}

                      {/* Fila del Analito */}
                      <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
                        <td style={{ padding: "12px 15px 12px 25px", color: "#334155", fontWeight: "500" }}>
                          <span style={{ color: "#94a3b8", marginRight: "5px" }}>↳</span> {res.nombre}
                        </td>
                        <td style={{ padding: "12px 15px", fontWeight: "bold", color: "#1F355E", textAlign: "right" }}>
                          {res.valor} <span style={{ color: "#64748b", fontWeight: "normal", fontSize: "12px", marginLeft: "4px" }}>{res.unidad}</span>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "35px 20px", textAlign: "center", backgroundColor: "#ffffff" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: "12px", display: "block", margin: "0 auto" }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <p style={{ margin: 0, color: "#475569" }}>Los resultados de esta orden aún se encuentran en proceso o no han sido validados por el responsable del laboratorio.</p>
            </div>
          )}
        </div>

        {/* BOTÓN DE REDIRECCIÓN */}
        <div style={{ marginTop: "35px", textAlign: "center", borderTop: "2px dashed #cbd5e1", paddingTop: "25px", paddingBottom: "30px" }}>
          <p style={{ fontSize: "14px", color: "#475569", marginBottom: "15px" }}>
            ¿Desea descargar el reporte oficial en PDF o ver su historial clínico completo?
          </p>
          <button 
            onClick={() => window.location.href = urlDestino}
            style={{ width: "100%", padding: "16px", backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)", transition: "all 0.2s", textTransform: "uppercase", letterSpacing: "0.5px" }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#1F355E"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#0284c7"}
          >
            Iniciar Sesión en {textoBotonDestino}
          </button>
        </div>
      </div>
    </div>
  );
}