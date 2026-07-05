import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../supabaseClient";
import { generarReporteImpresion } from "../utils/impresionReporte";
import { asignarAreaY_Tubo } from "./LabOrdenes"; 
import ModalHistorial from "./ModalHistorial"; 
import ModalObservacion from "./ModalObservacion"; 
import ModalEnviarResultados from "./ModalEnviarResultados";
import PanelMicrobiologia from "./PanelMicrobiologia"; 

import DetalleOrdenEncabezado from "./DetalleOrdenEncabezado";
import DetalleOrdenTubos from "./DetalleOrdenTubos";
import DetalleOrdenTabla from "./DetalleOrdenTabla";
import DetalleOrdenBotones from "./DetalleOrdenBotones";

function formatearNombreUsuario(nombreCompleto) {
  if (!nombreCompleto) return "SISTEMA";
  const partes = String(nombreCompleto).trim().split(" ");
  if (partes.length >= 2) return (partes[0].charAt(0) + partes[partes.length - 1]).toUpperCase();
  return partes[0].toUpperCase();
}

function evaluarFormula(formula, diccionarioValores) {
  if (!formula) return "";
  let expresion = String(formula).replace(/\n/g, '').replace(/\r/g, ''); 
  let faltanDatos = false;
  const variables = expresion.match(/\[(.*?)\]/g);
  if (variables) {
    variables.forEach(v => {
      const nombreVar = v.slice(1, -1).trim().toUpperCase(); 
      let valor = diccionarioValores[nombreVar];
      if (typeof valor === 'string') valor = valor.replace(',', '.').trim();
      if (valor === "" || valor === undefined || valor === null || isNaN(Number(valor))) faltanDatos = true;
      else expresion = expresion.split(v).join(valor);
    });
  }
  if (faltanDatos) return ""; 
  try {
    expresion = expresion.replace(/,/g, '.'); 
    const resultado = new Function('return ' + expresion)();
    if (!Number.isFinite(resultado)) return ""; 
    return Number(Math.round(resultado + 'e2') + 'e-2'); 
  } catch (e) { return ""; }
}

export default function DetalleOrden({ ordenInicial, idsPendientes, areaGlobal, onVolver, onActualizarOrden, onNavegarCola }) {
  const [orden, setOrden] = useState(ordenInicial);
  const [loadingDetalle, setLoadingDetalle] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [tubosActivos, setTubosActivos] = useState([]);
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false);
  const [fechasHist, setFechasHist] = useState({ h1: "", h2: "" });
  
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [configModalObs, setConfigModalObs] = useState({ isOpen: false, rowId: null, analitoNombre: "", valorActual: "" });
  const [showModalEnvio, setShowModalEnvio] = useState(false);

  const [tieneMicro, setTieneMicro] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("general");
  const [cacheAreas, setCacheAreas] = useState({});

  const infoCaja = Array.isArray(orden?.cotizaciones) ? orden.cotizaciones[0] : orden?.cotizaciones;
  const estaPagada = infoCaja ? infoCaja.pagada : true; 
  const totalFactura = infoCaja ? Number(infoCaja.total || 0) : 0;
  const abonoReal = infoCaja ? Number(infoCaja.abono || 0) : 0;
  const deuda = totalFactura - abonoReal;
  const tieneDeuda = !estaPagada && deuda > 0;

  // 🚀 CÁLCULO DE NAVEGACIÓN EN COLA
  const enCola = idsPendientes && idsPendientes.length > 0;
  const currentIndex = enCola ? idsPendientes.indexOf(orden.id) : -1;
  const posicionActual = currentIndex + 1;
  const totalCola = enCola ? idsPendientes.length : 0;

  useEffect(() => { cargarDetalle(orden?.id); }, [orden?.id]);

  async function cargarDetalle(ordenId) {
    if (!ordenId) return;
    setLoadingDetalle(true); setCambiosSinGuardar(false); 

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    const { data: resultadosDB, error } = await supabase.from("lab_orden_resultados").select(`id, orden_id, orden_examen_id, examen_id, analito_id, codigo_examen, nombre_examen, nombre_analito, grupo_nombre, unidad, rango_texto, rango_min, rango_max, resultado_texto, resultado_numero, resultado_flag, observacion, comentario_resultado, validado, validado_por, validado_at, editado_por, editado_at, orden_visual, mostrar_en_reporte, repeticion`).eq("orden_id", ordenId);
    if (error) { toast.error("Error al cargar resultados"); setLoadingDetalle(false); return; }

    const examenesIds = [...new Set((resultadosDB || []).map(r => r.examen_id).filter(Boolean))];
    let catalogoData = []; let examenesConfig = [];

    if (examenesIds.length > 0) {
      const resCat = await supabase.from("lab_catalogo_analitos").select("id, formula_calculo, opciones_predefinidas").in("examen_id", examenesIds);
      if (resCat.data) catalogoData = resCat.data;
      
      const resEx = await supabase.from("examenes").select("id, orden_impresion, lab_areas(*)").in("id", examenesIds);
      if (resEx.data) examenesConfig = resEx.data;
    }

    const localCacheFormulas = {}; const localCacheOpciones = {};
    catalogoData.forEach(c => { localCacheFormulas[c.id] = c.formula_calculo; localCacheOpciones[c.id] = c.opciones_predefinidas; });

    const localCacheAreas = {};
    examenesConfig.forEach(ex => {
      const areaData = Array.isArray(ex.lab_areas) ? ex.lab_areas[0] : ex.lab_areas;
      localCacheAreas[ex.id] = { 
          area_id: areaData?.id || null, 
          area_nombre: areaData?.nombre || null, 
          area_orden: areaData?.orden_visual || 999, 
          examen_orden: ex.orden_impresion || 999,
          tubo_id: areaData?.tubo_id || null,             
          tubo_nombre: areaData?.tubo_nombre || null      
      };
    });
    setCacheAreas(localCacheAreas);

    let hasMicro = false; let hasGeneral = false;
    (resultadosDB || []).forEach(r => {
      const dbConfig = localCacheAreas[r.examen_id] || {};
      if (dbConfig.area_id === "4b9c6b2a-271c-4269-a1be-f805d356a523" || (dbConfig.area_nombre || "").toUpperCase().includes("MICROBIOLOG")) hasMicro = true;
      else hasGeneral = true;
    });

    setTieneMicro(hasMicro);
    if (hasMicro && !hasGeneral) setActiveMainTab("microbiologia");

    let mapaHistorico = {}; 
    if (orden?.paciente_cedula && orden.paciente_cedula !== "9999999999") { 
      const fechaActual = orden.created_at || new Date().toISOString();
      
      const { data: ordenesPasadas } = await supabase.from("lab_ordenes")
        .select("id, created_at")
        .eq("paciente_cedula", orden.paciente_cedula)
        .neq("id", orden.id)
        .lt("created_at", fechaActual)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (ordenesPasadas && ordenesPasadas.length > 0) {
        const idsPasados = ordenesPasadas.map(o => o.id);
        
        const { data: resPasados } = await supabase.from("lab_orden_resultados")
          .select("orden_id, analito_id, examen_id, nombre_analito, resultado_numero, resultado_texto")
          .in("orden_id", idsPasados)
          .eq("validado", true);
          
        if (resPasados) {
          resPasados.forEach(rp => {
            const identifier = rp.analito_id || (rp.examen_id && rp.nombre_analito ? `${rp.examen_id}_${rp.nombre_analito.trim().toUpperCase()}` : (rp.nombre_analito ? rp.nombre_analito.trim().toUpperCase() : null));
            
            if (identifier) {
              if (!mapaHistorico[identifier]) mapaHistorico[identifier] = [];
              const valor = rp.resultado_numero !== null ? rp.resultado_numero : (rp.resultado_texto || "");
              
              const ordenAsociada = ordenesPasadas.find(o => o.id === rp.orden_id);
              if (ordenAsociada) {
                 mapaHistorico[identifier].push({ valor: valor, fecha: ordenAsociada.created_at });
              }
            }
          });
        }
      }
    }

    const mapped = (resultadosDB || []).map((r) => {
      const tuboInfoFallback = asignarAreaY_Tubo(r.grupo_nombre, r.nombre_examen);
      
      const identifier = r.analito_id || (r.examen_id && r.nombre_analito ? `${r.examen_id}_${r.nombre_analito.trim().toUpperCase()}` : (r.nombre_analito ? r.nombre_analito.trim().toUpperCase() : null));
      let historialArr = identifier ? (mapaHistorico[identifier] || []) : [];
      historialArr.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      const h1 = historialArr[0] ? historialArr[0].valor : "";
      const h1_date = historialArr[0] ? historialArr[0].fecha : "";
      const h2 = historialArr[1] ? historialArr[1].valor : "";
      const h2_date = historialArr[1] ? historialArr[1].fecha : "";
      
      const valorMostrar = r.resultado_numero !== null ? String(r.resultado_numero) : (r.resultado_texto || "");
      const dbConfig = localCacheAreas[r.examen_id] || {};
      
      const finalTuboId = dbConfig.tubo_id || tuboInfoFallback?.id || "3";
      const finalTuboNombre = dbConfig.tubo_nombre || tuboInfoFallback?.tubo || "SUERO";
      const fallbackArea = dbConfig.area_nombre || tuboInfoFallback?.area || "OTROS";
      
      return {
        ...r, tubo_id: finalTuboId, tubo_nombre: finalTuboNombre, db_area_nombre: fallbackArea,
        db_area_orden: dbConfig.area_orden, db_examen_orden: dbConfig.examen_orden, local_resultado_numero: valorMostrar, local_observacion: r.observacion || "", 
        local_comentario_resultado: r.comentario_resultado || "", local_repeticion: r.repeticion || "", 
        local_hist1: h1, local_hist1_date: h1_date, 
        local_hist2: h2, local_hist2_date: h2_date, 
        local_validado: !!r.validado, local_selected: false, is_dirty: false, is_calculado: !!(r.analito_id && localCacheFormulas[r.analito_id]), 
        formula_calculo: r.analito_id ? localCacheFormulas[r.analito_id] : null, opciones_predefinidas: r.analito_id ? (localCacheOpciones[r.analito_id] || "") : ""
      };
    });

    const finalMapped = procesarFormulasMasivo(mapped);
    setResultados(finalMapped);

    if (areaGlobal !== "TODAS LAS ÁREAS") {
      const tubosDelArea = [...new Set(finalMapped.filter(r => r.db_area_nombre && r.db_area_nombre.toUpperCase() === areaGlobal.toUpperCase()).map(r => r.tubo_id || "3"))];
      setTubosActivos(tubosDelArea);
    } else {
      const todosLosTubos = [...new Set(finalMapped.map(r => r.tubo_id || "3"))];
      setTubosActivos(todosLosTubos);
    }

    const idsParaDescargar = mapped.flatMap((r) => [r.editado_por, r.validado_por]);
    if (currentUser?.id) idsParaDescargar.push(currentUser.id);
    await cargarUsuariosPorIds(idsParaDescargar);
    setLoadingDetalle(false);
  }

  function procesarFormulasMasivo(arregloBase) {
    return arregloBase.map(resultadoCalculado => {
      if (resultadoCalculado.is_calculado && resultadoCalculado.formula_calculo) {
        const dictContextual = {};
        arregloBase.forEach(item => {
          if (item.nombre_analito) {
            const key = item.nombre_analito.trim().toUpperCase();
            const val = item.local_resultado_numero;
            if (val !== null && val !== "") {
              const isSameExamen = item.examen_id === resultadoCalculado.examen_id;
              const isSameTubo = item.tubo_id === resultadoCalculado.tubo_id;
              let priority = 1; 
              if (isSameTubo) priority = 2; 
              if (isSameExamen) priority = 3; 

              if (!dictContextual[key] || dictContextual[key].priority < priority) {
                dictContextual[key] = { val: val, priority: priority };
              }
            }
          }
        });
        const dictFinal = {};
        Object.keys(dictContextual).forEach(k => { dictFinal[k] = dictContextual[k].val; });
        const valorCalculado = evaluarFormula(resultadoCalculado.formula_calculo, dictFinal);
        if (String(valorCalculado) !== String(resultadoCalculado.local_resultado_numero)) {
          return { ...resultadoCalculado, local_resultado_numero: valorCalculado, is_dirty: true, local_validado: false };
        }
      }
      return resultadoCalculado;
    });
  }

  async function cargarUsuariosPorIds(ids) {
    const limpios = [...new Set(ids.filter(Boolean))];
    if (!limpios.length) return;
    const { data } = await supabase.from("lab_usuarios").select("id, nombre").in("id", limpios);
    const mapa = {};
    for (const u of data || []) { if (u.id) mapa[u.id] = formatearNombreUsuario(u.nombre); }
    setUserNames((prev) => ({ ...prev, ...mapa }));
  }

  function updateResultado(id, field, value) {
    setCambiosSinGuardar(true); 
    setResultados((prev) => {
      let nuevos = prev.map((r) => {
        if (r.id === id) {
          const actualizado = { ...r, [field]: value, is_dirty: true }; 
          if (field === "local_resultado_numero" || field === "local_comentario_resultado") actualizado.local_validado = false; 
          return actualizado;
        }
        return r;
      });
      if (field === "local_resultado_numero") nuevos = procesarFormulasMasivo(nuevos);
      return nuevos;
    });
  }

  // 🚀 AHORA ACEPTA LA BANDERA autoJump
 async function guardarCambios(modo = "GUARDAR_SOLO", autoJump = false) {
    if ((modo === "VALIDAR_TODO" || modo === "VALIDAR_SELECCION") && tieneDeuda) return toast.error(`Bloqueado: La orden tiene un saldo pendiente de $${deuda.toFixed(2)}`, { icon: "🔒", duration: 4000 });
    setGuardando(true); const toastId = toast.loading("Procesando...");
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user; const ahora = new Date().toISOString();

      const payloads = resultados.map((r) => {
        let nuevoValidado = r.local_validado;
        const strValTest = r.local_resultado_numero != null ? String(r.local_resultado_numero).trim() : "";
        const comTest = r.local_comentario_resultado != null ? String(r.local_comentario_resultado).trim() : "";
        const tieneValor = strValTest !== "" || comTest !== "";

        if (!tieneValor) nuevoValidado = false;
        else {
          if (modo === "VALIDAR_SELECCION" && r.local_selected) nuevoValidado = true;
          if (modo === "VALIDAR_TODO") nuevoValidado = true;
        }

        let finalEditadoPor = r.editado_por, finalEditadoAt = r.editado_at;
        if (r.is_dirty) { finalEditadoPor = user?.id || null; finalEditadoAt = ahora; }
        let finalValidadoPor = r.validado_por, finalValidadoAt = r.validado_at;
        if (!r.validado && nuevoValidado) { finalValidadoPor = user?.id || null; finalValidadoAt = ahora; } 
        else if (r.validado && !nuevoValidado) { finalValidadoPor = null; finalValidadoAt = null; }

        const strLimpio = strValTest.replace(',', '.'); 
        const isNum = strLimpio !== "" && !isNaN(Number(strLimpio));
        
        let localFlag = null;
        if (strValTest !== "") {
           const nTest = Number(strLimpio);
           if (!Number.isNaN(nTest)) {
              if (r.rango_min !== null && r.rango_min !== undefined && nTest < Number(r.rango_min)) localFlag = "bajo";
              if (r.rango_max !== null && r.rango_max !== undefined && nTest > Number(r.rango_max)) localFlag = "alto";
           }
        }

        return {
          id: r.id, orden_id: orden.id, orden_examen_id: r.orden_examen_id, analito_id: r.analito_id,          
          nombre_examen: r.nombre_examen, nombre_analito: r.nombre_analito,  
          resultado_numero: isNum ? Number(strLimpio) : null, resultado_texto: !isNum && strValTest !== "" ? strValTest : null,
          observacion: r.local_observacion?.trim() || null, comentario_resultado: comTest || null,
          repeticion: r.local_repeticion?.trim() || null, resultado_flag: localFlag || "normal",
          validado: !!nuevoValidado, editado_por: finalEditadoPor, editado_at: finalEditadoAt, validado_por: finalValidadoPor, validado_at: finalValidadoAt,
        };
      });

      const { error } = await supabase.from("lab_orden_resultados").upsert(payloads, { onConflict: 'id' });
      if (error) throw error;

      const totalVal = payloads.filter(p => p.validado === true).length;
      let estVal = (totalVal === resultados.length) ? "validado" : (totalVal > 0 ? "parcial" : "pendiente");
      await supabase.from("lab_ordenes").update({ estado_validacion: estVal, estado: "en_proceso" }).eq("id", orden.id);
      
      const act = { ...orden, estado_validacion: estVal, estado: "en_proceso" };
      setOrden(act); onActualizarOrden(act); setCambiosSinGuardar(false); 
      
      toast.success("Cambios guardados con éxito", { id: toastId }); 
      cargarDetalle(orden.id); 
      
      // 🚀 EJECUCIÓN DEL AUTO-JUMP AL FINALIZAR EL GUARDADO
      if (autoJump && typeof onNavegarCola === 'function') {
        onNavegarCola('next');
      }

    } catch (e) { toast.error(`Error: ${e.message || 'No se pudo guardar'}`, { id: toastId }); } finally { setGuardando(false); }
  }

  // 🚀 FUNCIONES DE NAVEGACIÓN MANUAL (PARA LAS FLECHAS)
  function handlePrev() {
    if (cambiosSinGuardar && !window.confirm("⚠️ Tienes cambios sin guardar.\n\n¿Deseas saltar a la orden anterior y perderlos?")) return;
    if (typeof onNavegarCola === 'function') onNavegarCola('prev');
  }

  function handleNext() {
    if (cambiosSinGuardar && !window.confirm("⚠️ Tienes cambios sin guardar.\n\n¿Deseas omitir esta orden y perderlos?")) return;
    if (typeof onNavegarCola === 'function') onNavegarCola('next');
  }

  function repetirTodasSeleccionadas() {
    let cantRepetidas = 0; setCambiosSinGuardar(true);
    setResultados(prev => prev.map(r => {
      if (r.local_selected && String(r.local_resultado_numero).trim() !== "") {
        cantRepetidas++;
        return { ...r, local_repeticion: r.local_resultado_numero, local_resultado_numero: "", local_validado: false, local_selected: false, is_dirty: true };
      }
      return r;
    }));
    if (cantRepetidas > 0) toast.success(`${cantRepetidas} pruebas enviadas a repetición.`, { icon: "↺" }); else toast("No hay pruebas para repetir.", { icon: "ℹ️" });
  }

  function handleImprimir() {
    if (tieneDeuda) return toast.error("Bloqueado por deuda", { icon: "🔒" });
    const resultadosParaImpresion = resultados.map(r => {
      const estaValidado = r.local_validado || r.validado;
      if (estaValidado) return r; 
      else return { ...r, local_resultado_numero: "PENDIENTE", resultado_texto: "PENDIENTE", resultado_numero: null, resultado_flag: "normal" };
    });
    generarReporteImpresion({ ordenSeleccionada: orden, resultados: resultadosParaImpresion, headerForm: orden });
  }

  function toggleTubo(id) { 
    setTubosActivos(prev => {
      const estaMarcado = prev.includes(id);
      const proximosTubos = estaMarcado ? prev.filter(t => t !== id) : [...prev, id];

      let analitosElegibles = resultados.filter(r => {
        if (areaGlobal !== "TODAS LAS ÁREAS" && (!r.db_area_nombre || r.db_area_nombre.toUpperCase() !== areaGlobal.toUpperCase())) return false;
        
        const dbConf = cacheAreas[r.examen_id] || {};
        if (dbConf.area_id === "4b9c6b2a-271c-4269-a1be-f805d356a523" || (dbConf.area_nombre || "").toUpperCase().includes("MICROBIOLOG")) return false;
        
        return true;
      });

      const tendraContenido = analitosElegibles.some(r => proximosTubos.includes(r.tubo_id || "3"));

      if (proximosTubos.length === 0 || !tendraContenido) {
        toast("Restableciendo vista: La tabla no puede quedar vacía.", { icon: "🔄", id: "reset-tubos" });
        return [...new Set(analitosElegibles.map(r => r.tubo_id || "3"))];
      }

      return proximosTubos;
    }); 
  }

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.cell-resultado-input'));
      const currIdx = inputs.findIndex(el => el === e.target);
      if (currIdx !== -1 && currIdx + 1 < inputs.length) { inputs[currIdx + 1].focus(); inputs[currIdx + 1].select(); } else { e.target.blur(); }
    }
  };

  function intentarCerrar() { if (cambiosSinGuardar && !window.confirm("⚠️ Tienes cambios sin guardar.\n\n¿Deseas salir y perderlos?")) return; onVolver(); }

  const tubosUnicos = useMemo(() => {
    const map = new Map();
    let filtradosParaTubos = resultados;
    if (areaGlobal !== "TODAS LAS ÁREAS") filtradosParaTubos = resultados.filter(r => r.db_area_nombre && r.db_area_nombre.toUpperCase() === areaGlobal.toUpperCase());
    filtradosParaTubos.forEach(r => { 
      const dbConf = cacheAreas?.[r.examen_id] || {};
      const isMicro = dbConf.area_id === "4b9c6b2a-271c-4269-a1be-f805d356a523" || (dbConf.area_nombre || "").toUpperCase().includes("MICROBIOLOG");
      if (!isMicro) { const tId = r.tubo_id || "3"; const tName = r.tubo_nombre || "SUERO"; if (!map.has(tId)) map.set(tId, { id: tId, nombre: tName }); }
    });
    return Array.from(map.values()).sort((a,b) => Number(a.id) - Number(b.id));
  }, [resultados, areaGlobal, cacheAreas]);

  const examCounts = useMemo(() => {
    const counts = {};
    resultados.forEach(r => { const name = r.nombre_examen ? String(r.nombre_examen).trim() : "EXAMEN GENERAL"; counts[name] = (counts[name] || 0) + 1; });
    return counts;
  }, [resultados]);

  const groupedResultados = useMemo(() => {
    let filtrados = resultados;
    if (areaGlobal !== "TODAS LAS ÁREAS") filtrados = filtrados.filter(r => r.db_area_nombre && r.db_area_nombre.toUpperCase() === areaGlobal.toUpperCase());
    if (activeMainTab === "general") filtrados = filtrados.filter(r => {
         const dbConf = cacheAreas[r.examen_id] || {};
         return !(dbConf.area_id === "4b9c6b2a-271c-4269-a1be-f805d356a523" || (dbConf.area_nombre || "").toUpperCase().includes("MICROBIOLOG"));
    });
    if (tubosActivos.length === 0) return []; 
    filtrados = filtrados.filter(r => tubosActivos.includes(r.tubo_id || "3"));
    return [...filtrados].sort((a, b) => {
      const tuboA = Number(a.tubo_id || 3); const tuboB = Number(b.tubo_id || 3);
      if (tuboA !== tuboB) return tuboA - tuboB;
      if (a.db_area_orden !== b.db_area_orden) return a.db_area_orden - b.db_area_orden;
      if (a.db_examen_orden !== b.db_examen_orden) return a.db_examen_orden - b.db_examen_orden;
      return (a.orden_visual || 0) - (b.orden_visual || 0);
    });
  }, [resultados, tubosActivos, areaGlobal, activeMainTab, cacheAreas]);

  function toggleAllSelection(marcar) {
    const idsVisibles = new Set(groupedResultados.map(r => r.id));
    setResultados(prev => prev.map(r => {
      if (idsVisibles.has(r.id)) return { ...r, local_selected: marcar };
      return r;
    }));
  }

  const haySeleccionados = groupedResultados.some(r => r.local_selected);
  const algunResultadoLleno = resultados.some(r => { return (r.local_resultado_numero != null ? String(r.local_resultado_numero).trim() : "") !== "" || (r.local_comentario_resultado != null ? String(r.local_comentario_resultado).trim() : "") !== ""; });

  return (
    <div style={{ fontFamily: "Segoe UI, Tahoma, sans-serif", fontSize: "11px", color: "#111", background: "#e5e7eb", height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        .inf-panel { background: #fff; border: 1px solid #9ca3af; margin-bottom: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
        .inf-header { background: #d4d4d4; padding: 2px 6px; font-weight: bold; border-bottom: 1px solid #9ca3af; display: flex; justify-content: space-between; font-size: 11px; flex-shrink: 0; }
        .inf-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .inf-table th { background: #e5e7eb; border: 1px solid #9ca3af; padding: 3px 1px; font-weight: bold; color: #333; text-align: center; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .inf-table td { border: 1px solid #d1d5db; padding: 1px 2px; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px; }
        .inf-table tbody tr:nth-child(even) { background-color: #f9fafb; }
        .inf-table tbody tr:hover { background-color: #e0f2fe; }
        .inf-table tbody tr.selected { background-color: #bae6fd; }
        .inf-input { width: 100%; border: none; background: transparent; outline: none; font-size: 11px; font-family: inherit; text-align: center; }
        .inf-input:focus { background: #fff; border: 1px solid #3b82f6; }
        .inf-input::-webkit-outer-spin-button, .inf-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .inf-input { -moz-appearance: textfield; }
        .inf-btn { background: linear-gradient(to bottom, #f9fafb, #e5e7eb); border: 1px solid #9ca3af; padding: 4px 10px; border-radius: 3px; cursor: pointer; color: #111; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 4px;}
        .inf-btn:hover:not(:disabled) { background: linear-gradient(to bottom, #f3f4f6, #d1d5db); border-color: #6b7280; }
        .inf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .inf-btn-primary { background: linear-gradient(to bottom, #60a5fa, #3b82f6); border-color: #2563eb; color: #fff; }
        .inf-btn-primary:hover:not(:disabled) { background: linear-gradient(to bottom, #3b82f6, #2563eb); }
        .inf-btn-success { background: linear-gradient(to bottom, #4ade80, #16a34a); border-color: #15803d; color: #fff; }
        .inf-btn-success:hover:not(:disabled) { background: linear-gradient(to bottom, #22c55e, #15803d); }
        .tooltip-container { position: relative; display: inline-block; cursor: help; }
        .tooltip-container .tooltip-text { visibility: hidden; width: 250px; background-color: #0f172a; color: #fff; text-align: left; padding: 8px; border-radius: 6px; position: absolute; z-index: 999; top: 125%; left: 50%; margin-left: -125px; font-size: 10px; line-height: 1.4; box-shadow: 0px 4px 6px rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s; white-space: normal; word-wrap: break-word; }
        .tooltip-container .tooltip-text::after { content: ""; position: absolute; bottom: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: transparent transparent #0f172a transparent; }
        .tooltip-container:hover .tooltip-text { visibility: visible; opacity: 1; }
      `}</style>

      <DetalleOrdenEncabezado 
        orden={orden} intentarCerrar={intentarCerrar} tieneDeuda={tieneDeuda} deuda={deuda} 
        tieneMicro={tieneMicro} activeMainTab={activeMainTab} setActiveMainTab={setActiveMainTab} 
        enCola={enCola} posicionActual={posicionActual} totalCola={totalCola} 
        handlePrev={handlePrev} handleNext={handleNext} // 🚀 PROPS DE NAVEGACIÓN PASADOS AL ENCABEZADO
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff", border: tieneMicro ? "1px solid #9ca3af" : "none", borderTop: tieneMicro ? "1px solid #9ca3af" : "none", zIndex: 1, position: "relative" }}>
        
        {activeMainTab === "general" ? (
          <>
            {groupedResultados.length === 0 ? (
                 <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                     No hay exámenes generales en esta orden con el filtro actual.
                 </div>
            ) : (
                <>
                  <DetalleOrdenTubos orden={orden} tubosUnicos={tubosUnicos} tubosActivos={tubosActivos} toggleTubo={toggleTubo} tieneMicro={tieneMicro} />
                  
                  <div className="inf-panel" style={{ flex: 1, overflow: "hidden", margin: tieneMicro ? "0 4px 4px 4px" : "0" }}>
                    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
                      <DetalleOrdenTabla 
                        loadingDetalle={loadingDetalle} groupedResultados={groupedResultados} examCounts={examCounts} userNames={userNames} fechasHist={fechasHist}
                        toggleAllSelection={toggleAllSelection} updateResultado={updateResultado} handleKeyDown={handleKeyDown} setConfigModalObs={setConfigModalObs} 
                      />
                    </div>

                    <DetalleOrdenBotones 
                      groupedResultadosLength={groupedResultados.length} guardando={guardando} algunResultadoLleno={algunResultadoLleno} tieneDeuda={tieneDeuda} haySeleccionados={haySeleccionados}
                      guardarCambios={guardarCambios} intentarCerrar={intentarCerrar} repetirTodasSeleccionadas={repetirTodasSeleccionadas} handleImprimir={handleImprimir}
                      setMostrarHistorial={setMostrarHistorial} enCola={enCola} // 🚀 SE PASA EL ESTADO A LOS BOTONES
                      setShowModalEnvio={() => {
                        if (tieneDeuda) return toast.error("Opción bloqueada por saldo pendiente", { icon: "🔒" });
                        const validados = resultados.filter(r => r.local_validado || r.validado);
                        if (validados.length === 0) return toast.error("Debes validar al menos una prueba para poder enviarla.");
                        setShowModalEnvio(true);
                      }}
                    />
                  </div>
                </>
            )}
          </>
        ) : (
          <PanelMicrobiologia orden={orden} cacheExamenesAreas={cacheAreas} resultados={resultados} onActualizarOrden={onActualizarOrden} />
        )}
      </div>

      <ModalHistorial isOpen={mostrarHistorial} onClose={() => setMostrarHistorial(false)} pacienteCedula={orden?.paciente_cedula} pacienteNombre={orden?.paciente_nombre} analitosSeleccionados={resultados.filter(r => r.local_selected)} />
      <ModalObservacion isOpen={configModalObs.isOpen} onClose={() => setConfigModalObs({ ...configModalObs, isOpen: false })} analitoNombre={configModalObs.analitoNombre} valorActual={configModalObs.valorActual} onSave={(nuevoTexto) => updateResultado(configModalObs.rowId, "local_comentario_resultado", nuevoTexto)} />
      <ModalEnviarResultados isOpen={showModalEnvio} onClose={() => setShowModalEnvio(false)} orden={orden} resultados={resultados} onActualizarOrden={(o) => { setOrden(o); onActualizarOrden(o); }} />
    </div>
  );
}