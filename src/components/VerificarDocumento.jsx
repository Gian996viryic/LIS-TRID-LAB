import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Toaster, toast } from "react-hot-toast";

export default function VerificarDocumento() {
  const [orden, setOrden] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorValidacion, setErrorValidacion] = useState(false);

  const [editando, setEditando] = useState(false);
  const [datosEditables, setDatosEditables] = useState({
    paciente_nombre: "",
    paciente_telefono: ""
  });

  useEffect(() => {
    validarToken();
  }, []);

  async function validarToken() {
    setCargando(true);
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("token") || queryParams.get("t");

    if (!token) {
      console.error("No se detectó ningún token en la URL.");
      setErrorValidacion(true);
      setCargando(false);
      return;
    }

    console.log("Iniciando validación con Token/Código:", token);

    try {
      let ordenEncontrada = null;

      // INTENTO 1: Buscar como texto exacto
      console.log("Intentando buscar en lab_ordenes por codigo_orden (como texto)...");
      const { data: porCodigoTexto, error: errTexto } = await supabase
        .from("lab_ordenes")
        .select("id, codigo_orden, paciente_nombre, paciente_telefono, procedencia, created_at")
        .eq("codigo_orden", token)
        .maybeSingle();

      if (errTexto) console.error("Error de Supabase (Búsqueda Texto):", errTexto);

      if (porCodigoTexto) {
        console.log("¡Orden encontrada como texto!", porCodigoTexto);
        ordenEncontrada = porCodigoTexto;
      } else {
        // INTENTO 2: Buscar como número (Por si la columna es Integer/BigInt)
        const tokenNum = Number(token);
        if (!isNaN(tokenNum)) {
          console.log("Intentando buscar en lab_ordenes por codigo_orden (como número)...");
          const { data: porCodigoNum, error: errNum } = await supabase
            .from("lab_ordenes")
            .select("id, codigo_orden, paciente_nombre, paciente_telefono, procedencia, created_at")
            .eq("codigo_orden", tokenNum)
            .maybeSingle();

          if (errNum) console.error("Error de Supabase (Búsqueda Número):", errNum);
          
          if (porCodigoNum) {
            console.log("¡Orden encontrada como número!", porCodigoNum);
            ordenEncontrada = porCodigoNum;
          }
        }
      }

      // INTENTO 3: Buscar por token de cotización encriptado (Compatibilidad)
      if (!ordenEncontrada) {
        console.log("Intentando buscar en cotizaciones por verify_token...");
        const { data: cotizacion, error: errCot } = await supabase
          .from("cotizaciones")
          .select("id")
          .eq("verify_token", token)
          .maybeSingle();

        if (errCot) console.error("Error de Supabase (Búsqueda Cotización):", errCot);

        if (cotizacion) {
          console.log("Cotización encontrada, buscando orden asociada...");
          const { data: porCotizacion, error: errCotOrd } = await supabase
            .from("lab_ordenes")
            .select("id, codigo_orden, paciente_nombre, paciente_telefono, procedencia, created_at")
            .eq("cotizacion_id", cotizacion.id)
            .maybeSingle();
            
          if (errCotOrd) console.error("Error buscando orden asociada:", errCotOrd);
          if (porCotizacion) {
            console.log("¡Orden encontrada por cotización!", porCotizacion);
            ordenEncontrada = porCotizacion;
          }
        }
      }

      if (ordenEncontrada) {
        setOrden(ordenEncontrada);
        setDatosEditables({
          paciente_nombre: ordenEncontrada.paciente_nombre || "",
          paciente_telefono: ordenEncontrada.paciente_telefono || ""
        });

        console.log("Extrayendo resultados para la orden ID:", ordenEncontrada.id);
        const { data: resultadosData, error: errRes } = await supabase
          .from("lab_orden_resultados")
          .select("nombre_analito, resultado_numero, resultado_texto, unidad, validado, estado_validacion")
          .eq("orden_id", ordenEncontrada.id);

        if (errRes) console.error("Error extrayendo resultados:", errRes);

        if (resultadosData) {
          const validados = resultadosData.filter(r => 
            r.validado === true || String(r.estado_validacion || "").toLowerCase().trim() === 'validado'
          );
          setResultados(validados);
        }

      } else {
        console.error("La orden no se encontró en ninguna de las tablas con los permisos actuales.");
        setErrorValidacion(true);
      }
    } catch (e) {
      console.error("Error crítico (Crash) durante la validación:", e);
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
          paciente_telefono: datosEditables.paciente_telefono
        })
        .eq("id", orden.id);

      if (error) throw error;

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
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "10px" }}>Este documento podría haber sido alterado o no pertenece a nuestra base de datos oficial.</p>
        <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "10px", fontStyle: "italic" }}>(Revisa la consola [F12] para ver el error técnico detallado)</p>
      </div>
    );
  }

  const procedenciaStr = String(orden.procedencia || "").toUpperCase().trim();
  const esAmbulatorio = (procedenciaStr === "AMBULATORIO" || procedenciaStr === "PARTICULAR");
  const urlDestino = esAmbulatorio ? "/resultados" : "/convenios";
  const textoBotonDestino = esAmbulatorio ? "Portal de Pacientes" : "Portal Institucional";

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <Toaster />
      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #16a34a", padding: "15px", borderRadius: "8px", marginBottom: "20px", textAlign: "center" }}>
        <h2 style={{ color: "#16a34a", margin: 0 }}>✅ Documento Auténtico</h2>
        <p style={{ margin: "5px 0 0 0", color: "#15803d" }}>Esta orden está registrada oficialmente en la base de datos de TRIDLAB.</p>
      </div>

      <h3 style={{ borderBottom: "2px solid #e5e7eb", paddingBottom: "10px", color: "#1e293b", margin: "0 0 15px 0" }}>
        Orden: <span style={{ color: "#0284c7" }}>{orden.codigo_orden}</span>
      </h3>
      
      {editando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: 0, color: "#334155" }}>Actualizar Datos de Contacto</h4>
          
          <div>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>Nombre Completo:</label>
            <input 
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "5px", boxSizing: "border-box" }}
              value={datosEditables.paciente_nombre} 
              onChange={(e) => setDatosEditables({...datosEditables, paciente_nombre: e.target.value})} 
            />
          </div>
          
          <div>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>WhatsApp:</label>
            <input 
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "5px", boxSizing: "border-box" }}
              value={datosEditables.paciente_telefono} 
              onChange={(e) => setDatosEditables({...datosEditables, paciente_telefono: e.target.value})} 
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setEditando(false)} style={{ flex: 1, padding: "12px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", color: "#475569" }}>Cancelar</button>
            <button onClick={guardarCambios} style={{ flex: 1, padding: "12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Guardar Cambios</button>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 10px 0" }}><strong style={{ color: "#475569" }}>Nombre:</strong><br/> <span style={{ fontSize: "16px", fontWeight: "bold" }}>{orden.paciente_nombre}</span></p>
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "15px" }}>
            <p style={{ margin: 0 }}><strong style={{ color: "#475569" }}>Teléfono:</strong><br/> {orden.paciente_telefono || "No registrado"}</p>
          </div>
          <button onClick={() => setEditando(true)} style={{ width: "100%", padding: "10px", backgroundColor: "transparent", color: "#0284c7", border: "1px solid #0284c7", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", marginTop: "10px" }}>Editar mis datos de contacto</button>
        </div>
      )}

      <div style={{ marginTop: "25px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "12px 15px", color: "white", fontWeight: "bold", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Resultados Registrados</span>
          <span style={{ fontSize: "11px", backgroundColor: "#334155", padding: "2px 8px", borderRadius: "10px" }}>Inalterables</span>
        </div>
        
        {resultados.length > 0 ? (
          <div style={{ backgroundColor: "white" }}>
            <table style={{ width: "100%", fontSize: "13px", textAlign: "left", borderCollapse: "collapse" }}>
              <tbody>
                {resultados.map((res, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 15px", color: "#475569" }}>{res.nombre_analito}</td>
                    <td style={{ padding: "10px 15px", fontWeight: "bold", color: "#0f172a", textAlign: "right" }}>
                      {res.resultado_numero !== null ? res.resultado_numero : res.resultado_texto} {res.unidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", backgroundColor: "white", color: "#64748b", fontSize: "14px" }}>
            <p>Los resultados de esta orden aún se encuentran en proceso o no han sido validados por el responsable del laboratorio.</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: "30px", textAlign: "center", borderTop: "2px dashed #e2e8f0", paddingTop: "20px" }}>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", fontWeight: "bold" }}>
          ¿Desea gestionar su historial clínico completo?
        </p>
        <button 
          onClick={() => window.location.href = urlDestino}
          style={{ width: "100%", padding: "16px", backgroundColor: "#0284c7", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 10px rgba(2, 132, 199, 0.4)", transition: "all 0.2s" }}
        >
          Iniciar Sesión en {textoBotonDestino}
        </button>
      </div>
    </div>
  );
}