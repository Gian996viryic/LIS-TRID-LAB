import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";

export default function ModalBuscadorPaciente({ onClose }) {
  const [tabActivo, setTabActivo] = useState("paciente"); 
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  
  const [buscando, setBuscando] = useState(false);
  const [buscandoCedulaRC, setBuscandoCedulaRC] = useState(false); // ✅ Estado para la lupa
  const [resultado, setResultado] = useState(null);
  const [esPacienteConvenio, setEsPacienteConvenio] = useState(false);
  
  const [editando, setEditando] = useState(false);
  const [creandoConvenio, setCreandoConvenio] = useState(false);

  const [listaConvenios, setListaConvenios] = useState([]);

  // ✅ Añadido campo 'cedula' al formulario del paciente
  const [formPaciente, setFormPaciente] = useState({ cedula: "", nombre: "", telefono: "", correo: "", fecha_nacimiento: "", sexo: "" });
  const [formConvenio, setFormConvenio] = useState({ nombre: "", codigo_secreto: "", correo: "", telefono: "" });

  useEffect(() => {
    if (tabActivo === "convenio" && listaConvenios.length === 0) {
      cargarConvenios();
    }
  }, [tabActivo]);

  async function cargarConvenios() {
    const { data } = await supabase.from("lab_convenios").select("id, nombre, codigo_secreto, correo, telefono, activo");
    if (data) setListaConvenios(data);
  }

  function cambiarTab(tab) {
    setTabActivo(tab);
    setTerminoBusqueda("");
    setResultado(null);
    setEditando(false);
    setCreandoConvenio(false);
  }

  // --- LÓGICA DE BÚSQUEDA EN BASE DE DATOS ---
  async function buscar(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!terminoBusqueda.trim()) return toast.error("Ingrese un valor de búsqueda.");

    setBuscando(true);
    setResultado(null);
    setEditando(false);
    setCreandoConvenio(false);
    
    try {
      if (tabActivo === "paciente") {
        if (terminoBusqueda.trim().length < 10) {
          toast.error("Ingrese una cédula válida de 10 dígitos.");
          setBuscando(false);
          return;
        }

        const { data, error } = await supabase
          .from("lab_pacientes")
          .select("cedula, nombre, pin_secreto, telefono, correo, fecha_nacimiento, sexo")
          .eq("cedula", terminoBusqueda.trim())
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast.error("❌ Paciente no encontrado en la base de datos.");
        } else {
          toast.success("✅ Paciente localizado.");
          
          const { data: ultimaOrden } = await supabase
            .from("lab_ordenes")
            .select("procedencia")
            .eq("paciente_cedula", data.cedula)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
            
          setEsPacienteConvenio(ultimaOrden && ultimaOrden.procedencia && ultimaOrden.procedencia !== "AMBULATORIO");
          
          setResultado(data);
          // ✅ Precargamos la cédula para posible edición
          setFormPaciente({
            cedula: data.cedula || "",
            nombre: data.nombre || "",
            telefono: data.telefono || "",
            correo: data.correo || "",
            fecha_nacimiento: data.fecha_nacimiento || "",
            sexo: data.sexo || ""
          });
        }
      } else {
        const coincidencias = listaConvenios.filter(c => c.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) || c.codigo_secreto.includes(terminoBusqueda));
        if (coincidencias.length > 0) {
          seleccionarConvenio(coincidencias[0]);
        } else {
          toast.error("❌ Convenio no encontrado.");
        }
      }
    } catch (err) {
      toast.error("Error al buscar: " + err.message);
    } finally {
      setBuscando(false);
    }
  }

  // --- LÓGICA DE BÚSQUEDA EN REGISTRO CIVIL (LUPA) ---
  async function consultarRegistroCivil() {
    const ced = formPaciente.cedula.trim();
    if (ced.length !== 10) return toast.error("La cédula debe tener exactamente 10 dígitos.");
    
    setBuscandoCedulaRC(true);
    const toastId = toast.loading("Consultando Cédula...");
    try {
      const { data, error } = await supabase.functions.invoke("consultar-cedula", { 
        body: { cedula: ced }, headers: { 'x-app-secreto': 'TridLab_Seguridad_2026_XyZ' } 
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const info = data?.data || data;
      if (info.success === false) throw new Error(info.message || "Cédula no encontrada.");

      let nuevosDatos = { ...formPaciente };

      if (info.nombre) nuevosDatos.nombre = info.nombre; 
      
      if (info.fechaNacimiento) {
        const partes = String(info.fechaNacimiento).split('/'); 
        if (partes.length === 3) {
           nuevosDatos.fecha_nacimiento = `${partes[2]}-${partes[1]}-${partes[0]}`; // Formato YYYY-MM-DD para input date
        }
      }
      
      if (info.genero) {
        const gen = String(info.genero).toUpperCase();
        if (gen.includes("HOMBRE") || gen.includes("MASCULINO")) nuevosDatos.sexo = "M";
        else if (gen.includes("MUJER") || gen.includes("FEMENINO")) nuevosDatos.sexo = "F";
      }

      setFormPaciente(nuevosDatos);
      toast.success("Datos actualizados desde el Registro Civil", { id: toastId });
    } catch (e) {
      toast.error("Error: Modifique los datos manualmente", { id: toastId });
    } finally { 
      setBuscandoCedulaRC(false); 
    }
  }

  function seleccionarConvenio(convenio) {
    toast.success("✅ Convenio seleccionado.");
    setResultado(convenio);
    setFormConvenio({
      nombre: convenio.nombre || "",
      codigo_secreto: convenio.codigo_secreto || "",
      correo: convenio.correo || "",
      telefono: convenio.telefono || ""
    });
    setTerminoBusqueda(""); 
  }

  // --- GUARDADO ---
  async function guardarPaciente() {
    if (!formPaciente.cedula.trim() || formPaciente.cedula.trim().length !== 10) return toast.error("La cédula debe tener 10 dígitos.");
    if (!formPaciente.nombre.trim()) return toast.error("El nombre es obligatorio.");
    
    const loadingToast = toast.loading("Actualizando datos...");
    
    try {
      // ✅ Se incluye la actualización de la Cédula (buscando por la cédula original)
      const { error } = await supabase
        .from("lab_pacientes")
        .update({
          cedula: formPaciente.cedula.trim(), // Permite cambiar la cédula
          nombre: formPaciente.nombre.trim().toUpperCase(),
          telefono: formPaciente.telefono.trim() || null,
          correo: formPaciente.correo.trim() || null,
          fecha_nacimiento: formPaciente.fecha_nacimiento || null,
          sexo: formPaciente.sexo || null
        })
        .eq("cedula", resultado.cedula); // Filtra por la que estaba guardada antes de editar

      if (error) {
        // Manejo de error si intentan cambiar a una cédula que ya existe en otro paciente
        if (error.code === '23505') throw new Error("La nueva cédula ya pertenece a otro paciente registrado.");
        throw error;
      }
      
      toast.dismiss(loadingToast);
      toast.success("Paciente actualizado correctamente");
      setEditando(false);
      
      // Actualizamos la vista local con los nuevos datos, incluyendo la cédula si cambió
      setResultado({
        ...resultado, 
        cedula: formPaciente.cedula.trim(),
        nombre: formPaciente.nombre.toUpperCase(), 
        telefono: formPaciente.telefono, 
        correo: formPaciente.correo, 
        fecha_nacimiento: formPaciente.fecha_nacimiento, 
        sexo: formPaciente.sexo
      });
      // Actualizamos también el input del buscador principal por si la cambiaron
      setTerminoBusqueda(formPaciente.cedula.trim());

    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Error: " + err.message);
    }
  }

  async function guardarConvenio() {
    if (!formConvenio.nombre.trim() || !formConvenio.codigo_secreto.trim()) {
      return toast.error("El nombre y el código secreto son obligatorios.");
    }
    const loadingToast = toast.loading(creandoConvenio ? "Creando convenio..." : "Actualizando convenio...");
    
    try {
      const datos = {
        nombre: formConvenio.nombre.trim().toUpperCase(),
        codigo_secreto: formConvenio.codigo_secreto.trim(),
        correo: formConvenio.correo.trim() || null,
        telefono: formConvenio.telefono?.trim() || null,
        activo: true 
      };

      let errorDB;
      if (creandoConvenio) {
        const { error } = await supabase.from("lab_convenios").insert([datos]);
        errorDB = error;
      } else {
        const { error } = await supabase.from("lab_convenios").update(datos).eq("id", resultado.id);
        errorDB = error;
      }

      if (errorDB) throw errorDB;
      
      toast.dismiss(loadingToast);
      toast.success(creandoConvenio ? "Convenio creado exitosamente" : "Convenio actualizado");
      setEditando(false);
      setCreandoConvenio(false);
      setResultado({...resultado, ...datos}); 
      cargarConvenios(); 
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Error: " + err.message);
    }
  }

  // --- OTRAS FUNCIONES ---
  function generarPinAleatorio() {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setFormConvenio({ ...formConvenio, codigo_secreto: pin });
  }

  function enviarWhatsApp() {
    if (!resultado?.telefono) return toast.error("El paciente no tiene WhatsApp registrado.");
    let telefonoFormateado = resultado.telefono.replace(/\D/g, '');
    if (telefonoFormateado.startsWith('0')) telefonoFormateado = '593' + telefonoFormateado.substring(1);
    
    const mensaje = `Hola ${resultado.nombre},\nSomos *Laboratorio Clínico TRIDLAB*.\n\nSus credenciales para descargar sus resultados en nuestro portal web son:\n\n👤 *Cédula:* ${resultado.cedula}\n🔑 *PIN Web:* ${resultado.pin_secreto}\n\n🌐 Ingrese aquí: https://cotizador-trid.vercel.app\n\n¡Gracias por confiar en nosotros!`;
    window.open(`https://wa.me/${telefonoFormateado}?text=${encodeURIComponent(mensaje)}`, "_blank");
  }

  function enviarCorreo() {
    if (!resultado?.correo) return toast.error("El paciente no tiene correo registrado.");
    const asunto = "Credenciales Portal de Resultados - TRIDLAB";
    const cuerpo = `Hola ${resultado.nombre},\n\nSomos Laboratorio Clínico TRIDLAB. Sus credenciales para descargar sus resultados en nuestro portal web son:\n\nCédula: ${resultado.cedula}\nPIN Web: ${resultado.pin_secreto}\n\nIngrese al portal en el siguiente enlace: https://cotizador-trid.vercel.app\n\n¡Gracias por confiar en nosotros!`;
    window.location.href = `mailto:${resultado.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }

  const conveniosSugeridos = (tabActivo === "convenio" && terminoBusqueda.length > 0 && !resultado && !editando && !creandoConvenio)
    ? listaConvenios.filter(c => c.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) || c.codigo_secreto.includes(terminoBusqueda))
    : [];

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: "12px", width: "420px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        
        <div style={{ backgroundColor: "#6b21a8", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#fff", fontSize: "16px" }}>📇 Directorio TRIDLAB</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>

        <div style={{ padding: "20px", overflowY: "auto" }}>
          
          {!editando && !creandoConvenio && (
            <div style={{ display: "flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "4px", marginBottom: "20px" }}>
              <button onClick={() => cambiarTab('paciente')} style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", backgroundColor: tabActivo === 'paciente' ? "#fff" : "transparent", fontWeight: "bold", boxShadow: tabActivo === 'paciente' ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: tabActivo === 'paciente' ? "#6b21a8" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>
                👤 Pacientes
              </button>
              <button onClick={() => cambiarTab('convenio')} style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", backgroundColor: tabActivo === 'convenio' ? "#fff" : "transparent", fontWeight: "bold", boxShadow: tabActivo === 'convenio' ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: tabActivo === 'convenio' ? "#6b21a8" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>
                🏥 Convenios
              </button>
            </div>
          )}

          {!editando && !creandoConvenio && !resultado && (
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <form onSubmit={buscar} style={{ display: "flex", gap: "10px" }}>
                <input 
                  type="text" 
                  placeholder={tabActivo === 'paciente' ? "Ingrese Cédula..." : "Escriba el código o nombre del convenio..."} 
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(tabActivo === 'paciente' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                  maxLength={tabActivo === 'paciente' ? 10 : 50}
                  style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none" }}
                />
                <button type="submit" disabled={buscando} style={{ backgroundColor: "#0284c7", color: "#fff", border: "none", padding: "0 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                  Buscar
                </button>
              </form>

              {/* LISTA PREDICTIVA (AUTOCOMPLETE) PARA CONVENIOS */}
              {conveniosSugeridos.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", backgroundColor: "#fff", border: "1px solid #cbd5e1", borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", zIndex: 10, maxHeight: "180px", overflowY: "auto" }}>
                  {conveniosSugeridos.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => seleccionarConvenio(c)}
                      style={{ padding: "10px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      <span style={{ fontWeight: "bold", color: "#334155" }}>{c.nombre}</span>
                      <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "bold", backgroundColor: "#dcfce3", padding: "2px 6px", borderRadius: "4px" }}>PIN: {c.codigo_secreto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tabActivo === "convenio" && !resultado && !creandoConvenio && !editando && (
            <button 
              onClick={() => {
                setCreandoConvenio(true);
                setFormConvenio({ nombre: "", codigo_secreto: "", correo: "", telefono: "" });
              }} 
              style={{ width: "100%", padding: "12px", backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px dashed #16a34a", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
            >
              ➕ Crear Nuevo Convenio
            </button>
          )}

          {(editando || creandoConvenio) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>
                {creandoConvenio ? "Registrar Nuevo Convenio" : "Modificar Datos"}
              </h4>

              {tabActivo === "paciente" && (
                <>
                  {/* ✅ Nuevo bloque para la cédula con lupa */}
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>CÉDULA DE IDENTIDAD</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input 
                        value={formPaciente.cedula} 
                        onChange={e => setFormPaciente({...formPaciente, cedula: e.target.value.replace(/\D/g, '')})} 
                        maxLength={10}
                        style={{ flex: 1, padding: "10px", border: "1px solid #ccc", borderRight: "none", borderRadius: "6px 0 0 6px", boxSizing: "border-box", backgroundColor: buscandoCedulaRC ? "#f3f4f6" : "#fff" }} 
                      />
                      <button 
                        type="button" 
                        onClick={consultarRegistroCivil} 
                        disabled={buscandoCedulaRC} 
                        style={{ backgroundColor: "#0ea5e9", color: "#fff", border: "1px solid #0ea5e9", borderRadius: "0 6px 6px 0", padding: "0 12px", height: "39px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        {buscandoCedulaRC ? "..." : "🔍"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>APELLIDOS Y NOMBRES</label>
                    <input value={formPaciente.nombre} onChange={e => setFormPaciente({...formPaciente, nombre: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }} />
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>F. NACIMIENTO</label>
                      <input type="date" value={formPaciente.fecha_nacimiento} onChange={e => setFormPaciente({...formPaciente, fecha_nacimiento: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>SEXO</label>
                      <select value={formPaciente.sexo} onChange={e => setFormPaciente({...formPaciente, sexo: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box", backgroundColor: "#fff" }}>
                        <option value="">--Seleccionar--</option>
                        <option value="M">Masculino (M)</option>
                        <option value="F">Femenino (F)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>WHATSAPP</label>
                    <input value={formPaciente.telefono} onChange={e => setFormPaciente({...formPaciente, telefono: e.target.value})} placeholder="Ej: 0991234567" style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>CORREO</label>
                    <input value={formPaciente.correo} onChange={e => setFormPaciente({...formPaciente, correo: e.target.value})} placeholder="ejemplo@correo.com" style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }} />
                  </div>
                </>
              )}

              {tabActivo === "convenio" && (
                <>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>NOMBRE DEL CONVENIO</label>
                    <input value={formConvenio.nombre} onChange={e => setFormConvenio({...formConvenio, nombre: e.target.value})} placeholder="Ej: CLÍNICA B" style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>CÓDIGO SECRETO (PIN)</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input value={formConvenio.codigo_secreto} onChange={e => setFormConvenio({...formConvenio, codigo_secreto: e.target.value})} placeholder="Ej: 123456" style={{ flex: 1, padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }} />
                      
                      <button type="button" onClick={generarPinAleatorio} style={{ padding: "0 12px", backgroundColor: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                        🎲 Generar
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>TELÉFONO / WHATSAPP</label>
                    <input value={formConvenio.telefono} onChange={e => setFormConvenio({...formConvenio, telefono: e.target.value})} placeholder="Teléfono de contacto" style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", display: "block", marginBottom: "4px" }}>CORREO INSTITUCIONAL</label>
                    <input value={formConvenio.correo} onChange={e => setFormConvenio({...formConvenio, correo: e.target.value})} placeholder="correo@clinica.com" style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }} />
                  </div>
                </>
              )}
              
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => {setEditando(false); setCreandoConvenio(false);}} style={{ flex: 1, padding: "10px", background: "#f3f4f6", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", color: "#475569" }}>
                  Cancelar
                </button>
                <button type="button" onClick={tabActivo === 'paciente' ? guardarPaciente : guardarConvenio} style={{ flex: 2, background: "#16a34a", color: "white", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                  {creandoConvenio ? "Crear Registro" : "Guardar Cambios"}
                </button>
              </div>
            </div>
          )}

          {!editando && !creandoConvenio && resultado && (
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginTop: "20px" }}>
              
              {tabActivo === "paciente" && esPacienteConvenio && (
                <div style={{ backgroundColor: "#fffbeb", color: "#b45309", padding: "6px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", marginBottom: "12px", textAlign: "center", border: "1px solid #fef3c7" }}>
                  ⚠️ PACIENTE DE CONVENIO RECIENTE
                </div>
              )}

              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>
                  {tabActivo === "paciente" ? "Apellidos y Nombres" : "Nombre del Convenio"}
                </span>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>{resultado.nombre}</div>
              </div>
              
              <div style={{ display: "flex", gap: "15px", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>
                    {tabActivo === "paciente" ? "Cédula" : "ID Interno"}
                  </span>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                    {tabActivo === "paciente" ? resultado.cedula : `#${resultado.id}`}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>
                    {tabActivo === "paciente" ? "PIN Secreto Web" : "Código Secreto"}
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: "900", color: "#16a34a", letterSpacing: "2px" }}>
                    {tabActivo === "paciente" ? resultado.pin_secreto : resultado.codigo_secreto}
                  </div>
                </div>
              </div>

              {tabActivo === "paciente" && (
                <div style={{ display: "flex", gap: "15px", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>F. Nacimiento</span>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>{resultado.fecha_nacimiento || "No registrado"}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Sexo</span>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>{resultado.sexo === "M" ? "Masculino" : resultado.sexo === "F" ? "Femenino" : "No registrado"}</div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Teléfono</span>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>{resultado.telefono || "No registrado"}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Correo</span>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>{resultado.correo || "No registrado"}</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                
                {tabActivo === "paciente" && !esPacienteConvenio && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" onClick={enviarWhatsApp} style={{ flex: 1, padding: "10px", backgroundColor: "#25D366", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                      WhatsApp
                    </button>
                    <button type="button" onClick={enviarCorreo} style={{ flex: 1, padding: "10px", backgroundColor: "#ea4335", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                      Correo
                    </button>
                  </div>
                )}
                
                <button type="button" onClick={() => setEditando(true)} style={{ width: "100%", padding: "10px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                  Modificar Datos
                </button>
                <button type="button" onClick={() => setResultado(null)} style={{ width: "100%", padding: "8px", background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}>
                  Buscar otro
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}