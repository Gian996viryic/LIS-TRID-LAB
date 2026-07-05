import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";

function calcularEdad(fechaNacimientoJson) {
  if (!fechaNacimientoJson) return "";
  const hoy = new Date(); const cumpleanos = new Date(fechaNacimientoJson);
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const diferenciaMeses = hoy.getMonth() - cumpleanos.getMonth();
  if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < cumpleanos.getDate())) edad--; 
  return String(edad);
}

export default function ModalEdicion({ ordenRegistro, onClose, onSuccess, listaConvenios }) {
  const [registroNombre, setRegistroNombre] = useState(ordenRegistro.paciente_nombre || "");
  const [registroCedula, setRegistroCedula] = useState(ordenRegistro.paciente_cedula || "");
  const [registroSexo, setRegistroSexo] = useState(ordenRegistro.paciente_sexo || "N/A");
  const [registroEdad, setRegistroEdad] = useState(ordenRegistro.paciente_edad || "");
  const [registroFechaNacimiento, setRegistroFechaNacimiento] = useState("");
  const [registroTelefono, setRegistroTelefono] = useState(ordenRegistro.paciente_telefono || ""); 
  const [registroCorreo, setRegistroCorreo] = useState(ordenRegistro.paciente_correo || ""); 
  
  const [registroTipoOrden, setRegistroTipoOrden] = useState(ordenRegistro.tipo_paciente || "RUTINA");
  const [registroDoctor, setRegistroDoctor] = useState(ordenRegistro.solicitado_por || "PARTICULAR");
  const [registroObservacion, setRegistroObservacion] = useState(ordenRegistro.observacion_interna || "");
  
  const esConvenioInicial = ordenRegistro.procedencia && ordenRegistro.procedencia.toUpperCase() !== "AMBULATORIO";
  const [registroProcedencia, setRegistroProcedencia] = useState(esConvenioInicial ? "CONVENIO" : "AMBULATORIO");
  const [nombreConvenio, setNombreConvenio] = useState(esConvenioInicial ? ordenRegistro.procedencia : "");
  const [registroCodigoConvenio, setRegistroCodigoConvenio] = useState("");
  
  const [buscandoCedula, setBuscandoCedula] = useState(false);

  // 🚀 AUTOCARGA INTEGRAL DESDE LA BASE MAESTRA DE PACIENTES
  useEffect(() => {
    if (registroCedula && registroCedula.trim().length === 10 && registroProcedencia === "AMBULATORIO") {
      cargarDatosPacienteBase();
    }
  }, [registroCedula, registroProcedencia]);

  async function cargarDatosPacienteBase() {
    const { data } = await supabase
      .from("lab_pacientes")
      .select("fecha_nacimiento, telefono, correo, nombre, sexo")
      .eq("cedula", registroCedula.trim())
      .maybeSingle();
      
    if (data) {
      // Determinar si la cédula en pantalla coincide con la original de la orden
      const esMismoPaciente = registroCedula.trim() === (ordenRegistro.paciente_cedula || "").trim();

      if (data.fecha_nacimiento) {
        setRegistroFechaNacimiento(data.fecha_nacimiento);
        setRegistroEdad(calcularEdad(data.fecha_nacimiento));
      }

      if (!esMismoPaciente) {
        // 🚀 Si están cambiando de cédula, cargamos TODO lo del nuevo paciente en pantalla
        if (data.nombre) setRegistroNombre(data.nombre);
        if (data.sexo) setRegistroSexo(data.sexo);
        if (data.telefono) setRegistroTelefono(data.telefono);
        if (data.correo) setRegistroCorreo(data.correo);
      } else {
        // 🚀 Si es el mismo paciente, rellenamos únicamente lo que falte (sin machacar datos de la orden)
        if (!registroNombre && data.nombre) setRegistroNombre(data.nombre);
        if (registroSexo === "N/A" && data.sexo) setRegistroSexo(data.sexo);
        if (!registroTelefono && data.telefono) setRegistroTelefono(data.telefono);
        if (!registroCorreo && data.correo) setRegistroCorreo(data.correo);
      }
    }
  }

  async function consultarRegistroCivil() {
    const ced = registroCedula.trim();
    if (ced.length !== 10) return toast.error("La cédula debe tener exactamente 10 dígitos.");
    
    setBuscandoCedula(true);
    const toastId = toast.loading("Consultando Cédula...");
    try {
      const { data, error } = await supabase.functions.invoke("consultar-cedula", { 
        body: { cedula: ced }, headers: { 'x-app-secreto': 'TridLab_Seguridad_2026_XyZ' } 
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const info = data?.data || data;
      if (info.success === false) throw new Error(info.message || "Cédula no encontrada.");

      if (info.nombre) setRegistroNombre(info.nombre); 
      
      if (info.fechaNacimiento) {
        const partes = String(info.fechaNacimiento).split('/'); 
        if (partes.length === 3) {
          const dateFormated = `${partes[2]}-${partes[1]}-${partes[0]}`; 
          setRegistroFechaNacimiento(dateFormated);
          setRegistroEdad(calcularEdad(dateFormated));
        }
      }
      if (info.genero) {
        const gen = String(info.genero).toUpperCase();
        if (gen.includes("HOMBRE") || gen.includes("MASCULINO")) setRegistroSexo("M");
        else if (gen.includes("MUJER") || gen.includes("FEMENINO")) setRegistroSexo("F");
      }
      toast.success("Datos obtenidos", { id: toastId });
    } catch (e) {
      toast.error("Error: Complete manualmente", { id: toastId });
    } finally { setBuscandoCedula(false); }
  }

  async function guardarEdicionDemograficos(e) {
    e.preventDefault();
    if (registroProcedencia === "CONVENIO" && (!nombreConvenio || nombreConvenio.includes("❌"))) return toast.error("Código de convenio inválido.");
    
    const payload = {
      paciente_nombre: registroNombre, paciente_cedula: registroCedula, paciente_sexo: registroSexo,
      paciente_edad: registroEdad || null, paciente_telefono: registroTelefono || null, 
      paciente_correo: registroCorreo || null, 
      tipo_paciente: registroTipoOrden,
      procedencia: registroProcedencia === "CONVENIO" ? nombreConvenio : "AMBULATORIO",
      solicitado_por: registroDoctor, observacion_interna: registroObservacion,
    };

    const toastId = toast.loading("Actualizando datos...");
    
    // PASO 1: Actualizar la orden actual
    const { error } = await supabase.from("lab_ordenes").update(payload).eq("id", ordenRegistro.id);
    
    if (error) {
      toast.error("Error: " + error.message, { id: toastId });
      return;
    }

    // PASO 2: Sincronización Inteligente de Pacientes (Solo si es Ambulatorio)
    try {
      if (registroProcedencia === "AMBULATORIO" && registroCedula && registroCedula.trim() !== "" && registroCedula.trim() !== "9999999999") {
        const cedulaClean = registroCedula.trim();
        
        const { data: pacienteExistente } = await supabase
          .from("lab_pacientes")
          .select("cedula, telefono, correo")
          .eq("cedula", cedulaClean)
          .maybeSingle();

        if (pacienteExistente) {
          let telefonoFinal = pacienteExistente.telefono;
          let correoFinal = pacienteExistente.correo;
          
          const tNuevo = registroTelefono?.trim();
          const cNuevo = registroCorreo?.trim();

          if (tNuevo && tNuevo !== pacienteExistente.telefono) {
            if (pacienteExistente.telefono && pacienteExistente.telefono.trim() !== "") {
              if (window.confirm(`El paciente ya tiene registrado el WhatsApp: ${pacienteExistente.telefono}.\n¿Deseas reemplazarlo por: ${tNuevo}?`)) telefonoFinal = tNuevo;
            } else { telefonoFinal = tNuevo; }
          }

          if (cNuevo && cNuevo !== pacienteExistente.correo) {
            if (pacienteExistente.correo && pacienteExistente.correo.trim() !== "") {
              if (window.confirm(`El paciente ya tiene registrado el Correo: ${pacienteExistente.correo}.\n¿Deseas reemplazarlo por: ${cNuevo}?`)) correoFinal = cNuevo;
            } else { correoFinal = cNuevo; }
          }

          await supabase
            .from("lab_pacientes")
            .update({
              nombre: registroNombre.trim(),
              sexo: registroSexo !== "N/A" ? registroSexo : null,
              telefono: telefonoFinal || null,
              correo: correoFinal || null,
              fecha_nacimiento: registroFechaNacimiento || null
            })
            .eq("cedula", cedulaClean);
        } else {
          const nuevoPin = Math.floor(100000 + Math.random() * 900000).toString();
          await supabase
            .from("lab_pacientes")
            .insert({
              cedula: cedulaClean,
              nombre: registroNombre.trim(),
              sexo: registroSexo !== "N/A" ? registroSexo : null,
              pin_secreto: nuevoPin,
              telefono: registroTelefono?.trim() || null,
              correo: registroCorreo?.trim() || null,
              fecha_nacimiento: registroFechaNacimiento || null
            });
        }
      }
      
      toast.success("Petición actualizada", { id: toastId }); 
      onSuccess(); 
      onClose();
    } catch (err) {
      toast.success("Orden guardada (Sin sincronizar perfil)", { id: toastId });
      onSuccess(); 
      onClose();
    }
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#f0f0f0", border: "1px solid #999", width: "850px", boxShadow: "0 4px 10px rgba(0,0,0,0.3)", margin: "auto" }}>
        <div style={{ background: "#0ea5e9", color: "#fff", padding: "6px 10px", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
          <span>📝 Edición de Demográficos - {ordenRegistro.codigo_orden}</span>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>X</button>
        </div>
        <form onSubmit={guardarEdicionDemograficos}>
          <div style={{ padding: "16px" }}>
            <fieldset style={{ border: "1px solid #a3a3a3", padding: "12px", marginBottom: "16px", borderRadius: "4px" }}>
              <legend style={{ color: "#0369a1", fontWeight: "bold", padding: "0 4px" }}>Datos Demográficos</legend>
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "15px", alignItems: "flex-end", marginBottom: "10px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Cédula</label>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <input className="lis-input" style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", margin: 0, height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", backgroundColor: buscandoCedula ? "#f3f4f6" : "#fff" }} value={registroCedula} onChange={(e) => setRegistroCedula(e.target.value)} disabled={buscandoCedula} />
                    <button type="button" onClick={consultarRegistroCivil} disabled={buscandoCedula} style={{ backgroundColor: "#0284c7", color: "#fff", border: "1px solid #0284c7", borderTopRightRadius: "3px", borderBottomRightRadius: "3px", padding: "0 10px", height: "26px", cursor: "pointer" }}>{buscandoCedula ? "⏳" : "🔍"}</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Apellidos, Nombre</label>
                  <input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", backgroundColor: buscandoCedula ? "#f3f4f6" : "#fff" }} value={registroNombre} onChange={(e) => setRegistroNombre(e.target.value)} disabled={buscandoCedula} required />
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Sexo</label><select className="lis-input" style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroSexo} onChange={e => setRegistroSexo(e.target.value)} disabled={buscandoCedula}><option value="N/A">N/A</option><option value="M">MASCULINO</option><option value="F">FEMENINO</option></select></div>
                
                <div style={{ flex: 1.5 }}>
                  <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Fecha Nacimiento</label>
                  <input 
                    type="date" 
                    className="lis-input" 
                    style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} 
                    value={registroFechaNacimiento} 
                    onChange={e => {
                      const nuevaFecha = e.target.value;
                      setRegistroFechaNacimiento(nuevaFecha);
                      if (nuevaFecha) setRegistroEdad(calcularEdad(nuevaFecha)); 
                    }} 
                    disabled={buscandoCedula} 
                  />
                </div>

                <div style={{ flex: 0.8 }}><label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Edad</label><input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", fontWeight: "bold", textAlign: "center", backgroundColor: "#f1f5f9" }} value={registroEdad} onChange={e => setRegistroEdad(e.target.value)} disabled={buscandoCedula} placeholder="Autocalculada" /></div>
                
                <div style={{ flex: 1.2 }}>
                  <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>WhatsApp</label>
                  <input 
                    className="lis-input" 
                    style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", backgroundColor: (buscandoCedula || registroProcedencia === "CONVENIO") ? "#f3f4f6" : "#fff" }} 
                    value={registroTelefono} 
                    onChange={e => setRegistroTelefono(e.target.value)} 
                    disabled={buscandoCedula || registroProcedencia === "CONVENIO"} 
                    placeholder={registroProcedencia === "CONVENIO" ? "Dato de convenio" : ""}
                  />
                </div>
                <div style={{ flex: 1.5 }}>
                  <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Correo</label>
                  <input 
                    type="email"
                    className="lis-input" 
                    style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", backgroundColor: (buscandoCedula || registroProcedencia === "CONVENIO") ? "#f3f4f6" : "#fff" }} 
                    value={registroCorreo} 
                    onChange={e => setRegistroCorreo(e.target.value)} 
                    disabled={buscandoCedula || registroProcedencia === "CONVENIO"}
                    placeholder={registroProcedencia === "CONVENIO" ? "Dato de convenio" : ""}
                  />
                </div>
              </div>
            </fieldset>
            <fieldset style={{ border: "1px solid #a3a3a3", padding: "12px", marginBottom: "16px", borderRadius: "4px" }}>
              <legend style={{ color: "#0369a1", fontWeight: "bold", padding: "0 4px" }}>Datos de la Orden</legend>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 45%" }}><label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Tipo Orden</label><select className="lis-input" style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroTipoOrden} onChange={e=>setRegistroTipoOrden(e.target.value)}><option value="RUTINA">RUTINA</option><option value="EMERGENCIA">EMERGENCIA</option></select></div>
                <div style={{ flex: "1 1 45%" }}>
                  <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Procedencia</label>
                  <select 
                    className="lis-input" 
                    style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} 
                    value={registroProcedencia} 
                    onChange={e=>{ 
                      setRegistroProcedencia(e.target.value); 
                      setNombreConvenio("");
                      setRegistroCodigoConvenio("");
                      setRegistroTelefono(""); 
                      setRegistroCorreo(""); 
                      setRegistroFechaNacimiento("");
                    }}>
                    <option value="AMBULATORIO">AMBULATORIO</option>
                    <option value="CONVENIO">CONVENIO</option>
                  </select>
                </div>
                {registroProcedencia === "CONVENIO" && (
                  <div style={{ flex: "1 1 100%", marginTop: "4px" }}>
                    <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Cód. Convenio <b style={{ color: nombreConvenio.includes("❌") ? "#dc2626" : "#16a34a" }}>{nombreConvenio}</b></label>
                    <input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", backgroundColor: "#fffbeb" }} placeholder="Digite código..." value={registroCodigoConvenio} onChange={(e) => {
                        const val = e.target.value.toUpperCase(); setRegistroCodigoConvenio(val);
                        if(val.length >= 3) { 
                          const match = listaConvenios.find(c => c.codigo_secreto?.toUpperCase() === val); 
                          if (match) {
                             setNombreConvenio(match.nombre);
                             setRegistroTelefono(match.telefono || "");
                             setRegistroCorreo(match.correo || "");
                          } else {
                             setNombreConvenio("❌ Inválido");
                             setRegistroTelefono("");
                             setRegistroCorreo("");
                          }
                        } 
                        else {
                          setNombreConvenio("");
                          setRegistroTelefono("");
                          setRegistroCorreo("");
                        }
                      }} />
                  </div>
                )}
                <div style={{ flex: "1 1 100%", marginTop: "4px" }}><label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Doctor Solicitante</label><input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroDoctor} onChange={e=>setRegistroDoctor(e.target.value)} /></div>
              </div>
            </fieldset>
            <fieldset style={{ border: "1px solid #a3a3a3", padding: "12px", borderRadius: "4px" }}>
              <legend style={{ color: "#0369a1", fontWeight: "bold", padding: "0 4px" }}>Observaciones Internas</legend>
              <textarea className="lis-input" style={{ width: "100%", height: "60px", resize: "none", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroObservacion} onChange={e => setRegistroObservacion(e.target.value)}></textarea>
            </fieldset>
          </div>
          <div style={{ background: "#e5e7eb", padding: "10px", borderTop: "1px solid #ccc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="lis-btn" style={{ background: "#f9fafb", border: "1px solid #9ca3af", padding: "4px 12px", borderRadius: "2px", cursor: "pointer" }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="lis-btn" style={{ fontWeight: "bold", border: "1px solid #0369a1", color: "white", background: "#0284c7", padding: "4px 12px", borderRadius: "2px", cursor: "pointer" }}>Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}