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

        // 4. Extraer Resultados Generales (USAMOS SELECT * PARA EVITAR ERRORES DE COLUMNAS INEXISTENTES)
        const { data: resultadosData, error: errRes } = await supabase
          .from("lab_orden_resultados")
          .select("*") 
          .eq("orden_id", ordenEncontrada.id);

        if (errRes) console.error("Error técnico al cargar resultados generales:", errRes);

        if (resultadosData && resultadosData.length > 0) {
          // Filtramos usando múltiples condiciones por seguridad
          // AHORA EL FILTRO EXIGE QUE TENGA UN VALOR REAL Y ESTÉ VALIDADO
          const resVal = resultadosData.filter(r => {
            // 1. Verificamos que no esté vacío
            const tieneValor = (r.resultado_numero !== null && r.resultado_numero !== undefined) || 
                               (r.resultado_texto !== null && r.resultado_texto.trim() !== "");
            
            // 2. Verificamos que esté validado
            const estaValidado = r.validado === true || 
                                 String(r.estado_validacion || "").toLowerCase().trim() === 'validado' ||
                                 String(r.estado || "").toLowerCase().trim() === 'validado' ||
                                 r.validado_por !== null; // Si tiene la firma de alguien, está validado
                                 
            return tieneValor && estaValidado;
          });
          
          const mapeados = resVal.map(r => ({
             nombre: r.nombre_analito || r.nombre_examen || "Examen",
             valor: r.resultado_numero !== null && r.resultado_numero !== undefined ? r.resultado_numero : (r.resultado_texto || ""),
             unidad: r.unidad || ""
          }));
          listaValidados = [...listaValidados, ...mapeados];
        }

        // 5. Extraer Resultados de Microbiología (Cultivos)
        const { data: cultivosData, error: errCult } = await supabase
          .from("lab_cultivos_resultados")
          .select("*")
          .eq("orden_id", ordenEncontrada.id);

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
        <h3 style={{ color: "#dc2626" }}>❌ Error: Documento no encontrado.</h3>
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "10px" }}>Este documento podría haber sido alterado o no pertenece a nuestra base de datos oficial.</p>
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
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      
      {/* CUADRO DE ÉXITO */}
      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #16a34a", padding: "15px", borderRadius: "8px", marginBottom: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#16a34a", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Documento Auténtico
        </h2>
        <p style={{ margin: "5px 0 0 0", color: "#15803d", fontSize: "14px" }}>Esta orden está registrada oficialmente en la base de datos de TRIDLAB.</p>
      </div>

      <h3 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "10px", color: "#1e293b", margin: "0 0 15px 0" }}>
        Orden: <span style={{ color: "#0284c7" }}>{orden.codigo_orden}</span>
      </h3>
      
      {/* DATOS DEL PACIENTE (SOLO LECTURA) */}
      <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
          <div>
            <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Paciente</p>
            <p style={{ margin: 0, color: "#0f172a", fontSize: "16px", fontWeight: "bold" }}>{orden.paciente_nombre}</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Identificación</p>
              <p style={{ margin: 0, color: "#334155", fontSize: "14px", fontWeight: "bold" }}>{orden.paciente_cedula || "No registrada"}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Teléfono</p>
              <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>{orden.paciente_telefono || "No registrado"}</p>
            </div>
          </div>

          <div>
            <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Fecha de Registro</p>
            <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>{fechaGeneracion}</p>
          </div>
        </div>
      </div>

      {/* RESULTADOS REALES DEL SISTEMA PARA EVITAR FRAUDES */}
      <div style={{ marginTop: "25px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "12px 15px", color: "white", fontWeight: "bold", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Resultados Validados</span>
          <span style={{ fontSize: "11px", backgroundColor: "#334155", padding: "3px 8px", borderRadius: "10px", border: "1px solid #475569" }}>Inalterables</span>
        </div>
        
        {resultados.length > 0 ? (
          <div style={{ backgroundColor: "white" }}>
            <table style={{ width: "100%", fontSize: "13px", textAlign: "left", borderCollapse: "collapse" }}>
              <tbody>
                {resultados.map((res, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 15px", color: "#475569" }}>{res.nombre}</td>
                    <td style={{ padding: "12px 15px", fontWeight: "bold", color: "#0f172a", textAlign: "right" }}>
                      {res.valor} <span style={{ color: "#64748b", fontWeight: "normal" }}>{res.unidad}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "25px 20px", textAlign: "center", backgroundColor: "white", color: "#64748b", fontSize: "14px" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: "10px", display: "block", margin: "0 auto" }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <p style={{ margin: 0, marginTop: "10px" }}>Los resultados de esta orden aún se encuentran en proceso o no han sido validados por el responsable del laboratorio.</p>
          </div>
        )}
      </div>

      {/* BOTÓN MAGISTRAL DE REDIRECCIÓN A LOS PORTALES */}
      <div style={{ marginTop: "30px", textAlign: "center", borderTop: "2px dashed #e2e8f0", paddingTop: "25px" }}>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "15px", fontWeight: "bold" }}>
          ¿Desea descargar el reporte completo en PDF?
        </p>
        <button 
          onClick={() => window.location.href = urlDestino}
          style={{ width: "100%", padding: "16px", backgroundColor: "#0284c7", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 10px rgba(2, 132, 199, 0.3)", transition: "all 0.2s" }}
        >
          Iniciar Sesión en {textoBotonDestino}
        </button>
      </div>

    </div>
  );
}