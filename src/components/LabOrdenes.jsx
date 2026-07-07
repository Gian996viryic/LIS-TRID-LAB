import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { createClient } from "@supabase/supabase-js"; 
import { supabase } from "../supabaseClient";
import DetalleOrden from "./DetalleOrden";
import PosMeson from "./PosMeson"; 
import ModalCobro from "./ModalCobro";
import ModalEdicion from "./ModalEdicion";
import ModalBuscadorPaciente from "./ModalBuscadorPaciente"; 
import ModalHojaTrabajo from "./ModalHojaTrabajo"; 
import ModalCertificadoAsistencia from "./ModalCertificadoAsistencia"; // 🚀 NUEVO IMPORT

export function asignarAreaY_Tubo(grupo, examen) {
  const g = (grupo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(); 
  const e = (examen || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  if (g.includes("HEMOGRAMA") || e.includes("HEMOGRAMA") || e.includes("GRUPO SANGUINEO")) return { id: "1", tubo: "SANGRE TOTAL (EDTA)", area: "HEMATOLOGIA" };
  if (g.includes("COAGULACION") || e.includes("TP") || e.includes("TPT") || e.includes("FIBRINOGENO") || e.includes("SANGRIA")) return { id: "2", tubo: "SANGRE (CITRATO)", area: "COAGULACION" };
  if (g.includes("ORINA") || e.includes("ORINA") || e.includes("URO") || e.includes("EMO")) return { id: "4", tubo: "ORINA", area: "ORINA" };
  if (g.includes("HECES") || e.includes("HECES") || e.includes("COPRO") || e.includes("PST") || e.includes("PARASITO")) return { id: "5", tubo: "HECES", area: "HECES" };
  if (g.includes("LIQUIDO") || e.includes("LIQUIDO")) return { id: "6", tubo: "LIQUIDOS BIOLOGICOS", area: "LIQUIDOS BIOLOGICOS" };
  if (g.includes("MOLECULAR") || e.includes("PCR") || e.includes("SARS")) return { id: "7", tubo: "TUBO MOLECULAR", area: "MOLECULAR" };
  if (g.includes("MICROBIOLOGIA") || e.includes("CULTIVO") || e.includes("BACTERIA")) return { id: "8", tubo: "MEDIO CULTIVO", area: "MICROBIOLOGIA" };
  if (g.includes("GASOMETRIA") || e.includes("GASES")) return { id: "9", tubo: "JERINGA GASES", area: "GASOMETRIAS" };
  
  if (g.includes("BIOQUIMICA") || g.includes("QUIMICA") || e.includes("GLUCOSA") || e.includes("UREA") || e.includes("CREATININA") || e.includes("COLESTEROL") || e.includes("TRIGLICERIDOS") || e.includes("ACIDO URICO") || e.includes("AMILASA") || e.includes("LIPASA") || e.includes("TRANSAMINASA") || e.includes("TGO") || e.includes("TGP") || e.includes("BILIRRUBINA") || e.includes("PROTEINA") || e.includes("CALCIO") || e.includes("HIERRO") || e.includes("MAGNESIO") || e.includes("FOSFORO")) { return { id: "3", tubo: "SUERO", area: "BIOQUIMICA" }; }
  if (g.includes("INMUNO") || g.includes("HORMONA") || e.includes("INSULINA") || e.includes("TIROIDE") || e.includes("TSH") || e.includes("T3") || e.includes("T4") || e.includes("PSA") || e.includes("HCG") || e.includes("BETA") || e.includes("VIH") || e.includes("HEPATITIS") || e.includes("VDRL") || e.includes("TORCH") || e.includes("PROLACTINA") || e.includes("FSH") || e.includes("LH") || g.includes("MARCADORES") || g.includes("SEROLOGIA")) { return { id: "3", tubo: "SUERO", area: "INMUNOQUIMICA" }; }
  
  return { id: "3", tubo: "SUERO", area: "INMUNOQUIMICA / BIOQUIMICA" };
}

export default function LabOrdenes({ rol }) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState(""); 
  const [filtroFecha, setFiltroFecha] = useState("hoy"); 
  const [fechaEspecifica, setFechaEspecifica] = useState(""); 
  const [areaActiva, setAreaActiva] = useState("TODAS LAS ÁREAS"); 
  const [areasLabDinámicas, setAreasLabDinámicas] = useState(["TODAS LAS ÁREAS"]);
  
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0); 

  const ITEMS_POR_PAGINA = rol === "admin_lab" ? 16 : 17; 
  
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null); 
  const [idsPendientes, setIdsPendientes] = useState([]); 
  
  const [modoSoloPendientes, setModoSoloPendientes] = useState(true);

  const [listaConvenios, setListaConvenios] = useState([]);

  const [showNuevaPeticion, setShowNuevaPeticion] = useState(false);
  const [ordenRegistro, setOrdenRegistro] = useState(null); 
  const [showCobro, setShowCobro] = useState(false);
  const [ordenCobro, setOrdenCobro] = useState(null);
  const [showHojaTrabajo, setShowHojaTrabajo] = useState(false); 
  const [showBuscadorPaciente, setShowBuscadorPaciente] = useState(false); 

  // 🚀 NUEVOS ESTADOS PARA EL CERTIFICADO
  const [showCertificado, setShowCertificado] = useState(false);
  const [ordenCertificado, setOrdenCertificado] = useState(null);

  const [showUsuarios, setShowUsuarios] = useState(false);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [nuevoUser, setNuevoUser] = useState({ nombre: '', correo: '', password: '', rol: 'laboratorista' });
  const [procesandoUser, setProcesandoUser] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBusquedaDebounced(busqueda), 500);
    return () => clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => { setPaginaActual(1); }, [busquedaDebounced, filtroFecha, fechaEspecifica, areaActiva]);
  useEffect(() => { if (filtroFecha === "especifica" && !fechaEspecifica) return; cargarOrdenesPaginadasServidor(); }, [busquedaDebounced, filtroFecha, fechaEspecifica, areaActiva, paginaActual]);

  useEffect(() => {
    async function cargarConfiguraciones() {
      const { data: areasData } = await supabase.from("lab_areas").select("nombre").order("orden_visual", { ascending: true });
      if (areasData) setAreasLabDinámicas(["TODAS LAS ÁREAS", ...areasData.map(a => a.nombre.toUpperCase())]);
      const { data: convData } = await supabase.from("lab_convenios").select("id, nombre, codigo_secreto").eq("activo", true);
      if (convData) setListaConvenios(convData);
    }
    cargarConfiguraciones();
  }, []);

  function getRangoFechas() {
    const hoy = new Date();
    if (filtroFecha === "hoy") return { inicio: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString(), fin: new Date().toISOString() };
    if (filtroFecha === "ayer") {
      const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
      return { inicio: new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate()).toISOString(), fin: new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 23, 59, 59, 999).toISOString() };
    }
    if (filtroFecha === "especifica" && fechaEspecifica) return { inicio: new Date(fechaEspecifica + "T00:00:00").toISOString(), fin: new Date(fechaEspecifica + "T23:59:59.999").toISOString() };
    return null; 
  }

  async function cargarOrdenesPaginadasServidor() {
    setLoading(true);
    const desde = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const hasta = desde + ITEMS_POR_PAGINA - 1;

    let selectString = `
      id, codigo_orden, codigo_cotizacion, cotizacion_id, paciente_nombre, paciente_cedula, paciente_correo, 
      paciente_telefono, paciente_edad, paciente_sexo, solicitado_por, tipo_muestra, 
      fecha_ingreso_muestra, fecha_reporte, fecha_cotizacion, fecha_pago, estado, 
      estado_validacion, created_at, observacion_interna, tipo_paciente, procedencia,
      cotizaciones(total, pagada, estado, abono) 
    `;

    if (areaActiva !== "TODAS LAS ÁREAS") selectString += `, lab_orden_resultados!inner(grupo_nombre)`;

    let query = supabase.from("lab_ordenes").select(selectString, { count: "exact" });
    if (areaActiva !== "TODAS LAS ÁREAS") query = query.eq('lab_orden_resultados.grupo_nombre', areaActiva);

    const rangos = getRangoFechas();
    if (rangos) query = query.gte("created_at", rangos.inicio).lte("created_at", rangos.fin);

    if (busquedaDebounced.trim()) {
      const s = `%${busquedaDebounced.trim()}%`;
      query = query.or(`codigo_orden.ilike.${s},paciente_nombre.ilike.${s},paciente_cedula.ilike.${s}`);
    }

    const { data: ordenesData, count, error } = await query.order("created_at", { ascending: false }).range(desde, hasta);

    if (error) { toast.error("Error BD: " + error.message); setOrdenes([]); setLoading(false); return; }
    setTotalRegistros(count || 0);

    if (ordenesData && ordenesData.length > 0) {
      const ids = ordenesData.map(o => o.id);
      const { data: resultadosData } = await supabase.from("lab_orden_resultados").select("orden_id, grupo_nombre, validado").in("orden_id", ids);
        
      const ordenesCompletas = ordenesData.map(orden => {
        const resOrden = (resultadosData || []).filter(r => r.orden_id === orden.id);
        const areasDeEstaOrden = resOrden.map(r => r.grupo_nombre ? r.grupo_nombre.toUpperCase() : "OTROS");
        
        let resultadosParaContar = resOrden;
        if (areaActiva !== "TODAS LAS ÁREAS") {
          resultadosParaContar = resOrden.filter(r => (r.grupo_nombre || "").toUpperCase() === areaActiva);
        }

        const cantidadFaltantes = resultadosParaContar.filter(r => r.validado !== true).length;
        const totalPruebas = resultadosParaContar.length;
        
        let estadoValidacionLocal = orden.estado_validacion;
        if (areaActiva !== "TODAS LAS ÁREAS") {
           if (totalPruebas > 0 && cantidadFaltantes === 0) estadoValidacionLocal = "validado";
           else if (cantidadFaltantes > 0 && cantidadFaltantes < totalPruebas) estadoValidacionLocal = "parcial";
           else estadoValidacionLocal = "pendiente";
        }

        const cleanedOrden = { ...orden }; delete cleanedOrden.lab_orden_resultados; 
        return { 
          ...cleanedOrden, 
          areas_incluidas: [...new Set(areasDeEstaOrden)], 
          faltan_count: cantidadFaltantes,
          estado_validacion_local: estadoValidacionLocal 
        };
      });
      setOrdenes(ordenesCompletas);
    } else setOrdenes([]);
    
    setLoading(false);
  }

  function abrirEdicionPeticion() {
    const seleccionada = document.querySelector('input[name="ordencheck"]:checked');
    if (seleccionada) {
      const ord = ordenes.find(o => String(o.id) === seleccionada.value);
      setOrdenRegistro(ord);
    } else toast("Selecciona una orden.", { icon: "ℹ️" });
  }

  function abrirModalCobro() {
    const seleccionada = document.querySelector('input[name="ordencheck"]:checked');
    if (seleccionada) {
      const ord = ordenes.find(o => String(o.id) === seleccionada.value);
      const infoCaja = Array.isArray(ord.cotizaciones) ? ord.cotizaciones[0] : ord.cotizaciones;
      if (!infoCaja) return toast.error("Orden sin registro financiero.");
      if (infoCaja.pagada) return toast.success("¡Esta orden ya está pagada!");
      setOrdenCobro({ ...ord, finanzas: infoCaja });
      setShowCobro(true);
    } else toast("Selecciona una orden.", { icon: "ℹ️" });
  }

  // 🚀 NUEVA FUNCIÓN PARA ABRIR CERTIFICADO
  function abrirModalCertificado() {
    const seleccionada = document.querySelector('input[name="ordencheck"]:checked');
    if (seleccionada) {
      const ord = ordenes.find(o => String(o.id) === seleccionada.value);
      setOrdenCertificado(ord);
      setShowCertificado(true);
    } else toast("Selecciona una orden para generar el certificado.", { icon: "ℹ️" });
  }

  function fmtDateGrid(v) {
    if (!v) return "";
    try { const d = new Date(v); const pad = (n) => String(n).padStart(2, "0"); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; } catch { return String(v); }
  }

  function fmtTimeGrid(v) {
    if (!v) return "";
    try { const d = new Date(v); const pad = (n) => String(n).padStart(2, "0"); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; } catch { return String(v); }
  }

  function StatusBox({ orden }) {
    const { estado, estado_validacion_local, faltan_count } = orden;
    
    if (estado === "anulada") {
      return (
        <div style={{ display: "flex", gap: "2px", justifyContent: "center" }} title="Anulada">
          {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 8, height: 8, backgroundColor: "#ef4444", border: "1px solid #b91c1c" }} />)}
        </div>
      );
    }
    if (estado_validacion_local === "validado" || faltan_count === 0) {
      return (
        <div style={{ display: "flex", gap: "2px", justifyContent: "center" }} title="Validado (Completo)">
          {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 8, height: 8, backgroundColor: "#16a34a", border: "1px solid #15803d" }} />)}
        </div>
      );
    }
    if (estado_validacion_local === "parcial") {
      return (
        <div style={{ display: "flex", gap: "2px", justifyContent: "center" }} title="En Proceso Parcial">
          {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 8, height: 8, backgroundColor: i <= 3 ? "#0ea5e9" : "#e5e7eb", border: "1px solid #9ca3af" }} />)}
        </div>
      );
    }
    return (
      <div style={{ display: "flex", gap: "2px", justifyContent: "center" }} title="Pendiente">
        {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ width: 8, height: 8, backgroundColor: i <= 1 ? "#f59e0b" : "#e5e7eb", border: "1px solid #9ca3af" }} />)}
      </div>
    );
  }

  function abrirValidacionEnCola() {
    let colaParaRevisar = [];
    
    if (modoSoloPendientes) {
      colaParaRevisar = ordenes.filter(o => o.estado_validacion_local !== "validado" && o.estado !== "anulada");
    } else {
      colaParaRevisar = ordenes.filter(o => o.estado !== "anulada"); 
    }

    if (colaParaRevisar.length === 0) {
      return toast.success(modoSoloPendientes ? "No hay órdenes pendientes por validar." : "No hay órdenes disponibles.", { icon: "👌" });
    }

    setIdsPendientes(colaParaRevisar.map(o => o.id));
    setOrdenSeleccionada(colaParaRevisar[0]);
  }

  function navegarCola(direccion) {
    const currentIndex = idsPendientes.indexOf(ordenSeleccionada.id);
    if (currentIndex !== -1) {
      let nextIndex = direccion === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < idsPendientes.length) {
        setOrdenSeleccionada(ordenes.find(o => o.id === idsPendientes[nextIndex]));
      } else {
        toast.success(direccion === 'next' ? "¡Cola terminada!" : "Estás en la primera orden.");
        if (direccion === 'next') {
           setOrdenSeleccionada(null); 
           setIdsPendientes([]);
        }
      }
    }
  }

  async function abrirModalUsuarios() { const { data, error } = await supabase.from("lab_usuarios").select("id, nombre, rol, correo, cargo, registro_senescyt, firma_path").order("nombre"); if (error) toast.error("Error: " + error.message); else { setListaUsuarios(data || []); setShowUsuarios(true); } }
  async function actualizarDatoUsuario(id, campo, nuevoValor) { const toastId = toast.loading("Actualizando..."); const { error } = await supabase.from("lab_usuarios").update({ [campo]: nuevoValor }).eq("id", id); if (error) toast.error("Error: " + error.message, { id: toastId }); else { toast.success("Dato actualizado", { id: toastId }); setListaUsuarios(prev => prev.map(u => u.id === id ? { ...u, [campo]: nuevoValor } : u)); } }
  async function subirFirmaUsuario(usuarioId, file) { if (!file) return; const toastId = toast.loading("Subiendo firma..."); try { const fileExt = file.name.split('.').pop(); const fileName = `firma_${usuarioId}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('firmas').upload(fileName, file, { upsert: true }); if (uploadError) throw uploadError; const { error: updateError } = await supabase.from('lab_usuarios').update({ firma_path: fileName }).eq('id', usuarioId); if (updateError) throw updateError; setListaUsuarios(prev => prev.map(u => u.id === usuarioId ? { ...u, firma_path: fileName } : u)); toast.success("¡Firma asignada!", { id: toastId }); } catch (error) { toast.error(error.message, { id: toastId }); } }
  async function eliminarFirmaUsuario(usuarioId, firmaPath) { if (!window.confirm("¿Eliminar firma?")) return; const toastId = toast.loading("Eliminando..."); try { if (firmaPath && firmaPath !== 'firma.png') await supabase.storage.from('firmas').remove([firmaPath]); const { error } = await supabase.from('lab_usuarios').update({ firma_path: 'firma.png' }).eq('id', usuarioId); if (error) throw error; setListaUsuarios(prev => prev.map(u => u.id === usuarioId ? { ...u, firma_path: 'firma.png' } : u)); toast.success("Firma eliminada", { id: toastId }); } catch (error) { toast.error(error.message, { id: toastId }); } }
  async function eliminarUsuarioCompleto(usuarioId, nombre) { if (!window.confirm(`¿Seguro de eliminar a "${nombre}"?`)) return; const toastId = toast.loading("Eliminando..."); try { const { error } = await supabase.from('lab_usuarios').delete().eq('id', usuarioId); if (error) throw error; setListaUsuarios(prev => prev.filter(u => u.id !== usuarioId)); toast.success("Eliminado", { id: toastId }); } catch (error) { toast.error(error.message, { id: toastId }); } }
  async function crearNuevoUsuario(e) { e.preventDefault(); if (!nuevoUser.nombre || !nuevoUser.correo || !nuevoUser.password) return toast.error("Datos incompletos"); setProcesandoUser(true); const toastId = toast.loading("Creando..."); try { const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; const adminAuthClient = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } }); const { data: authData, error: authError } = await adminAuthClient.auth.signUp({ email: nuevoUser.correo, password: nuevoUser.password }); if (authError) throw authError; const userId = authData.user.id; const { data: perfilData, error: dbError } = await supabase.from("lab_usuarios").insert([{ id: userId, nombre: nuevoUser.nombre, correo: nuevoUser.correo, rol: nuevoUser.rol }]).select(); if (dbError) throw dbError; toast.success("¡Usuario creado!", { id: toastId }); setListaUsuarios([...listaUsuarios, perfilData[0]]); setNuevoUser({ nombre: '', correo: '', password: '', rol: 'laboratorista' }); } catch (error) { toast.error(error.message, { id: toastId }); } finally { setProcesandoUser(false); } }

  if (ordenSeleccionada) {
    return (
      <div className="lis-container" style={{ height: "100%", width: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Toaster position="top-right" />
        <DetalleOrden 
          key={ordenSeleccionada.id} 
          ordenInicial={ordenSeleccionada} 
          idsPendientes={idsPendientes} 
          areaGlobal={areaActiva} 
          onNavegarCola={navegarCola} 
          onVolver={() => { setOrdenSeleccionada(null); setIdsPendientes([]); cargarOrdenesPaginadasServidor(); }} 
          onActualizarOrden={(ordenActualizada) => { setOrdenes((prev) => prev.map(o => o.id === ordenActualizada.id ? ordenActualizada : o)); }} 
        />
      </div>
    );
  }

  const totalPaginas = Math.ceil(totalRegistros / ITEMS_POR_PAGINA) || 1;

  return (
    <div className="lis-container" style={{ fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif", fontSize: "12px", color: "#111", background: "#d4d4d4", flex: 1, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Toaster position="top-right" />
      
      <style>{`
        .lis-panel { background: #fff; border: 1px solid #999; display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .lis-header { background: linear-gradient(to bottom, #f9fafb, #e5e7eb); border-bottom: 1px solid #999; padding: 4px 8px; font-weight: bold; display: flex; align-items: center; gap: 10px; }
        .lis-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .lis-table th { background: linear-gradient(to bottom, #e5e7eb, #d1d5db); border: 1px solid #999; padding: 4px; text-align: left; font-weight: normal; color: #333; position: sticky; top: 0; z-index: 10; }
        .lis-table td { border: 1px solid #d1d5db; padding: 3px 6px; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lis-table tbody tr:nth-child(even) { background-color: #f9fafb; }
        .lis-table tbody tr:hover { background-color: #bae6fd; cursor: pointer; }
        .lis-btn { background: linear-gradient(to bottom, #f9fafb, #e5e7eb); border: 1px solid #9ca3af; padding: 4px 12px; border-radius: 2px; font-size: 11px; cursor: pointer; color: #111; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .lis-btn:hover:not(:disabled) { background: linear-gradient(to bottom, #f3f4f6, #d1d5db); border-color: #6b7280; }
        .lis-btn:active:not(:disabled) { background: #d1d5db; }
        .lis-input { padding: 4px 8px; border: 1px solid #9ca3af; font-size: 12px; outline: none; box-sizing: border-box; border-radius: 4px; }
        .lis-input:focus { border-color: #0284c7; }
        .lis-input-label { font-size: 11px; color: #555; display: block; margin-bottom: 4px; }
      `}</style>

      <div style={{ background: "#e5e7eb", padding: "4px 8px", borderBottom: "1px solid #999", display: "flex", gap: "10px", flexShrink: 0 }}>
        <span>Áreas de trabajo \ TRIDLAB LIS \ <b>General Lab</b></span>
      </div>

      <div className="lis-panel">
        <div className="lis-header" style={{ flexShrink: 0 }}>
          <select className="lis-input" style={{ width: "160px", fontWeight: "bold", color: "#0369a1", height: "26px", padding: "2px 6px" }} value={areaActiva} onChange={e => setAreaActiva(e.target.value)}>
            {areasLabDinámicas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span style={{ borderLeft: "1px solid #999", height: "16px", margin: "0 4px" }}></span>
          <div style={{ background: "#3b82f6", color: "#fff", padding: "3px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}>
            Filtro Activo: {areaActiva}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ padding: 20 }}>Cargando peticiones del servidor...</div>
          ) : ordenes.length === 0 ? (
            <div style={{ padding: 20 }}>No se encontraron órdenes.</div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table className="lis-table">
                <colgroup>
                  <col style={{ width: "30px" }} />
                  <col style={{ width: "70px" }} />
                  <col style={{ width: "150px" }} /> 
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "70px" }} />
                  <col style={{ width: "220px" }} /> 
                  <col style={{ width: "90px" }} /> 
                  <col style={{ width: "50px" }} /> 
                  <col style={{ width: "60px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "80px" }} /> 
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "auto" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: "center" }}>☐</th>
                    <th>Tipo</th>
                    <th>Nº petición</th>
                    <th>Fecha Reg.</th>
                    <th>Hora Reg.</th>
                    <th>Apellidos, Nombre</th>
                    <th>Cédula</th>
                    <th>Edad</th>
                    <th style={{ textAlign: "center" }}>Faltan</th>
                    <th style={{ textAlign: "center" }}>Est. Petición</th>
                    <th style={{ textAlign: "center" }}>Caja</th>
                    <th>Procedencia</th>
                    <th>Doctor</th>
                    <th>Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map((orden) => {
                    const infoCaja = Array.isArray(orden.cotizaciones) ? orden.cotizaciones[0] : orden.cotizaciones;
                    const estaPagada = infoCaja ? infoCaja.pagada : true;
                    const totalFactura = infoCaja ? Number(infoCaja.total || 0) : 0;
                    const abonoReal = infoCaja ? Number(infoCaja.abono || 0) : 0;
                    const deuda = totalFactura - abonoReal;

                    return (
                    <tr key={orden.id} onDoubleClick={() => setOrdenSeleccionada(orden)}>
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}><input type="radio" name="ordencheck" value={orden.id} /></td>
                      <td>{orden.tipo_paciente || "RUTINA"}</td>
                      <td style={{ fontWeight: "bold", color: "#0369a1" }}>{orden.codigo_orden}</td>
                      <td>{fmtDateGrid(orden.fecha_ingreso_muestra || orden.created_at)}</td>
                      <td>{fmtTimeGrid(orden.fecha_ingreso_muestra || orden.created_at)}</td>
                      <td style={{ fontWeight: "bold" }}>{orden.paciente_nombre?.toUpperCase()}</td>
                      <td>{orden.paciente_cedula || "-"}</td>
                      <td>{orden.paciente_edad || "-"}</td>
                      
                      <td style={{ textAlign: "center", fontWeight: "bold", color: orden.faltan_count > 0 ? "#dc2626" : "#16a34a" }}>
                        {orden.faltan_count === 0 ? "✓ 0" : orden.faltan_count}
                      </td>
                      
                      <td><StatusBox orden={orden} /></td>
                      
                      <td style={{ textAlign: "center", fontSize: "10px", fontWeight: "bold" }}>
                        {estaPagada || deuda <= 0 ? (
                          <span style={{ color: "#16a34a", background: "#dcfce3", padding: "2px 6px", borderRadius: "4px" }}>✅ PAGADO</span>
                        ) : (
                          <span style={{ color: "#dc2626", background: "#fee2e2", padding: "2px 6px", borderRadius: "4px" }}>⚠️ ${deuda.toFixed(2)}</span>
                        )}
                      </td>
                      <td>{orden.procedencia || "AMBULATORIO"}</td>
                      <td>{orden.solicitado_por || "PARTICULAR"}</td>
                      <td style={{ color: "#666", fontStyle: "italic" }}>{orden.observacion_interna || "-"}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ background: "#f3f4f6", padding: "4px 12px", borderTop: "1px solid #999", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", flexShrink: 0 }}>
          <span style={{ color: "#555" }}>Mostrando {totalRegistros > 0 ? ((paginaActual - 1) * ITEMS_POR_PAGINA) + 1 : 0} al {Math.min(paginaActual * ITEMS_POR_PAGINA, totalRegistros)} de {totalRegistros}</span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button className="lis-btn" disabled={paginaActual === 1 || loading} onClick={() => setPaginaActual(p => p - 1)}>◀ Anterior</button>
            <span style={{ fontWeight: "bold", margin: "0 8px" }}>Página {paginaActual} de {totalPaginas}</span>
            <button className="lis-btn" disabled={paginaActual === totalPaginas || loading} onClick={() => setPaginaActual(p => p + 1)}>Siguiente ▶</button>
          </div>
        </div>

        <div style={{ background: "#e5e7eb", borderTop: "1px solid #999", padding: "8px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              
              <fieldset style={{ border: "1px solid #9ca3af", padding: "4px 8px 8px 8px", margin: 0, background: "#e5e7eb", display: "flex", flexDirection: "column", gap: "6px" }}>
                <legend style={{ fontSize: "11px", color: "#555", padding: "0 4px" }}>Validación / Cola</legend>
                
                <label style={{ fontSize: "10px", color: "#334155", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontWeight: "bold" }}>
                  <input 
                    type="checkbox" 
                    checked={modoSoloPendientes} 
                    onChange={(e) => setModoSoloPendientes(e.target.checked)} 
                    style={{ accentColor: "#0f766e" }} 
                  />
                  Solo pendientes
                </label>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="lis-btn" style={{ fontWeight: "bold", color: "#0f766e" }} onClick={abrirValidacionEnCola}>
                    {modoSoloPendientes ? "► Validar Pendientes" : "► Revisar Todas"}
                  </button>
                  <button className="lis-btn" style={{ fontWeight: "bold", background: "#e0f2fe", color: "#0369a1", borderColor: "#bae6fd" }} onClick={() => setShowHojaTrabajo(true)}>► Hoja / Derivar</button>
                </div>
              </fieldset>

              <fieldset style={{ border: "1px solid #9ca3af", padding: "4px 8px 8px 8px", margin: 0, background: "#e5e7eb", display: "flex", gap: "8px" }}>
                <legend style={{ fontSize: "11px", color: "#555", padding: "0 4px" }}>Filtro de Fechas</legend>
                <select className="lis-input" style={{ width: "160px", height: "26px" }} value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}>
                  <option value="hoy">Día actual (Hoy)</option><option value="ayer">Día anterior (Ayer)</option><option value="especifica">Fecha Específica...</option><option value="todas">Histórico completo</option>
                </select>
                {filtroFecha === "especifica" && (<input type="date" className="lis-input" style={{ height: "26px" }} value={fechaEspecifica} onChange={e => setFechaEspecifica(e.target.value)} />)}
                <input type="text" className="lis-input" style={{ height: "26px" }} placeholder="Buscar paciente/código..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </fieldset>
            </div>

            <fieldset style={{ border: "1px solid #9ca3af", padding: "4px 8px 8px 8px", margin: 0, background: "#e5e7eb", display: "flex", gap: "8px" }}>
              <legend style={{ fontSize: "11px", color: "#555", padding: "0 4px" }}>Administración</legend>
              
              {rol === "admin_lab" && (
                <>
                  <button className="lis-btn" style={{ background: "#6b21a8", color: "white", borderColor: "#581c87", fontWeight: "bold" }} onClick={() => setShowBuscadorPaciente(true)}>
                    🔍 Buscar PIN / Paciente
                  </button>

                  <button className="lis-btn" style={{ background: "#0ea5e9", color: "white", borderColor: "#0284c7", fontWeight: "bold" }} onClick={() => setShowNuevaPeticion(true)}>➕ Nueva Petición (Caja)</button>
                  <button className="lis-btn" style={{ background: "#d97706", color: "white", borderColor: "#b45309", fontWeight: "bold" }} onClick={abrirModalCobro}>💰 Cobrar Saldo</button>
                  
                  {/* 🚀 NUEVO BOTÓN PARA CERTIFICADO DE ASISTENCIA */}
                  <button className="lis-btn" style={{ background: "#4f46e5", color: "white", borderColor: "#4338ca", fontWeight: "bold" }} onClick={abrirModalCertificado}>📄 Certificado</button>
                </>
              )}
              
              <button className="lis-btn" onClick={abrirEdicionPeticion}>📝 Editar Demográficos</button>
              {rol === "admin_lab" && ( <button className="lis-btn" onClick={abrirModalUsuarios}>👥 Usuarios</button> )}
            </fieldset>
          </div>
        </div>
      </div>

      {/* MODALES REUTILIZABLES */}
      {showUsuarios && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#f0f0f0", border: "1px solid #999", width: "1000px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
            <div style={{ background: "#0ea5e9", color: "#fff", padding: "8px 12px", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
              <span>Gestión de Usuarios y Firmas Digitales</span>
              <button onClick={() => setShowUsuarios(false)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>X</button>
            </div>
            
            <div style={{ padding: "16px" }}>
              <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc", background: "#fff" }}>
                <table className="lis-table">
                  <colgroup>
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "180px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "180px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "40px" }} /> 
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Rol</th><th>Nombre</th><th>Correo</th><th>Cargo Oficial</th><th>Registro Senescyt</th><th style={{ textAlign: "center" }}>Firma Digital</th><th style={{ textAlign: "center" }}>🗑️</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaUsuarios.map(u => (
                      <tr key={u.id}>
                        <td style={{ color: "#666", fontSize: "10px", textTransform: "uppercase" }}>{u.rol}</td>
                        <td style={{ padding: 0 }}><input type="text" className="lis-input" style={{ width: "100%", height: "100%", margin: 0, borderRadius: 0, border: "none" }} defaultValue={u.nombre} onBlur={(e) => { if(e.target.value !== u.nombre) actualizarDatoUsuario(u.id, "nombre", e.target.value) }} /></td>
                        <td style={{ padding: 0 }}><input type="email" className="lis-input" style={{ width: "100%", height: "100%", margin: 0, borderRadius: 0, border: "none" }} defaultValue={u.correo || ""} onBlur={(e) => { if(e.target.value !== u.correo) actualizarDatoUsuario(u.id, "correo", e.target.value) }} /></td>
                        <td style={{ padding: 0 }}><input type="text" className="lis-input" style={{ width: "100%", height: "100%", margin: 0, borderRadius: 0, border: "none", color: "#0284c7", fontWeight: "bold" }} placeholder="Ej: QUÍMICO FARMACÉUTICO" defaultValue={u.cargo || ""} onBlur={(e) => { if(e.target.value !== u.cargo) actualizarDatoUsuario(u.id, "cargo", e.target.value) }} /></td>
                        <td style={{ padding: 0 }}><input type="text" className="lis-input" style={{ width: "100%", height: "100%", margin: 0, borderRadius: 0, border: "none" }} placeholder="Nº Registro" defaultValue={u.registro_senescyt || ""} onBlur={(e) => { if(e.target.value !== u.registro_senescyt) actualizarDatoUsuario(u.id, "registro_senescyt", e.target.value) }} /></td>
                        <td style={{ padding: "2px 4px", textAlign: "center", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                          {u.firma_path && u.firma_path !== 'firma.png' ? (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: "#16a34a", fontSize: "10px", fontWeight: "bold" }}>✅ En la Nube</span><button onClick={() => eliminarFirmaUsuario(u.id, u.firma_path)} style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "10px" }} title="Eliminar firma de la nube">❌</button></div>
                          ) : (<span style={{ color: "#dc2626", fontSize: "10px" }}>❌ Sin firma</span>)}
                          <input type="file" accept="image/png, image/jpeg" style={{ fontSize: "9px", width: "130px", overflow: "hidden" }} onChange={(e) => subirFirmaUsuario(u.id, e.target.files[0])} title="Subir nueva firma (Transparente recomendada)" />
                        </td>
                        <td style={{ textAlign: "center" }}><button onClick={() => eliminarUsuarioCompleto(u.id, u.nombre)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "14px" }}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <fieldset style={{ border: "1px solid #9ca3af", padding: "12px", marginTop: "20px", background: "#e5e7eb", borderRadius: "4px" }}>
                <legend style={{ fontSize: "12px", fontWeight: "bold", color: "#0369a1", padding: "0 6px" }}>➕ Añadir Nuevo Usuario</legend>
                <form onSubmit={crearNuevoUsuario} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1.5fr 1fr auto", gap: "10px", alignItems: "end" }}>
                  <div><label className="lis-input-label">Rol</label><select className="lis-input" style={{ width: "100%", height: "26px" }} value={nuevoUser.rol} onChange={e => setNuevoUser({...nuevoUser, rol: e.target.value})}><option value="laboratorista">Laboratorista</option><option value="admin_lab">Admin Lab</option></select></div>
                  <div><label className="lis-input-label">Nombre Apellido</label><input required className="lis-input" style={{ width: "100%", height: "26px" }} value={nuevoUser.nombre} onChange={e => setNuevoUser({...nuevoUser, nombre: e.target.value})} /></div>
                  <div><label className="lis-input-label">Correo (Login)</label><input required type="email" className="lis-input" style={{ width: "100%", height: "26px" }} value={nuevoUser.correo} onChange={e => setNuevoUser({...nuevoUser, correo: e.target.value})} /></div>
                  <div><label className="lis-input-label">Contraseña</label><input required type="password" minLength="6" className="lis-input" style={{ width: "100%", height: "26px" }} value={nuevoUser.password} onChange={e => setNuevoUser({...nuevoUser, password: e.target.value})} /></div>
                  <button type="submit" className="lis-btn" style={{ height: "26px", fontWeight: "bold", background: "#3b82f6", color: "white" }} disabled={procesandoUser}>Añadir</button>
                </form>
              </fieldset>
            </div>
            <div style={{ background: "#e5e7eb", padding: "10px", borderTop: "1px solid #ccc", display: "flex", justifyContent: "flex-end" }}>
              <button className="lis-btn" onClick={() => setShowUsuarios(false)}>Cerrar Panel</button>
            </div>
          </div>
        </div>
      )}

      {showNuevaPeticion && <PosMeson onClose={() => setShowNuevaPeticion(false)} onSuccess={cargarOrdenesPaginadasServidor} listaConvenios={listaConvenios} />}
      {showCobro && ordenCobro && <ModalCobro ordenCobro={ordenCobro} onClose={() => {setShowCobro(false); setOrdenCobro(null);}} onSuccess={cargarOrdenesPaginadasServidor} />}
      {ordenRegistro && <ModalEdicion ordenRegistro={ordenRegistro} onClose={() => setOrdenRegistro(null)} onSuccess={cargarOrdenesPaginadasServidor} listaConvenios={listaConvenios} />}
      {showBuscadorPaciente && <ModalBuscadorPaciente onClose={() => setShowBuscadorPaciente(false)} />}
      {showHojaTrabajo && <ModalHojaTrabajo isOpen={showHojaTrabajo} onClose={() => setShowHojaTrabajo(false)} ordenes={ordenes} areaActiva={areaActiva} filtroPrueba={"TODAS"} />}
      
      {/* 🚀 AQUÍ SE RENDERIZA EL NUEVO MODAL DEL CERTIFICADO */}
      {showCertificado && ordenCertificado && (
        <ModalCertificadoAsistencia 
          orden={ordenCertificado} 
          onClose={() => { setShowCertificado(false); setOrdenCertificado(null); }} 
        />
      )}
    </div>
  );
}