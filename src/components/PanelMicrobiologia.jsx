import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import TablaAntibiograma from "./TablaAntibiograma";
import toast from "react-hot-toast";

import { generarVistaPreviaMicrobiologia } from "../utils/impresionMicrobiologia";
import ModalEnviarResultados from "./ModalEnviarResultados"; 

function formatGermen(texto) {
    if (!texto) return "";
    const lower = texto.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function PanelMicrobiologia({ orden, cacheExamenesAreas, resultados, onActualizarOrden }) {
  const [cultivosInfo, setCultivosInfo] = useState([]);
  const [cultivoActivo, setCultivoActivo] = useState(null);
  const [datosCultivo, setDatosCultivo] = useState({});
  const [mapaUsuarios, setMapaUsuarios] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  const [showModalEnvio, setShowModalEnvio] = useState(false); 

  useEffect(() => {
    cargarCultivosBD();
  }, [orden.id]);

  async function cargarCultivosBD() {
    setLoading(true);

    // 🚀 OBTENEMOS EL ID MAESTRO DE LA ORDEN
    const { data: resultadosDB, error: errOrden } = await supabase
      .from("lab_orden_resultados")
      .select("id, examen_id, nombre_examen") 
      .eq("orden_id", orden.id);

    const { data: cultivosGuardados, error: errCultivos } = await supabase
      .from("lab_cultivos_resultados")
      .select("*")
      .eq("orden_id", orden.id);

    if (errOrden || errCultivos) {
      toast.error("Error al cargar la base de datos de cultivos");
      setLoading(false); return;
    }

    const idsUsuarios = [...new Set(
      (cultivosGuardados || []).flatMap(c => [c.editado_por, c.validado_por]).filter(Boolean)
    )];
    
    let mapUsers = {};
    if (idsUsuarios.length > 0) {
        const { data: uData } = await supabase.from('lab_usuarios').select('id, nombre').in('id', idsUsuarios);
        if (uData) uData.forEach(u => mapUsers[u.id] = u.nombre.split(' ')[0] + ' ' + (u.nombre.split(' ')[1] || ''));
    }
    setMapaUsuarios(mapUsers);

    let examenesCultivos = [];
    resultadosDB.forEach(r => {
      const dbConfig = cacheExamenesAreas[r.examen_id] || {};
      if (dbConfig.area_id === "4b9c6b2a-271c-4269-a1be-f805d356a523" || (dbConfig.area_nombre || "").toUpperCase().includes("MICROBIOLOG")) {
        const nombreExamen = r.nombre_examen ? r.nombre_examen.toUpperCase() : "CULTIVO GENERAL";
        if (!examenesCultivos.find(e => e.nombre === nombreExamen)) {
            examenesCultivos.push({ nombre: nombreExamen, row_id: r.id }); // 🚀 GUARDAMOS EL ID MAESTRO
        }
      }
    });

    let tabsCultivos = [];
    examenesCultivos.forEach(ex => {
      const matchCantidad = ex.nombre.match(/X(\d+)/);
      const cantidad = matchCantidad ? parseInt(matchCantidad[1], 10) : 1;
      const nombreLimpio = ex.nombre.replace(/X\d+/, "").trim();

      let tipo = "SECRECION"; 
      let isOtros = false; let isRetrocultivo = false;

      if (nombreLimpio.includes("ORINA") || nombreLimpio.includes("UROCULTIVO")) tipo = "ORINA";
      else if (nombreLimpio.includes("ESPUTO") || nombreLimpio.includes("BRONQUIAL") || nombreLimpio.includes("TRAQUEAL") || nombreLimpio.includes("LBA") || nombreLimpio.includes("LAVADO") || nombreLimpio.includes("FARINGEO")) tipo = "RESPIRATORIO";
      else if (nombreLimpio.includes("HEMOCULTIVO")) tipo = "SANGRE";
      else if (nombreLimpio.includes("RETROCULTIVO")) { tipo = "RETROCULTIVO"; isRetrocultivo = true; } 
      else if (nombreLimpio.includes("OTROS ESPCIFICAR")) { tipo = "OTROS"; isOtros = true; }

      for (let i = 1; i <= cantidad; i++) {
        tabsCultivos.push({ 
            id: `${nombreLimpio}-${i}`, 
            nombre: cantidad > 1 ? `${nombreLimpio} ${i}/${cantidad}` : nombreLimpio, 
            tipo: tipo, 
            isOtros: isOtros, 
            isRetrocultivo: isRetrocultivo,
            row_id: ex.row_id // 🚀 PASAMOS EL ID MAESTRO A LA PESTAÑA
        });
      }
    });

    setCultivosInfo(tabsCultivos);
    if (tabsCultivos.length > 0) setCultivoActivo(tabsCultivos[0].id);

    let initDatos = {};
    tabsCultivos.forEach(t => {
        const isSangre = t.tipo === "SANGRE" || t.tipo === "RETROCULTIVO"; 
        const saved = cultivosGuardados?.find(c => c.hemocultivo_indice === t.nombre);

        initDatos[t.id] = {
            db_id: saved?.id || null, 
            tipo_muestra: t.tipo,
            is_otros: t.isOtros,
            is_retrocultivo: t.isRetrocultivo,
            muestra_especifica: saved?.muestra_especifica || "", 
            
            es_positivo: saved?.es_positivo !== undefined ? saved.es_positivo : !isSangre,
            es_microbiota_habitual: isSangre ? false : (saved?.es_microbiota_habitual || false), 

            aplica_fresco: saved ? !!saved.fresco : !isSangre, 
            aplica_gram: saved ? !!saved.tincion_gram : !isSangre,
            aplica_microscopia: saved ? (!!saved.polimorfonucleares || !!saved.celulas_epiteliales) : !isSangre, 
            aplica_nickerson: saved ? !!saved.nickerson : false,
            aplica_contaje: saved ? !!saved.contaje_ufc : !isSangre,
            aplica_interpretacion: saved ? !!saved.interpretacion_contaje : (t.tipo === "RESPIRATORIO" || t.isOtros),
            
            aplica_mecanismo: saved ? !!saved.mecanismo_resistencia : false,
            mecanismo_resistencia: saved?.mecanismo_resistencia || "",

            fresco: saved?.fresco || "",
            tincion_gram: saved?.tincion_gram || "",
            polimorfonucleares: saved?.polimorfonucleares || "", 
            celulas_epiteliales: saved?.celulas_epiteliales || "", 
            nickerson: saved?.nickerson || "", 
            contaje_ufc: saved?.contaje_ufc || "",
            interpretacion: saved?.interpretacion_contaje || "", 
            germen_aislado: saved?.germen_aislado || "",
            antibiograma: saved?.antibiograma || [],
            
            estado_reporte: saved ? (saved.is_preliminar ? "PRELIMINAR" : "DEFINITIVO") : (isSangre ? "PRELIMINAR" : "DEFINITIVO"),
            reporte_texto: saved?.reporte_preliminar || "", 
            
            validado: saved?.validado || false, 
            historial_previo: saved?.historial_previo || "",

            editado_por: saved?.editado_por || null,
            editado_at: saved?.editado_at || null,
            validado_por: saved?.validado_por || null,
            validado_at: saved?.validado_at || null,
        };
    });
    setDatosCultivo(initDatos);
    setLoading(false);
  }

  function handleCambio(campo, valor) {
      setDatosCultivo(prev => ({ ...prev, [cultivoActivo]: { ...prev[cultivoActivo], [campo]: valor } }));
  }

  async function guardarCultivoBD(tabId, isValidacion = false, nuevoEstadoValidado = false) {
    const data = datosCultivo[tabId];
    const tabInfo = cultivosInfo.find(c => c.id === tabId);

    const isSangre = data.tipo_muestra === "SANGRE" || data.tipo_muestra === "RETROCULTIVO";
    const isDefinitivo = data.estado_reporte === "DEFINITIVO";
    const isPreliminar = data.estado_reporte === "PRELIMINAR";
    
    const isNegativo = data.es_positivo === false && data.es_microbiota_habitual === false;
    const isPositivo = data.es_positivo === true;
    const isMicrobiota = data.es_microbiota_habitual === true;

    const mostrarCajaTexto = isPreliminar || (isDefinitivo && isNegativo);
    const mostrarFiltros = !isSangre || (isSangre && isDefinitivo && isPositivo);
    const mostrarGermenYResistencia = isDefinitivo && (isPositivo || isMicrobiota);
    
    // BLOQUEOS DE VALIDACIÓN
    if (data.is_otros && !data.muestra_especifica?.trim()) return toast.error("Debe especificar el tipo de muestra.");
    
    if (mostrarFiltros) {
        if (data.aplica_fresco && !data.fresco?.trim()) return toast.error("Debe llenar el campo de Examen en Fresco.");
        if (data.aplica_gram && !data.tincion_gram?.trim()) return toast.error("Debe llenar el campo de Tinción de Gram.");
        if (data.aplica_microscopia && (!data.polimorfonucleares?.trim() || !data.celulas_epiteliales?.trim())) return toast.error("Debe llenar los PMN y las Células Epiteliales.");
        if (data.aplica_nickerson && !data.nickerson?.trim()) return toast.error("Debe llenar el campo de Medio Nickerson.");
        if (data.aplica_contaje && !data.contaje_ufc?.trim()) return toast.error("Debe llenar el campo de Contaje (UFC/mL).");
        if (data.aplica_interpretacion && !data.interpretacion?.trim()) return toast.error("Debe llenar la Interpretación del contaje.");
    }

    if (mostrarGermenYResistencia && data.aplica_mecanismo && !data.mecanismo_resistencia?.trim()) {
        return toast.error("Debe especificar el Mecanismo de Resistencia / Vigilancia si activó la opción.");
    }

    if (isValidacion && nuevoEstadoValidado) {
       if (mostrarCajaTexto && !data.reporte_texto?.trim()) {
           return toast.error(`Para validar en estado ${data.estado_reporte}, debe redactar el resultado en el cuadro de texto.`);
       }
       if (isDefinitivo && isPositivo) {
           if (!data.germen_aislado?.trim()) return toast.error("Para validar un reporte definitivo positivo, debe ingresar el Germen Aislado.");
           const germenLower = data.germen_aislado.toLowerCase();
           const sinCrecimiento = germenLower.includes("sin crecimiento") || germenLower.includes("negativo");
           
           if (!sinCrecimiento) {
               if (!data.antibiograma || data.antibiograma.length === 0) return toast.error("Para validar un germen positivo, el antibiograma no puede estar vacío.");
               for (let i = 0; i < data.antibiograma.length; i++) {
                   const anti = data.antibiograma[i];
                   if (!anti.interpretacion || !anti.valor?.trim()) return toast.error(`Falta la interpretación o el valor C.I.M para: ${anti.antibiotico}`);
               }
           }
       }
    }

    const toastId = toast.loading(isValidacion ? "Procesando validación..." : "Guardando cultivo...");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const ahora = new Date().toISOString();

      let finalValidado = data.validado;
      if (isValidacion) finalValidado = nuevoEstadoValidado;
      else finalValidado = false;

      const payload = {
        orden_id: orden.id,
        hemocultivo_indice: tabInfo.nombre,
        tipo_muestra: data.tipo_muestra,
        is_preliminar: data.estado_reporte === "PRELIMINAR",
        reporte_preliminar: data.reporte_texto,
        
        es_positivo: data.es_positivo, 
        es_microbiota_habitual: data.es_microbiota_habitual,
        
        tincion_gram: data.aplica_gram ? data.tincion_gram : null,
        polimorfonucleares: data.aplica_microscopia ? data.polimorfonucleares : null,
        celulas_epiteliales: data.aplica_microscopia ? data.celulas_epiteliales : null,
        contaje_ufc: data.aplica_contaje ? data.contaje_ufc : null,
        interpretacion_contaje: data.aplica_interpretacion ? data.interpretacion : null,
        nickerson: data.aplica_nickerson ? data.nickerson : null,
        
        germen_aislado: data.es_microbiota_habitual ? "Desarrollo de microbiota habitual" : data.germen_aislado,
        mecanismo_resistencia: data.aplica_mecanismo ? data.mecanismo_resistencia : null,

        validado: finalValidado,
        historial_previo: data.historial_previo || null,
        fresco: data.aplica_fresco ? data.fresco : null,
        muestra_especifica: data.is_otros ? data.muestra_especifica : null,
        antibiograma: data.antibiograma,
        grupo_bacteriano: 'N/A', 
        editado_por: user?.id,
        editado_at: ahora,
      };

      if (isValidacion) {
        if (finalValidado) {
            payload.validado_por = user?.id;
            payload.validado_at = ahora;
        } else {
            payload.validado_por = null;
            payload.validado_at = null;
        }
      } else {
        payload.validado_por = null;
        payload.validado_at = null;
      }

      let resData, error;
      if (data.db_id) {
          const resp = await supabase.from("lab_cultivos_resultados").update(payload).eq("id", data.db_id).select().single();
          resData = resp.data; error = resp.error;
      } else {
          const resp = await supabase.from("lab_cultivos_resultados").insert(payload).select().single();
          resData = resp.data; error = resp.error;
      }

      if (error) throw error;

      // 🚀 MOTOR DE SINCRONIZACIÓN CON LA TABLA MAESTRA
      if (tabInfo && tabInfo.row_id) {
          const payloadSync = {
              validado: finalValidado,
              resultado_texto: finalValidado ? ">> VER REPORTE" : null, // <- ACORTADO
          };
          
          if (isValidacion) {
              payloadSync.validado_por = finalValidado ? user?.id : null;
              payloadSync.validado_at = finalValidado ? ahora : null;
          }

          await supabase.from("lab_orden_resultados").update(payloadSync).eq("id", tabInfo.row_id);
          
          // Recalcular estado global de la orden
          const { data: allRes } = await supabase.from("lab_orden_resultados").select("validado").eq("orden_id", orden.id);
          if (allRes) {
              const totalVal = allRes.filter(p => p.validado === true).length;
              const estVal = (totalVal === allRes.length) ? "validado" : (totalVal > 0 ? "parcial" : "pendiente");
              
              await supabase.from("lab_ordenes").update({ estado_validacion: estVal }).eq("id", orden.id);
              
              // Refrescar la interfaz principal
              if (onActualizarOrden) {
                  onActualizarOrden({ ...orden, estado_validacion: estVal });
              }
          }
      }

      setDatosCultivo(prev => ({ 
          ...prev, 
          [tabId]: { 
              ...prev[tabId], 
              db_id: resData.id, 
              validado: finalValidado,
              editado_por: payload.editado_por,
              editado_at: payload.editado_at,
              validado_por: payload.validado_por !== undefined ? payload.validado_por : prev[tabId].validado_por,
              validado_at: payload.validado_at !== undefined ? payload.validado_at : prev[tabId].validado_at
          } 
      }));

      if (user) {
          const { data: userData } = await supabase.from('lab_usuarios').select('nombre').eq('id', user.id).single();
          if (userData) {
              setMapaUsuarios(prev => ({ ...prev, [user.id]: userData.nombre.split(' ')[0] + ' ' + (userData.nombre.split(' ')[1] || '') }));
          }
      }

      let mensajeToast = "Cultivo Guardado Correctamente";
      if (isValidacion) {
          mensajeToast = finalValidado ? "Cultivo Validado Correctamente" : "Validación Removida";
      } else if (data.validado && !finalValidado) {
          mensajeToast = "Guardado. El cultivo fue DESVALIDADO por seguridad.";
      }

      toast.success(mensajeToast, { id: toastId });

    } catch (err) {
      console.error("DB Error: ", err);
      toast.error("Error al guardar en base de datos", { id: toastId });
    }
  }

  async function verHistoricoPaciente() {
    const dataActual = datosCultivo[cultivoActivo];
    const toastId = toast.loading("Buscando histórico...");
    try {
        const { data, error } = await supabase.from("lab_cultivos_resultados").select(`germen_aislado, created_at, lab_ordenes!inner(paciente_cedula)`).eq("lab_ordenes.paciente_cedula", orden.paciente_cedula).eq("tipo_muestra", dataActual.tipo_muestra).order("created_at", { ascending: false }).limit(3);
        if (error) throw error;
        if (data && data.length > 0) {
            const hist = data.filter(d => d.germen_aislado).map(d => `${new Date(d.created_at).toLocaleDateString()}: ${d.germen_aislado}`).join("\n");
            toast.success(`Histórico encontrado:\n${hist || "Sin gérmenes previos"}`, { id: toastId, duration: 6000 });
            handleCambio("historial_previo", hist);
        } else {
            toast("No hay cultivos previos para el paciente.", { id: toastId, icon: "ℹ️" });
        }
    } catch (err) { toast.error("Error al buscar histórico", { id: toastId }); }
  }

  async function abrirVistaPrevia() {
      const data = datosCultivo[cultivoActivo];
      const tabInfo = cultivosInfo.find(c => c.id === cultivoActivo);
      await generarVistaPreviaMicrobiologia({ orden, data, tabNombre: tabInfo.nombre });
  }

  if (loading) return <div style={{ padding: "20px" }}>Cargando datos desde la Base de Datos...</div>;
  if (cultivosInfo.length === 0) return <div style={{ padding: "20px" }}>No hay cultivos en esta orden.</div>;

  const data = datosCultivo[cultivoActivo];
  const tabInfo = cultivosInfo.find(c => c.id === cultivoActivo);
  if (!data || !tabInfo) return null;

  const isSangre = data.tipo_muestra === "SANGRE" || data.tipo_muestra === "RETROCULTIVO"; 
  const isDefinitivo = data.estado_reporte === "DEFINITIVO";
  const isPreliminar = data.estado_reporte === "PRELIMINAR";
  
  const isNegativo = data.es_positivo === false && data.es_microbiota_habitual === false;
  const isMicrobiota = data.es_microbiota_habitual === true;
  const isPositivo = data.es_positivo === true;

  const mostrarCajaTexto = isPreliminar || (isDefinitivo && isNegativo);
  const mostrarFiltros = !isSangre || (isSangre && isDefinitivo && isPositivo);
  const mostrarGermenYResistencia = isDefinitivo && (isPositivo || isMicrobiota);
  const mostrarAntibiograma = isDefinitivo && isPositivo;
  
  const algunValidado = Object.values(datosCultivo).some(d => d.validado);
  const isGuardado = !!data.db_id; 

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden", borderTop: "1px solid #cbd5e1" }}>
      <style>{`
        .tabs-container::-webkit-scrollbar { height: 6px; }
        .tabs-container::-webkit-scrollbar-track { background: #e2e8f0; }
        .tabs-container::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
        .tabs-container::-webkit-scrollbar-thumb:hover { background: #64748b; }
        
        .micro-tab { flex-shrink: 0; padding: 8px 20px; border-right: 1px solid #cbd5e1; background: #e2e8f0; cursor: pointer; font-weight: bold; color: #64748b; font-size: 11px; white-space: nowrap; }
        .micro-tab.active { background: #fff; color: #0284c7; border-bottom: 2px solid #0284c7; }
        
        .micro-input { box-sizing: border-box; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; width: 100%; outline: none; }
        .micro-input:focus { border-color: #0284c7; box-shadow: 0 0 0 2px rgba(2,132,199,0.1); }
        .micro-label { display: block; font-weight: 700; color: #475569; margin-bottom: 4px; font-size: 10px; text-transform: uppercase; }
        .micro-btn { padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; border: none; font-size: 11px; display: flex; align-items: center; gap: 5px; }
        .micro-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="tabs-container" style={{ display: "flex", borderBottom: "1px solid #cbd5e1", background: "#e2e8f0", overflowX: "auto" }}>
          {cultivosInfo.map(tab => {
              const tabData = datosCultivo[tab.id];
              return (
                  <div key={tab.id} className={`micro-tab ${cultivoActivo === tab.id ? 'active' : ''}`} onClick={() => setCultivoActivo(tab.id)}>
                      {tabData.validado ? "✅" : "🧪"} {tab.nombre}
                  </div>
              )
          })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "15px" }}>
        
        <div style={{ background: data.estado_reporte === "PRELIMINAR" ? "#fff7ed" : "#f0fdf4", border: `1px solid ${data.estado_reporte === "PRELIMINAR" ? "#d97706" : "#16a34a"}`, padding: "15px", borderRadius: "6px", marginBottom: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ margin: 0, color: data.estado_reporte === "PRELIMINAR" ? "#b45309" : "#15803d", fontSize: "12px", textTransform: "uppercase" }}>Estado del Reporte</h4>
                <div style={{ display: "flex", gap: "15px" }}>
                    <label style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px" }}>
                        <input type="radio" name={`estado_rep_${cultivoActivo}`} checked={data.estado_reporte === "PRELIMINAR"} onChange={() => handleCambio("estado_reporte", "PRELIMINAR")} /> PRELIMINAR
                    </label>
                    <label style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px" }}>
                        <input type="radio" name={`estado_rep_${cultivoActivo}`} checked={data.estado_reporte === "DEFINITIVO"} onChange={() => handleCambio("estado_reporte", "DEFINITIVO")} /> DEFINITIVO
                    </label>
                </div>
            </div>

            {isDefinitivo && (
                <div style={{ display: "flex", gap: "20px", marginBottom: mostrarCajaTexto ? "10px" : "0px", padding: "10px", background: "#fff", borderRadius: "4px", border: "1px dashed #16a34a", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "#15803d" }}>RESULTADO DEL CULTIVO:</div>
                    
                    <label style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", color: "#15803d" }}>
                        <input type="radio" checked={isNegativo} onChange={() => {
                             handleCambio("es_positivo", false);
                             handleCambio("es_microbiota_habitual", false);
                             handleCambio("germen_aislado", "");
                             handleCambio("antibiograma", []);
                             handleCambio("aplica_mecanismo", false);
                             handleCambio("mecanismo_resistencia", "");
                             if (isSangre) {
                                 handleCambio("fresco", "");
                                 handleCambio("tincion_gram", "");
                                 handleCambio("polimorfonucleares", "");
                                 handleCambio("celulas_epiteliales", "");
                             }
                        }} /> 🟢 NEGATIVO (Sin crecimiento)
                    </label>

                    {!isSangre && (
                        <label style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", color: "#ca8a04" }}>
                            <input type="radio" checked={isMicrobiota} onChange={() => {
                                 handleCambio("es_positivo", false);
                                 handleCambio("es_microbiota_habitual", true);
                                 handleCambio("antibiograma", []);
                                 handleCambio("reporte_texto", "");
                            }} /> 🟡 MICROBIOTA HABITUAL
                        </label>
                    )}

                    <label style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", color: "#b91c1c" }}>
                        <input type="radio" checked={isPositivo} onChange={() => {
                             handleCambio("es_positivo", true);
                             handleCambio("es_microbiota_habitual", false);
                             handleCambio("reporte_texto", ""); 
                        }} /> 🔴 POSITIVO (Patógeno)
                    </label>
                </div>
            )}

            {mostrarCajaTexto && (
                <div>
                    <label className="micro-label">Redacte el resultado {data.estado_reporte.toLowerCase()}:</label>
                    <input type="text" className="micro-input" value={data.reporte_texto} onChange={e => handleCambio("reporte_texto", e.target.value)} placeholder={data.estado_reporte === "PRELIMINAR" ? "Ej: Sin crecimiento bacteriano a las 48h de incubación" : "Ej: Sin desarrollo bacteriano a las 48h de incubación"} />
                </div>
            )}
        </div>

        {data.is_otros && (
            <div style={{ marginBottom: "15px" }}>
                <label className="micro-label">Especificar Tipo de Muestra:</label>
                <input type="text" className="micro-input" value={data.muestra_especifica} onChange={e => handleCambio("muestra_especifica", e.target.value)} placeholder="Ej: Cultivo de tejido o hueso" />
            </div>
        )}

        {mostrarFiltros && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", background: "#fff", padding: "15px", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "15px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                
                <div style={{ gridColumn: "span 2", background: "#f8fafc", padding: "12px 15px", borderRadius: "4px", border: "1px dashed #cbd5e1", display: "flex", gap: "20px", flexWrap: "wrap", borderLeft: "4px solid #0284c7" }}>
                   <div style={{ width: "100%", fontSize: "10px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>⚙️ Filtros de Reporte (Marque para activar los campos):</div>
                   <label style={{ fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}><input type="checkbox" checked={data.aplica_fresco} onChange={e => handleCambio("aplica_fresco", e.target.checked)} /> Reportar Fresco</label>
                   <label style={{ fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}><input type="checkbox" checked={data.aplica_gram} onChange={e => handleCambio("aplica_gram", e.target.checked)} /> Reportar Gram</label>
                   <label style={{ fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}><input type="checkbox" checked={data.aplica_microscopia} onChange={e => handleCambio("aplica_microscopia", e.target.checked)} /> Reportar PMN/Epiteliales</label>
                   <label style={{ fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}><input type="checkbox" checked={data.aplica_nickerson} onChange={e => handleCambio("aplica_nickerson", e.target.checked)} /> Reportar Nickerson</label>
                   <label style={{ fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}><input type="checkbox" checked={data.aplica_contaje} onChange={e => handleCambio("aplica_contaje", e.target.checked)} /> Reportar Contaje (UFC)</label>
                   <label style={{ fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "#334155" }}><input type="checkbox" checked={data.aplica_interpretacion} onChange={e => handleCambio("aplica_interpretacion", e.target.checked)} /> Reportar Interpretación</label>
                </div>

                {data.aplica_fresco && (
                    <div style={{ gridColumn: "span 2" }}>
                        <label className="micro-label">Examen en Fresco:</label>
                        <input type="text" className="micro-input" value={data.fresco} onChange={(e) => handleCambio("fresco", e.target.value)} placeholder="Ej: Se observan levaduras y pseudomicelios" />
                    </div>
                )}
                
                {data.aplica_gram && (
                    <div style={{ gridColumn: "span 2" }}>
                        <label className="micro-label">Tinción de Gram Directa:</label>
                        <input type="text" className="micro-input" value={data.tincion_gram} onChange={(e) => handleCambio("tincion_gram", e.target.value)} placeholder="Ej: Bacilos Gram Negativos" />
                    </div>
                )}

                {data.aplica_microscopia && (
                    <>
                        <div><label className="micro-label">Polimorfonucleares (PMN):</label><input type="text" className="micro-input" value={data.polimorfonucleares} onChange={(e) => handleCambio("polimorfonucleares", e.target.value)} placeholder="Ej: 20 - 30 x campo" /></div>
                        <div><label className="micro-label">Células Epiteliales:</label><input type="text" className="micro-input" value={data.celulas_epiteliales} onChange={(e) => handleCambio("celulas_epiteliales", e.target.value)} placeholder="Ej: < 10 x campo" /></div>
                    </>
                )}

                {data.aplica_nickerson && (
                    <div style={{ gridColumn: "span 2" }}>
                        <label className="micro-label">Medio Nickerson:</label>
                        <input type="text" className="micro-input" value={data.nickerson} onChange={(e) => handleCambio("nickerson", e.target.value)} placeholder="Ej: Positivo para levaduras" />
                    </div>
                )}

                {data.aplica_contaje && (
                    <div style={{ gridColumn: "span 2" }}><label className="micro-label">Contaje (UFC/mL):</label><input type="text" className="micro-input" value={data.contaje_ufc} onChange={(e) => handleCambio("contaje_ufc", e.target.value)} placeholder="Ej: >= 10^5 ufc/mL" /></div>
                )}

                {data.aplica_interpretacion && (
                    <div style={{ gridColumn: "span 2" }}><label className="micro-label">Interpretación del Contaje:</label><input type="text" className="micro-input" value={data.interpretacion} onChange={(e) => handleCambio("interpretacion", e.target.value)} placeholder="Ej: INFECCIÓN CORRELACIONAR CON CLÍNICA" /></div>
                )}
            </div>
        )}

        {mostrarGermenYResistencia && (
            <>
                <div style={{ marginBottom: "15px" }}>
                    <label className="micro-label">Germen Aislado (Patógeno):</label>
                    <input type="text" className="micro-input" style={{ fontSize: "16px", fontWeight: "900", fontStyle: "italic", color: data.es_microbiota_habitual ? "#94a3b8" : "#0f766e", background: data.es_microbiota_habitual ? "#f1f5f9" : "#fff" }} value={data.es_microbiota_habitual ? "Desarrollo de microbiota habitual" : data.germen_aislado} onChange={(e) => handleCambio("germen_aislado", formatGermen(e.target.value))} disabled={data.es_microbiota_habitual} placeholder="Ej: Escherichia coli" />
                </div>

                <div style={{ marginBottom: "15px", padding: "10px 15px", background: data.aplica_mecanismo ? "#fef2f2" : "#f8fafc", borderRadius: "6px", border: `1px dashed ${data.aplica_mecanismo ? "#ef4444" : "#cbd5e1"}` }}>
                     <label style={{ fontSize: "11px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: data.aplica_mecanismo ? "#b91c1c" : "#64748b", marginBottom: data.aplica_mecanismo ? "10px" : "0" }}>
                         <input type="checkbox" checked={data.aplica_mecanismo} onChange={e => {
                             handleCambio("aplica_mecanismo", e.target.checked);
                             if (!e.target.checked) handleCambio("mecanismo_resistencia", ""); // Limpieza automática
                         }} />
                         🧬 REPORTAR MECANISMO DE RESISTENCIA / VIGILANCIA EPIDEMIOLÓGICA
                     </label>
                     
                     {data.aplica_mecanismo && (
                         <div>
                            <input 
                                type="text" 
                                list="lista-mecanismos"
                                className="micro-input" 
                                style={{ borderColor: "#fca5a5" }}
                                value={data.mecanismo_resistencia} 
                                onChange={e => handleCambio("mecanismo_resistencia", e.target.value)} 
                                placeholder="Ej: Productor de BLEE o Negativo para ERV" 
                            />
                            <datalist id="lista-mecanismos">
                                <option value="Productor de BLEE (Betalactamasa de Espectro Extendido)" />
                                <option value="Productor de Carbapenemasa tipo KPC" />
                                <option value="Staphylococcus aureus resistente a meticilina (MRSA)" />
                                <option value="No se aislaron enterobacterias productoras de carbapenemasas (EPC)" />
                                <option value="Negativo para Enterococo Resistente a Vancomicina (ERV)" />
                                <option value="Positivo para Enterococo Resistente a Vancomicina (ERV)" />
                            </datalist>
                         </div>
                     )}
                </div>
            </>
        )}

        {mostrarAntibiograma && (
            <div style={{ marginBottom: "15px" }}>
                <TablaAntibiograma 
                   antibiograma={data.antibiograma || []} 
                   onActualizar={(nuevoArreglo) => handleCambio("antibiograma", nuevoArreglo)} 
                />
            </div>
        )}

      </div>

      <div style={{ background: "#e2e8f0", padding: "10px 15px", display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid #cbd5e1" }}>
          
          <button className="micro-btn" 
            style={{ background: isGuardado ? "#475569" : "#cbd5e1", color: isGuardado ? "#fff" : "#94a3b8" }} 
            onClick={abrirVistaPrevia}
            disabled={!isGuardado}>
            👁️ Vista Previa PDF
          </button>
          
          <button className="micro-btn" style={{ background: "#f59e0b", color: "#fff" }} onClick={verHistoricoPaciente}>
            🕒 Ver Histórico Germen
          </button>

          <button className="micro-btn" 
            style={{ background: algunValidado ? "#0284c7" : "#cbd5e1", color: algunValidado ? "#fff" : "#94a3b8" }} 
            onClick={() => setShowModalEnvio(true)}
            disabled={!algunValidado}>
            📤 Enviar a Paciente
          </button>

          <div style={{ flex: 1, textAlign: "right", paddingRight: "15px", fontSize: "9px", color: "#64748b", lineHeight: "1.4" }}>
              {data.editado_at && (
                 <div>Guardado por <b style={{color:"#475569"}}>{mapaUsuarios[data.editado_por] || "Usuario"}</b> el {new Date(data.editado_at).toLocaleString('es-ES')}</div>
              )}
              {data.validado_at && (
                 <div>Validado por <b style={{color:"#15803d"}}>{mapaUsuarios[data.validado_por] || "Usuario"}</b> el {new Date(data.validado_at).toLocaleString('es-ES')}</div>
              )}
          </div>

          <button className="micro-btn" style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#475569" }} onClick={() => toast("Cerrar")}>Cancelar</button>
          
          <button className="micro-btn" style={{ background: "#0284c7", color: "#fff" }} onClick={() => guardarCultivoBD(cultivoActivo, false)}>
            💾 Guardar Cultivo
          </button>
          
          <button className="micro-btn" 
            style={{ background: data.validado ? "#fff" : "#16a34a", border: data.validado ? "1px solid #16a34a" : "none", color: data.validado ? "#16a34a" : "#fff" }} 
            onClick={() => guardarCultivoBD(cultivoActivo, true, !data.validado)}>
             {data.validado ? "Desvalidar Cultivo" : "✓ Validar Cultivo"}
          </button>
      </div>

      <ModalEnviarResultados isOpen={showModalEnvio} onClose={() => setShowModalEnvio(false)} orden={orden} resultados={resultados || []} onActualizarOrden={(ordenActualizada) => { onActualizarOrden(ordenActualizada); }} />
    </div>
  );
}