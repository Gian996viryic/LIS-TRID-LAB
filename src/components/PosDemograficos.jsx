import React from "react";

export default function PosDemograficos({
  registroCedula, setRegistroCedula, buscandoCedula, consultarRegistroCivil,
  registroNombre, setRegistroNombre, registroSexo, setRegistroSexo,
  registroFechaNacimiento, handleFechaNacimientoChange, registroEdad, setRegistroEdad,
  registroTelefono, setRegistroTelefono, registroCorreo, setRegistroCorreo,
  registroTipoOrden, setRegistroTipoOrden, registroProcedencia, handleProcedenciaChange,
  registroCodigoConvenio, handleCodigoConvenioChange, nombreConvenio,
  registroDoctor, setRegistroDoctor, registroObservacion, setRegistroObservacion,
  registroDireccion, setRegistroDireccion, registroCiudad, setRegistroCiudad // <-- Asegurados los nuevos props
}) {
  return (
    <div style={{ flex: "1 1 45%" }}>
      {/* DATOS DEMOGRÁFICOS */}
      <fieldset style={{ border: "1px solid #a3a3a3", padding: "12px", marginBottom: "16px", borderRadius: "4px" }}>
        <legend style={{ color: "#0369a1", fontWeight: "bold", padding: "0 4px" }}>Datos Demográficos</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px", alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Cédula</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input 
                  className="lis-input" 
                  style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", backgroundColor: buscandoCedula ? "#f3f4f6" : "#fff", margin: 0, height: "26px", padding: "4px 8px", border: "1px solid #9ca3af" }} 
                  value={registroCedula} 
                  onChange={(e) => setRegistroCedula(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); consultarRegistroCivil(); } }}
                  disabled={buscandoCedula} 
                  placeholder="10 dígitos" 
                  maxLength={10} 
                />
                <button type="button" onClick={consultarRegistroCivil} disabled={buscandoCedula} style={{ backgroundColor: "#0284c7", color: "#fff", border: "1px solid #0284c7", borderTopRightRadius: "3px", borderBottomRightRadius: "3px", padding: "0 10px", height: "26px", cursor: "pointer" }}>{buscandoCedula ? "⏳" : "🔍"}</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Apellidos, Nombre</label>
              <input className="lis-input" style={{ width: "100%", backgroundColor: buscandoCedula ? "#f3f4f6" : "#fff", margin: 0, height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroNombre} onChange={(e) => setRegistroNombre(e.target.value)} disabled={buscandoCedula} required />
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Sexo</label><select className="lis-input" style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroSexo} onChange={(e) => setRegistroSexo(e.target.value)} disabled={buscandoCedula}><option value="N/A">N/A</option><option value="M">MASCULINO</option><option value="F">FEMENINO</option></select></div>
            
            <div style={{ flex: 1.5 }}>
              <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Fecha Nacimiento</label>
              <input type="date" className="lis-input" style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroFechaNacimiento} onChange={e => handleFechaNacimientoChange(e.target.value)} disabled={buscandoCedula} />
            </div>

            <div style={{ flex: 0.8 }}><label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Edad</label><input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", fontWeight: "bold", textAlign: "center", backgroundColor: "#f1f5f9" }} value={registroEdad} onChange={(e) => setRegistroEdad(e.target.value)} disabled={buscandoCedula} placeholder="Autocalculada" /></div>
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>WhatsApp</label>
              <input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", backgroundColor: (buscandoCedula || registroProcedencia === "CONVENIO") ? "#f3f4f6" : "#fff" }} value={registroTelefono} onChange={(e) => setRegistroTelefono(e.target.value)} placeholder={registroProcedencia === "CONVENIO" ? "Dato del convenio" : "Ej: 0991234567"} disabled={buscandoCedula || registroProcedencia === "CONVENIO"} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Correo Electrónico</label>
              <input type="email" className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", backgroundColor: (buscandoCedula || registroProcedencia === "CONVENIO") ? "#f3f4f6" : "#fff" }} value={registroCorreo} onChange={e => setRegistroCorreo(e.target.value)} placeholder={registroProcedencia === "CONVENIO" ? "Dato del convenio" : "ejemplo@correo.com"} disabled={buscandoCedula || registroProcedencia === "CONVENIO"} />
            </div>
          </div>
        </div>
      </fieldset>

      {/* DATOS DE LA ORDEN */}
      <fieldset style={{ border: "1px solid #a3a3a3", padding: "12px", marginBottom: "16px", borderRadius: "4px" }}>
        <legend style={{ color: "#0369a1", fontWeight: "bold", padding: "0 4px" }}>Datos de la Orden</legend>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          
          <div style={{ flex: "1 1 45%" }}>
             <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Tipo Orden</label>
             <select className="lis-input" style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroTipoOrden} onChange={e=>setRegistroTipoOrden(e.target.value)}><option value="RUTINA">RUTINA</option><option value="EMERGENCIA">EMERGENCIA</option></select>
          </div>
          
          <div style={{ flex: "1 1 45%" }}>
            <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Procedencia</label>
            <select className="lis-input" style={{ width: "100%", height: "26px", padding: "2px 6px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroProcedencia} onChange={e => handleProcedenciaChange(e.target.value)}>
              <option value="AMBULATORIO">AMBULATORIO</option><option value="CONVENIO">CONVENIO</option>
            </select>
          </div>
          
          {registroProcedencia === "CONVENIO" && (
            <div style={{ flex: "1 1 100%", marginTop: "4px" }}>
              <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Cód. Convenio <b style={{ color: nombreConvenio.includes("❌") ? "#dc2626" : "#16a34a" }}>{nombreConvenio}</b></label>
              <input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px", backgroundColor: "#fffbeb" }} placeholder="Digite código..." value={registroCodigoConvenio} onChange={(e) => handleCodigoConvenioChange(e.target.value)} />
            </div>
          )}

          {/* 👇 AQUÍ ESTÁ EL CAMBIO SOLICITADO: DOCTOR, DIRECCIÓN Y CIUDAD EN UNA FILA 👇 */}
          <div style={{ display: "flex", width: "100%", gap: "10px", marginTop: "4px" }}>
            
            <div style={{ flex: "2" }}>
               <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Doctor Solicitante</label>
               <input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroDoctor} onChange={e=>setRegistroDoctor(e.target.value.toUpperCase())} />
            </div>
            
            <div style={{ flex: "2" }}>
               <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Dirección</label>
               <input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} placeholder="Ej: Suburbio" value={registroDireccion} onChange={e=>setRegistroDireccion(e.target.value.toUpperCase())} />
            </div>

            <div style={{ flex: "1.5" }}>
               <label style={{ fontSize: "11px", color: "#555", display: "block", marginBottom: "4px" }}>Ciudad</label>
               <input className="lis-input" style={{ width: "100%", height: "26px", padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroCiudad} onChange={e=>setRegistroCiudad(e.target.value.toUpperCase())} />
            </div>
            
          </div>
          {/* 👆 FIN DEL CAMBIO 👆 */}

        </div>
      </fieldset>

      {/* OBSERVACIONES */}
      <fieldset style={{ border: "1px solid #a3a3a3", padding: "12px", borderRadius: "4px" }}>
        <legend style={{ color: "#0369a1", fontWeight: "bold", padding: "0 4px" }}>Observaciones Internas</legend>
        <textarea className="lis-input" style={{ width: "100%", height: "40px", resize: "none", margin: 0, padding: "4px 8px", border: "1px solid #9ca3af", borderRadius: "4px" }} value={registroObservacion} onChange={(e) => setRegistroObservacion(e.target.value)}></textarea>
      </fieldset>
    </div>
  );
}