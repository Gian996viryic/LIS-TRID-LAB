import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";
import { saveAs } from 'file-saver';
import { generarPDFCotizacion } from "../utils/generadorCotizacionPDF";

import PosDemograficos from "./PosDemograficos";
import PosCarritoExamenes from "./PosCarritoExamenes";
import PosCajaCobro from "./PosCajaCobro";

function calcularEdad(fechaNacimientoJson) {
  if (!fechaNacimientoJson) return "";
  const hoy = new Date(); const cumpleanos = new Date(fechaNacimientoJson);
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const diferenciaMeses = hoy.getMonth() - cumpleanos.getMonth();
  if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < cumpleanos.getDate())) edad--; 
  return String(edad);
}

function calcularRangoIdeal(analitoBase, rangosAvanzados, pacienteSexo, pacienteEdadStr) {
  const fallback = { 
    rango_min: analitoBase.rango_min != null ? analitoBase.rango_min : null, 
    rango_max: analitoBase.rango_max != null ? analitoBase.rango_max : null, 
    rango_texto: analitoBase.rango_texto || null,
    unidad: analitoBase.unidad || null
  };

  if (!rangosAvanzados || rangosAvanzados.length === 0) return fallback;

  const edadNumAños = parseInt(pacienteEdadStr) || 0; 
  const edadEnDias = edadNumAños * 365;
  const sexoP = (pacienteSexo || "").toUpperCase(); 

  for (const rango of rangosAvanzados) {
    const sexoConfig = String(rango.sexo || "ALL").toUpperCase();
    
    const coincideSexo = 
      sexoConfig === "ALL" || sexoConfig.includes("UNIV") || sexoConfig.includes("AMBOS") || sexoConfig.includes("IND") || 
      (sexoP === "M" && (sexoConfig === "M" || sexoConfig.includes("HOMBRE") || sexoConfig.includes("MASC"))) ||
      (sexoP === "F" && (sexoConfig === "F" || sexoConfig.includes("MUJER") || sexoConfig.includes("FEM")));

    const eMin = parseInt(rango.edad_min_dias) || 0;
    const eMax = rango.edad_max_dias != null ? parseInt(rango.edad_max_dias) : 999999;
    const coincideEdad = edadEnDias >= eMin && edadEnDias <= eMax;

    if (coincideSexo && coincideEdad) {
      return {
        rango_min: rango.rango_min != null ? rango.rango_min : fallback.rango_min,
        rango_max: rango.rango_max != null ? rango.rango_max : fallback.rango_max,
        rango_texto: rango.rango_texto != null ? rango.rango_texto : fallback.rango_texto,
        unidad: rango.unidad != null ? rango.unidad : fallback.unidad
      };
    }
  }
  return fallback;
}

export default function PosMeson({ onClose, onSuccess, listaConvenios }) {
  const searchInputRef = useRef(null);
  const [codigoBusquedaCotizacion, setCodigoBusquedaCotizacion] = useState("");

  const [registroNombre, setRegistroNombre] = useState("");
  const [registroCedula, setRegistroCedula] = useState("");
  const [registroSexo, setRegistroSexo] = useState("N/A");
  const [registroEdad, setRegistroEdad] = useState("");
  const [registroFechaNacimiento, setRegistroFechaNacimiento] = useState("");
  const [registroTelefono, setRegistroTelefono] = useState(""); 
  const [registroCorreo, setRegistroCorreo] = useState(""); 
  
  const [registroDireccion, setRegistroDireccion] = useState("");
  const [registroCiudad, setRegistroCiudad] = useState("GUAYAQUIL");

  const [buscandoCedula, setBuscandoCedula] = useState(false);
  const [registroTipoOrden, setRegistroTipoOrden] = useState("RUTINA");
  const [registroProcedencia, setRegistroProcedencia] = useState("AMBULATORIO");
  const [registroCodigoConvenio, setRegistroCodigoConvenio] = useState("");
  const [nombreConvenio, setNombreConvenio] = useState("");
  const [registroDoctor, setRegistroDoctor] = useState("PARTICULAR");
  const [registroObservacion, setRegistroObservacion] = useState("");

  const [busquedaExamen, setBusquedaExamen] = useState("");
  const [resultadosExamenes, setResultadosExamenes] = useState([]);
  const [carritoExamenes, setCarritoExamenes] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [cuponInput, setCuponInput] = useState("");
  const [cuponAplicado, setCuponAplicado] = useState(null);
  const [estadoPago, setEstadoPago] = useState("PAGADO"); 
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [montoAbono, setMontoAbono] = useState("");

  async function buscarCotizacionGuardada(e) {
    if (e.key !== 'Enter' || !codigoBusquedaCotizacion.trim()) return;
    e.preventDefault();
    const toastId = toast.loading("Buscando cotización...");
    
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('code', codigoBusquedaCotizacion.trim().toUpperCase())
        .single();

      if (error || !data) throw new Error("Cotización no encontrada o expirada.");
      if (data.estado !== 'pendiente') throw new Error("Esta cotización ya fue procesada o está anulada.");

      if (data.cliente) {
        setRegistroNombre(data.cliente.nombre || data.paciente_nombre || "");
        setRegistroCedula(data.cliente.cedula || data.paciente_cedula || "");
        setRegistroEdad(data.cliente.edad || "");
        setRegistroSexo(data.cliente.sexo || "N/A");
        setRegistroCorreo(data.paciente_correo || "");
        setRegistroTelefono(data.cliente.telefono || "");
        setRegistroDoctor(data.cliente.doctor || "PARTICULAR");
        setRegistroDireccion(data.cliente.direccion || "");
        setRegistroCiudad(data.cliente.ciudad || "GUAYAQUIL");
        setRegistroProcedencia(data.cliente.procedencia || "AMBULATORIO");
      }

      if (data.items && Array.isArray(data.items)) {
        setCarritoExamenes(data.items);
      }

      if (data.cupon_code && data.cupon_code !== 'N/A' && data.cupon_code !== null) {
        const { data: cupData } = await supabase.from('cupones').select('*').eq('codigo', data.cupon_code).maybeSingle();
        if (cupData) {
          setCuponAplicado(cupData);
          setCuponInput(cupData.codigo);
        }
      }

      toast.success("¡Cotización cargada con éxito!", { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  }

  function handleFechaNacimientoChange(nuevaFecha) {
    setRegistroFechaNacimiento(nuevaFecha);
    if (nuevaFecha) setRegistroEdad(calcularEdad(nuevaFecha)); 
  }

  function handleProcedenciaChange(val) {
    setRegistroProcedencia(val);
    setRegistroCodigoConvenio("");
    setNombreConvenio("");
    setRegistroTelefono("");
    setRegistroCorreo("");
    setRegistroFechaNacimiento("");
  }

  function handleCodigoConvenioChange(val) {
    const valUpper = val.toUpperCase();
    setRegistroCodigoConvenio(valUpper);
    if (valUpper.length >= 3) {
      const match = listaConvenios.find(c => c.codigo_secreto?.toUpperCase() === valUpper);
      if (match) {
        setNombreConvenio(match.nombre);
        setRegistroTelefono(match.telefono || "");
        setRegistroCorreo(match.correo || "");
      } else {
        setNombreConvenio("❌ Inválido");
        setRegistroTelefono("");
        setRegistroCorreo("");
      }
    } else {
      setNombreConvenio("");
      setRegistroTelefono("");
      setRegistroCorreo("");
    }
  }

  useEffect(() => {
    if (registroCedula && registroCedula.trim().length === 10 && registroProcedencia === "AMBULATORIO") {
      cargarDatosPacienteRecurrente();
    }
  }, [registroCedula, registroProcedencia]);

  async function cargarDatosPacienteRecurrente() {
    // 👇 AHORA PEDIMOS DIRECCIÓN Y CIUDAD A LA BASE DE DATOS 👇
    const { data } = await supabase.from("lab_pacientes").select("nombre, sexo, fecha_nacimiento, telefono, correo, direccion, ciudad").eq("cedula", registroCedula.trim()).maybeSingle();
    if (data) {
      if (data.nombre) setRegistroNombre(data.nombre);
      if (data.sexo) setRegistroSexo(data.sexo);
      if (data.telefono) setRegistroTelefono(data.telefono);
      if (data.correo) setRegistroCorreo(data.correo);
      if (data.direccion) setRegistroDireccion(data.direccion); // <-- Se inyecta al estado
      if (data.ciudad) setRegistroCiudad(data.ciudad);          // <-- Se inyecta al estado
      if (data.fecha_nacimiento) {
        setRegistroFechaNacimiento(data.fecha_nacimiento);
        setRegistroEdad(calcularEdad(data.fecha_nacimiento));
      }
    }
  }

  async function consultarRegistroCivil() {
    const ced = registroCedula.trim();
    if (ced.length !== 10) return toast.error("La cédula debe tener exactamente 10 dígitos.");
    setBuscandoCedula(true); const toastId = toast.loading("Consultando Cédula...");
    try {
      const { data, error } = await supabase.functions.invoke("consultar-cedula", { body: { cedula: ced }, headers: { 'x-app-secreto': 'TridLab_Seguridad_2026_XyZ' } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      const info = data?.data || data; if (info.success === false) throw new Error(info.message || "Cédula no encontrada.");
      if (info.nombre) setRegistroNombre(info.nombre); 
      
      if (info.fechaNacimiento) { 
        const partes = String(info.fechaNacimiento).split('/'); 
        if (partes.length === 3) {
          const dateFormated = `${partes[2]}-${partes[1]}-${partes[0]}`;
          setRegistroFechaNacimiento(dateFormated);
          setRegistroEdad(calcularEdad(dateFormated));
        } 
      }
      if (info.genero) { const gen = String(info.genero).toUpperCase(); if (gen.includes("HOMBRE") || gen.includes("MASCULINO")) setRegistroSexo("M"); else if (gen.includes("MUJER") || gen.includes("FEMENINO")) setRegistroSexo("F"); }
      toast.success("Datos obtenidos", { id: toastId });
    } catch (e) { toast.error("Error: Complete manualmente", { id: toastId }); } finally { setBuscandoCedula(false); }
  }

  const { subtotal, descuento, total } = useMemo(() => {
    let sub = 0; let desc = 0;
    carritoExamenes.forEach(ex => {
      const pNormal = Number(ex.precio_normal || 0); sub += pNormal;
      if (cuponAplicado && cuponAplicado.tipo === 'convenio') {
        const pConv = Number(ex.precio_convenio || pNormal); desc += (pNormal - pConv);
      }
    });
    if (cuponAplicado && cuponAplicado.tipo !== 'convenio') desc = sub * (Number(cuponAplicado.porcentaje || 0) / 100);
    return { subtotal: sub, descuento: desc, total: sub - desc };
  }, [carritoExamenes, cuponAplicado]);

  const saldoPendiente = estadoPago === "ABONO" ? (total - Number(montoAbono || 0)) : (estadoPago === "PAGADO" ? 0 : total);

  useEffect(() => {
    if(busquedaExamen.length < 2) { 
      setResultadosExamenes([]); 
      setHighlightedIndex(-1); 
      return; 
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('examenes')
        .select('id, codigo, articulo, precio_normal, precio_convenio, orden_impresion, lab_areas(nombre)')
        .or(`articulo.ilike.%${busquedaExamen}%,codigo.ilike.%${busquedaExamen}%`) 
        .eq('activo', true)
        .limit(15); 
        
      setResultadosExamenes(data || []);
      setHighlightedIndex(-1); 
    }, 400);
    return () => clearTimeout(timer);
  }, [busquedaExamen]);

  async function aplicarCupon() {
    if (!cuponInput) return;
    const toastId = toast.loading("Validando cupón...");
    const { data, error } = await supabase.from('cupones').select('*').eq('codigo', cuponInput.toUpperCase()).eq('activo', true).single();
    if (error || !data) { toast.error("Cupón inválido", { id: toastId }); setCuponAplicado(null); return; }
    if (data.vence_en && new Date(data.vence_en) < new Date()) return toast.error("Cupón expirado", { id: toastId }); 
    if (data.usos_max && data.usos_count >= data.usos_max) return toast.error("Límite de uso alcanzado", { id: toastId }); 
    setCuponAplicado(data);
    toast.success(data.tipo === 'convenio' ? "¡Precios de convenio activados!" : `¡Cupón del ${data.porcentaje}% aplicado!`, { id: toastId });
  }

  async function fetchExamenPorCodigo(codigoBuscado) {
    const { data } = await supabase.from('examenes').select('id, codigo, articulo, precio_normal, precio_convenio, orden_impresion, lab_areas(nombre)').eq('codigo', codigoBuscado).eq('activo', true).limit(1);
    return data && data.length > 0 ? data[0] : null;
  }

  async function agregarExamenAlCarrito(ex) {
    if(carritoExamenes.find(item => item.id === ex.id)) {
       toast.error("Ya está en la lista.");
       setTimeout(() => searchInputRef.current?.focus(), 10);
       return;
    }

    let nuevosExamenes = [...carritoExamenes];
    let toastMensaje = "";

    if (ex.codigo === 'PTF') {
      const teniaAlbGlob = nuevosExamenes.some(i => i.codigo === 'ALB' || i.codigo === 'GBL');
      nuevosExamenes = nuevosExamenes.filter(item => item.codigo !== 'ALB' && item.codigo !== 'GBL');
      if (teniaAlbGlob) toastMensaje = "PTF añadido. Se removió Albúmina/Globulina (ya incluidas).";
    }
    if ((ex.codigo === 'ALB' || ex.codigo === 'GBL') && nuevosExamenes.some(item => item.codigo === 'PTF')) {
      toast.error(`Bloqueado: Ya tienes el perfil completo PTF en la orden.`, { icon: "🛡️" });
      return;
    }
    if (ex.codigo === 'HI') {
      const teniaInsulina = nuevosExamenes.some(i => i.codigo === 'INSL');
      nuevosExamenes = nuevosExamenes.filter(item => item.codigo !== 'INSL');
      if (teniaInsulina) toastMensaje = "HI añadido. Se removió Insulina Basal.";
      if (!nuevosExamenes.some(item => item.codigo === 'GL')) {
        const glData = await fetchExamenPorCodigo('GL');
        if (glData) { nuevosExamenes.push(glData); toastMensaje = "HI añadido. Se auto-incluyó Glucosa (Necesaria para el cálculo)."; }
      }
    }
    if (ex.codigo === 'INSL' && nuevosExamenes.some(item => item.codigo === 'HI')) {
      toast.error(`Bloqueado: Ya tienes el perfil HOMA-IR.`, { icon: "🛡️" });
      return;
    }
    if (ex.codigo === 'ROMA') { 
      const teniaHe4 = nuevosExamenes.some(i => i.codigo === 'HE-4');
      nuevosExamenes = nuevosExamenes.filter(item => item.codigo !== 'HE-4');
      if (teniaHe4) toastMensaje = "ROMA añadido. Se removió HE-4 individual.";
      if (!nuevosExamenes.some(item => item.codigo === 'CA125')) {
        const caData = await fetchExamenPorCodigo('CA125');
        if (caData) { nuevosExamenes.push(caData); toastMensaje = "Índice ROMA añadido. Se auto-incluyó marcador CA 125."; }
      }
    }
    if (ex.codigo === 'HE-4' && nuevosExamenes.some(item => item.codigo === 'ROMA')) {
      toast.error(`Bloqueado: Ya tienes el perfil Índice ROMA.`, { icon: "🛡️" });
      return;
    }
    if (ex.codigo === 'UDC') { 
      let agregadosStr = [];
      if (!nuevosExamenes.some(item => item.codigo === 'CRT')) {
        const crtData = await fetchExamenPorCodigo('CRT');
        if (crtData) { nuevosExamenes.push(crtData); agregadosStr.push("Creatinina (Suero)"); }
      }
      if (!nuevosExamenes.some(item => item.codigo === 'UC24H')) {
        const ucData = await fetchExamenPorCodigo('UC24H');
        if (ucData) { nuevosExamenes.push(ucData); agregadosStr.push("Creatinina en Orina 24H"); }
      }
      if (agregadosStr.length > 0) toastMensaje = `Depuración añadida. Se auto-incluyó: ${agregadosStr.join(" y ")} (Necesarios para el cálculo).`;
    }

    nuevosExamenes.push(ex);
    setCarritoExamenes(nuevosExamenes); 
    setBusquedaExamen(""); 
    setResultadosExamenes([]);
    setHighlightedIndex(-1);
    if (toastMensaje) toast.success(toastMensaje, { icon: "🧠", duration: 4000 });
    setTimeout(() => { searchInputRef.current?.focus(); }, 10);
  }

  function eliminarDelCarrito(id) {
    setCarritoExamenes(carritoExamenes.filter(item => item.id !== id));
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      if (resultadosExamenes.length > 0 && highlightedIndex >= 0 && highlightedIndex < resultadosExamenes.length) {
        agregarExamenAlCarrito(resultadosExamenes[highlightedIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < resultadosExamenes.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    }
  }

  async function generarCotizacionPDF() {
    if (carritoExamenes.length === 0) return toast.error("Agregue al menos un examen a la cotización.");
    if (!registroNombre.trim()) return toast.error("Se requiere al menos el nombre del paciente.");

    const toastId = toast.loading("Generando y guardando cotización...");
    try {
      const codigoSecuencial = `TRD-${Math.floor(10000 + Math.random() * 90000)}`;
      const fechaActual = new Date();
      const fechaValidez = new Date(fechaActual);
      fechaValidez.setDate(fechaValidez.getDate() + 7);
      const tokenSeguridad = crypto.randomUUID();

      const datosPDF = {
        codigo: codigoSecuencial,
        fecha: fechaActual.toLocaleDateString('es-EC'),
        validoHasta: fechaValidez.toLocaleDateString('es-EC'),
        verifyToken: tokenSeguridad,
        paciente: {
          nombre: registroNombre,
          cedula: registroCedula,
          edad: registroEdad,
          sexo: registroSexo,
          correo: registroCorreo,
          telefono: registroTelefono,
          procedencia: registroProcedencia,
          doctor: registroDoctor,
          direccion: registroDireccion,
          ciudad: registroCiudad
        },
        examenes: carritoExamenes.map(ex => {
          const pNormal = Number(ex.precio_normal || 0);
          const pFinal = (cuponAplicado && cuponAplicado.tipo === 'convenio') ? Number(ex.precio_convenio || pNormal) : pNormal;
          return { ...ex, precioFinal: pFinal };
        }),
        subtotal: subtotal,
        iva: 0,
        total: total,
        cuponMode: cuponAplicado ? cuponAplicado.tipo : "none",
        descuento: descuento,
        totalNormal: subtotal
      };

      const pdfBlob = await generarPDFCotizacion(datosPDF);
      const fileName = `${codigoSecuencial}_${Date.now()}.pdf`;
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('cotizaciones').upload(fileName, pdfBlob, { contentType: 'application/pdf' });
      if (uploadErr) throw uploadErr;

      const publicURL = supabase.storage.from('cotizaciones').getPublicUrl(fileName).data.publicUrl;

      const { error: dbError } = await supabase.from('cotizaciones').insert([{
        code: codigoSecuencial, cotizacion_no: codigoSecuencial, paciente_nombre: registroNombre, paciente_cedula: registroCedula, paciente_correo: registroCorreo || "N/A",
        estado: 'pendiente', pagada: false, total: total, subtotal: subtotal, total_normal: subtotal, descuento: descuento, cupon_code: cuponAplicado ? cuponAplicado.codigo : null, cupon_mode: cuponAplicado ? cuponAplicado.tipo : "N/A",
        cliente: datosPDF.paciente, items: carritoExamenes, pdf_path: uploadData.path, storage_path: publicURL, created_at_client: fechaActual.toISOString(), verify_token: tokenSeguridad, sha256: "N/A"
      }]);

      if (dbError) throw dbError;
      saveAs(pdfBlob, `Cotizacion_${codigoSecuencial}.pdf`);
      toast.success("¡Cotización guardada exitosamente!", { id: toastId });
      onClose();
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  }

  async function guardarNuevaPeticion(e) {
    e.preventDefault();
    if (carritoExamenes.length === 0) return toast.error("Agregue al menos un examen.");
    if (registroProcedencia === "CONVENIO" && (!nombreConvenio || nombreConvenio.includes("❌"))) return toast.error("Código de convenio inválido.");
    if (estadoPago === "ABONO" && (!montoAbono || Number(montoAbono) <= 0 || Number(montoAbono) >= total)) return toast.error("Monto de abono inválido.");

    const toastId = toast.loading("Procesando facturación y peticiones...");
    try {
      if (registroProcedencia === "AMBULATORIO") {
        const cedulaLimpia = registroCedula.trim();
        if (cedulaLimpia && cedulaLimpia.length >= 10 && cedulaLimpia !== "9999999999") {
          const { data: pacienteExistente, error: errExistencia } = await supabase.from('lab_pacientes').select('cedula, telefono, correo').eq('cedula', cedulaLimpia).maybeSingle();
          if (!pacienteExistente && !errExistencia) {
            const pinAleatorio = Math.floor(100000 + Math.random() * 900000).toString(); 
            // 👇 AHORA SE GUARDAN DIRECCIÓN Y CIUDAD AL CREAR 👇
            const payloadPaciente = { 
              cedula: cedulaLimpia, nombre: registroNombre.trim().toUpperCase(), sexo: registroSexo === "N/A" ? null : registroSexo, 
              pin_secreto: pinAleatorio, telefono: registroTelefono?.trim() || null, correo: registroCorreo?.trim() || null, 
              fecha_nacimiento: registroFechaNacimiento || null, direccion: registroDireccion?.trim().toUpperCase() || null, ciudad: registroCiudad?.trim().toUpperCase() || "GUAYAQUIL" 
            };
            const { error: errPac } = await supabase.from('lab_pacientes').insert([payloadPaciente]);
            if (errPac) console.error("Error al registrar paciente web:", errPac);
          } else if (pacienteExistente) {
            // 👇 AHORA SE ACTUALIZAN DIRECCIÓN Y CIUDAD AL EDITAR 👇
            const updates = { 
              nombre: registroNombre.trim().toUpperCase(), sexo: registroSexo === "N/A" ? null : registroSexo, 
              fecha_nacimiento: registroFechaNacimiento || null, direccion: registroDireccion?.trim().toUpperCase() || null, ciudad: registroCiudad?.trim().toUpperCase() || "GUAYAQUIL" 
            };
            const tNuevo = registroTelefono?.trim();
            const cNuevo = registroCorreo?.trim();
            if (tNuevo && tNuevo !== pacienteExistente.telefono) {
               if (pacienteExistente.telefono && pacienteExistente.telefono.trim() !== "") {
                  if (window.confirm(`El paciente ya tiene registrado el WhatsApp: ${pacienteExistente.telefono}.\n¿Deseas reemplazarlo por: ${tNuevo}?`)) updates.telefono = tNuevo;
                  else updates.telefono = pacienteExistente.telefono;
               } else updates.telefono = tNuevo; 
            }
            if (cNuevo && cNuevo !== pacienteExistente.correo) {
               if (pacienteExistente.correo && pacienteExistente.correo.trim() !== "") {
                  if (window.confirm(`El paciente ya tiene registrado el Correo: ${pacienteExistente.correo}.\n¿Deseas reemplazarlo por: ${cNuevo}?`)) updates.correo = cNuevo;
                  else updates.correo = pacienteExistente.correo;
               } else updates.correo = cNuevo; 
            }
            await supabase.from('lab_pacientes').update(updates).eq('cedula', cedulaLimpia);
          }
        }
      }

      const now = new Date();
      const prefixDate = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const { data: lastCot } = await supabase.from('cotizaciones').select('cotizacion_no').like('cotizacion_no', `${prefixDate}%`).order('created_at', { ascending: false }).limit(1);
      let nextSeq = 10001; 
      if (lastCot && lastCot.length > 0 && lastCot[0].cotizacion_no) { 
        const last5 = lastCot[0].cotizacion_no.slice(-5); 
        if(!isNaN(last5)) nextSeq = parseInt(last5, 10) + 1; 
      }
      
      const codigoSecuencial = `${prefixDate}${nextSeq}`;
      const valorAbono = estadoPago === 'ABONO' ? Number(montoAbono) : (estadoPago === 'PAGADO' ? total : 0);

      const payloadCotizacion = {
        cotizacion_no: codigoSecuencial, paciente_nombre: registroNombre, paciente_cedula: registroCedula, paciente_correo: "N/A", total: total, subtotal: subtotal, total_normal: subtotal, descuento: descuento, cupon_code: cuponAplicado ? cuponAplicado.codigo : null, cupon_mode: cuponAplicado ? cuponAplicado.tipo : "N/A",
        pagada: estadoPago === 'PAGADO' || estadoPago === 'ABONO', estado: estadoPago !== 'PENDIENTE' ? 'pagada' : 'pendiente', metodo_pago: estadoPago !== 'PENDIENTE' ? metodoPago : null, items: carritoExamenes,
        fecha_pago: estadoPago !== 'PENDIENTE' ? new Date().toISOString() : null, abono: valorAbono, storage_path: "MESON_DIRECTO", verify_token: crypto.randomUUID(), code: codigoSecuencial, pdf_path: "PENDIENTE", sha256: "N/A", cliente: { origen: "MESON" },
        created_at_client: new Date().toISOString(), referencia_pago: "N/A", comprobante_path: "N/A", comprobante_url: "N/A"
      };

      const { data: cotizacionData, error: errCot } = await supabase.from('cotizaciones').insert([payloadCotizacion]).select().single();
      if (errCot) throw errCot;
      if (cuponAplicado) await supabase.rpc('increment_coupon_usage', { p_codigo: cuponAplicado.codigo });

      const payloadOrden = {
        codigo_orden: codigoSecuencial, cotizacion_id: cotizacionData.id, codigo_cotizacion: codigoSecuencial, paciente_nombre: registroNombre, paciente_cedula: registroCedula, paciente_sexo: registroSexo,
        paciente_edad: registroEdad || null, paciente_telefono: registroTelefono || null, paciente_correo: registroCorreo || null, tipo_paciente: registroTipoOrden, procedencia: registroProcedencia === "CONVENIO" ? nombreConvenio : "AMBULATORIO",
        solicitado_por: registroDoctor, observacion_interna: registroObservacion, estado: "en_proceso", estado_validacion: "pendiente", tipo_muestra: "SANGRE" 
      };

      const { data: ordenCreada, error: errOrden } = await supabase.from("lab_ordenes").insert([payloadOrden]).select().single();
      if (errOrden) throw errOrden;

      const payloadExamenes = carritoExamenes.map(ex => ({
        orden_id: ordenCreada.id, examen_id: ex.id, codigo_examen: ex.codigo, nombre_examen: ex.articulo,
        precio: (cuponAplicado && cuponAplicado.tipo === 'convenio') ? Number(ex.precio_convenio || ex.precio_normal) : Number(ex.precio_normal), orden_visual: ex.orden_impresion || 999
      }));

      const { data: ordExData, error: errOrdEx } = await supabase.from('lab_orden_examenes').insert(payloadExamenes).select();
      if (errOrdEx) throw errOrdEx;

      const { data: analitosData, error: errAnalitos } = await supabase.from('lab_catalogo_analitos').select('id, examen_id, nombre_analito, unidad, orden_visual').in('examen_id', carritoExamenes.map(e => e.id)).eq('activo', true);
      if (errAnalitos) throw errAnalitos;

      let rangosAvanzadosTodos = [];
      try {
        const { data: rangosData, error: errRangos } = await supabase.from('lab_rangos_referencia').select('analito_id, sexo, edad_min_dias, edad_max_dias, rango_min, rango_max, rango_texto, unidad').in('analito_id', analitosData.map(a => a.id)).eq('activo', true);
        if (!errRangos && rangosData) rangosAvanzadosTodos = rangosData;
      } catch (e) {}

      if (analitosData && analitosData.length > 0) {
        const payloadResultados = analitosData.map(analito => {
          const exPadre = carritoExamenes.find(e => e.id === analito.examen_id); 
          const regExamen = ordExData.find(oe => oe.examen_id === analito.examen_id);
          const rangosDeEsteAnalito = rangosAvanzadosTodos.filter(r => r.analito_id === analito.id);
          const rangoIdeal = calcularRangoIdeal(analito, rangosDeEsteAnalito, registroSexo, registroEdad);

          return {
             orden_id: ordenCreada.id, orden_examen_id: regExamen ? regExamen.id : null, examen_id: analito.examen_id, analito_id: analito.id, codigo_examen: exPadre?.codigo, nombre_examen: exPadre?.articulo,
             nombre_analito: analito.nombre_analito, unidad: rangoIdeal.unidad, rango_min: rangoIdeal.rango_min, rango_max: rangoIdeal.rango_max, rango_texto: rangoIdeal.rango_texto,
             grupo_nombre: Array.isArray(exPadre?.lab_areas) ? exPadre.lab_areas[0]?.nombre : (exPadre?.lab_areas?.nombre || 'OTROS'), orden_visual: analito.orden_visual, validado: false, mostrar_en_reporte: true
          };
        });
        const { error: errRes } = await supabase.from('lab_orden_resultados').insert(payloadResultados);
        if (errRes) throw errRes;
      }
      
      if (codigoBusquedaCotizacion.trim()) {
        await supabase.from('cotizaciones').update({ estado: 'procesada' }).eq('code', codigoBusquedaCotizacion.trim().toUpperCase());
      }

      toast.success(`¡Orden generada!`, { id: toastId }); onSuccess(); onClose();
    } catch (error) { toast.error("Error al procesar: " + error.message, { id: toastId }); }
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#f0f0f0", border: "1px solid #999", width: "1050px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>
        
        <div style={{ background: "#0f172a", color: "#fff", padding: "6px 16px", fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🛒 Punto de Venta (Recepción)</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
             <span style={{ fontSize: "11px", color: "#94a3b8" }}>Cargar Cotización:</span>
             <input 
                type="text" 
                placeholder="Ej: TRD-10036 + Enter"
                value={codigoBusquedaCotizacion}
                onChange={(e) => setCodigoBusquedaCotizacion(e.target.value)}
                onKeyDown={buscarCotizacionGuardada}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "none", fontSize: "11px", width: "160px", outline: "none", color: "#0f172a" }}
             />
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>✕</button>
        </div>

        <form onSubmit={guardarNuevaPeticion}>
          <div style={{ padding: "16px", display: "flex", gap: "15px" }}>
            
            <PosDemograficos 
              registroCedula={registroCedula} setRegistroCedula={setRegistroCedula} buscandoCedula={buscandoCedula} consultarRegistroCivil={consultarRegistroCivil}
              registroNombre={registroNombre} setRegistroNombre={setRegistroNombre} registroSexo={registroSexo} setRegistroSexo={setRegistroSexo}
              registroFechaNacimiento={registroFechaNacimiento} handleFechaNacimientoChange={handleFechaNacimientoChange} registroEdad={registroEdad} setRegistroEdad={setRegistroEdad}
              registroTelefono={registroTelefono} setRegistroTelefono={setRegistroTelefono} registroCorreo={registroCorreo} setRegistroCorreo={setRegistroCorreo}
              registroTipoOrden={registroTipoOrden} setRegistroTipoOrden={setRegistroTipoOrden} registroProcedencia={registroProcedencia} handleProcedenciaChange={handleProcedenciaChange}
              registroCodigoConvenio={registroCodigoConvenio} handleCodigoConvenioChange={handleCodigoConvenioChange} nombreConvenio={nombreConvenio}
              listaConvenios={listaConvenios} registroDoctor={registroDoctor} setRegistroDoctor={setRegistroDoctor} registroObservacion={registroObservacion} setRegistroObservacion={setRegistroObservacion}
              registroDireccion={registroDireccion} setRegistroDireccion={setRegistroDireccion} 
              registroCiudad={registroCiudad} setRegistroCiudad={setRegistroCiudad}             
            />

            <div style={{ flex: "1 1 55%", display: "flex", flexDirection: "column" }}>
              <fieldset style={{ border: "1px solid #16a34a", padding: "12px", flex: 1, borderRadius: "4px", display: "flex", flexDirection: "column", background: "#f0fdf4" }}>
                <legend style={{ color: "#16a34a", fontWeight: "bold", padding: "0 4px" }}>🛒 Caja y Exámenes</legend>
                
                <PosCarritoExamenes 
                  searchInputRef={searchInputRef} busquedaExamen={busquedaExamen} setBusquedaExamen={setBusquedaExamen} handleSearchKeyDown={handleSearchKeyDown}
                  resultadosExamenes={resultadosExamenes} highlightedIndex={highlightedIndex} setHighlightedIndex={setHighlightedIndex} agregarExamenAlCarrito={agregarExamenAlCarrito}
                  carritoExamenes={carritoExamenes} cuponAplicado={cuponAplicado} eliminarDelCarrito={eliminarDelCarrito}
                />

                <PosCajaCobro 
                  cuponInput={cuponInput} setCuponInput={setCuponInput} cuponAplicado={cuponAplicado} setCuponAplicado={setCuponAplicado} aplicarCupon={aplicarCupon}
                  subtotal={subtotal} descuento={descuento} total={total} estadoPago={estadoPago} setEstadoPago={setEstadoPago} metodoPago={metodoPago} setMetodoPago={setMetodoPago}
                  montoAbono={montoAbono} setMontoAbono={setMontoAbono} saldoPendiente={saldoPendiente}
                />
              </fieldset>
            </div>
          </div>

          <div style={{ background: "#e5e7eb", padding: "12px 16px", borderTop: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <button type="button" onClick={generarCotizacionPDF} style={{ fontWeight: "bold", border: "1px dashed #0284c7", color: "#0284c7", background: "white", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", transition: "0.2s" }} onMouseOver={e=>e.target.style.background="#f0f9ff"} onMouseOut={e=>e.target.style.background="white"}>
               📄 Guardar Solo Cotización (PDF)
            </button>
            <div style={{ display: "flex", gap: "10px" }}>
               <button type="button" style={{ background: "transparent", border: "1px solid #9ca3af", padding: "8px 16px", borderRadius: "4px", cursor: "pointer" }} onClick={onClose}>Cancelar</button>
               <button type="submit" style={{ fontWeight: "bold", border: "none", color: "white", background: "#10b981", padding: "8px 20px", borderRadius: "4px", cursor: "pointer", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)" }}>
                 ✅ Cobrar e Inyectar Petición
               </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}