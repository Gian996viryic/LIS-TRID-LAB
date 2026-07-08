import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Toaster, toast } from "react-hot-toast";
import emailjs from '@emailjs/browser';

export default function LoginConvenios({ onLoginSuccess }) {
  const [nombreInstitucion, setNombreInstitucion] = useState("");
  const [pinSecreto, setPinSecreto] = useState("");
  const [cargando, setCargando] = useState(false);
  
  const [mostrarPin, setMostrarPin] = useState(false);
  const [showModalRecuperar, setShowModalRecuperar] = useState(false);
  const [nombreRecuperacion, setNombreRecuperacion] = useState("");
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);

  async function iniciarSesionConvenio(e) {
    e.preventDefault();
    
    if (!nombreInstitucion.trim() || !pinSecreto.trim()) {
      toast.error("Por favor ingrese el nombre de la institución y el PIN secreto.");
      return;
    }

    setCargando(true);
    const toastId = toast.loading("Verificando credenciales de convenio...");

    try {
      const { data, error } = await supabase
        .rpc("login_convenio_seguro", {
          p_nombre: nombreInstitucion.trim(),
          p_pin: pinSecreto.trim()
        })
        .maybeSingle();

      if (error) {
        toast.error("Error de Base de Datos: " + error.message, { id: toastId });
        setCargando(false);
        return;
      }

      if (!data) {
        toast.error("Nombre de institución o PIN secreto incorrectos.", { id: toastId });
        setCargando(false);
        return;
      }

      if (!data.activo) {
        toast.error("Este convenio se encuentra inactivo.", { id: toastId });
        setCargando(false);
        return;
      }

      toast.success(`Bienvenido, ${data.nombre}`, { id: toastId });
      
      const authData = { id: data.id, nombre: data.nombre, pin_secreto: pinSecreto.trim() };
      localStorage.setItem("tridlab_convenio_auth", JSON.stringify(authData));
      
      setTimeout(() => {
        onLoginSuccess(authData);
        setCargando(false);
      }, 500);

    } catch (err) {
      toast.error("Error de conexión al servidor.", { id: toastId });
      setCargando(false);
    }
  }

  async function solicitarRecuperacionPin(e) {
    e.preventDefault(); 
    
    if (!nombreRecuperacion || nombreRecuperacion.trim() === "") {
      toast.error("Por favor, ingresa un dato válido.");
      return;
    }

    setEnviandoRecuperacion(true);
    const toastId = toast.loading("Buscando institución...");

    try {
      const valorBusqueda = nombreRecuperacion.trim();
      
      // 1. Primero intentamos buscar asumiendo que el usuario ingresó un CORREO
      // Usamos .ilike() para que no importe si usa mayúsculas o minúsculas
      let { data, error } = await supabase
        .from("lab_convenios")
        .select("correo, codigo_secreto")
        .ilike("correo", valorBusqueda)
        .maybeSingle();

      // 2. Si la consulta anterior no encontró nada, intentamos buscar por NOMBRE
      if (!data) {
        const { data: dataNombre, error: errorNombre } = await supabase
          .from("lab_convenios")
          .select("correo, codigo_secreto")
          .ilike("nombre", valorBusqueda)
          .maybeSingle();
          
        data = dataNombre;
        if (errorNombre) error = errorNombre;
      }

      // Manejo de errores después de los dos intentos
      if (error) {
        console.error("Error Supabase:", error);
        throw new Error("Error con la base de datos registrado.");
      }
      
      if (!data) {
        throw new Error("No encontramos ninguna institución con ese nombre o correo.");
      }

      if (!data.correo) {
        throw new Error("Esta institución no tiene un correo registrado en el sistema.");
      }

      // Preparar y enviar el correo con EmailJS
      const templateParams = {
        to_email: data.correo,
        pin_secreto: data.codigo_secreto
      };

      await emailjs.send(
        'service_hpxbhkr',
        'template_lmjsxlx', 
        templateParams,
        'UKANIhXTZLFz73ikU'
      );

      toast.success("PIN enviado exitosamente a su correo.", { id: toastId });
      setShowModalRecuperar(false);
      setNombreRecuperacion("");

    } catch (err) {
      console.error("Error completo:", err);
      toast.error(err.message || "Error al enviar el PIN.", { id: toastId });
    } finally {
      setEnviandoRecuperacion(false);
    }
  }

  return (
    <div className="login-convenios-container">
      
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: "url('/IMAGEN 1.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(8px)",
        transform: "scale(1.1)", 
        zIndex: 1
      }} />
      
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(10, 5, 20, 0.6)",
        zIndex: 2
      }} />

      <Toaster position="top-center" />
      <style>{`
        .login-convenios-container {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100vh; 
          width: 100vw;
          background: #0a0514; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          position: relative; overflow: hidden;
          box-sizing: border-box;
        }

        .glass-card-b2b {
          background: #140d2b; 
          border: 1px solid rgba(255, 255, 255, 0.03); 
          border-radius: 24px; 
          padding: 35px 24px; 
          width: 90%; max-width: 380px; 
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
          display: flex; flex-direction: column; align-items: center; z-index: 10;
          box-sizing: border-box;
        }

        .b2b-header {
          text-align: center; margin-bottom: 24px; width: 100%;
        }

        .b2b-badge {
          background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.2);
          padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 1px;
          text-transform: uppercase; display: inline-block; margin-bottom: 12px;
        }

        .b2b-title { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
        .b2b-subtitle { margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 1.4; }

        .input-group-b2b { width: 100%; margin-bottom: 16px; position: relative; }
        
        .b2b-input {
          width: 100%; box-sizing: border-box; 
          padding: 15px 75px 15px 44px; 
          border-radius: 12px; 
          border: 1px solid rgba(255, 255, 255, 0.04); 
          background: #0a0514; 
          color: #ffffff; font-size: 14px; outline: none; transition: 0.3s; font-weight: 500;
        }
        
        .b2b-input::placeholder { color: #475569; }
        .b2b-input:focus { border-color: #06b6d4; background: #0e071c; box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15); }
        
        .icon-b2b { 
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%); 
          color: #475569; transition: color 0.3s; pointer-events: none; 
        }
        .input-group-b2b:focus-within .icon-b2b { color: #22d3ee; }

        .pin-input {
          letter-spacing: 4px; text-align: left; 
        }
        .pin-input::placeholder { letter-spacing: normal; text-align: left; }

        .right-icons-container {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          display: flex; align-items: center; gap: 8px;
        }

        .action-icon {
          display: flex; align-items: center; justify-content: center;
          color: #64748b; cursor: pointer; transition: 0.2s;
        }
        .action-icon:hover { color: #22d3ee; }
        
        .help-icon {
          width: 18px; height: 18px; border-radius: 50%; 
          background: rgba(255,255,255,0.08); color: #94a3b8; 
          font-size: 11px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1);
        }
        .help-icon:hover { background: rgba(6, 182, 212, 0.2); border-color: rgba(6, 182, 212, 0.4); color: #22d3ee; }

        .b2b-btn {
          width: 100%; padding: 15px; border-radius: 12px; border: none; 
          background: linear-gradient(to right, #0284c7, #06b6d4); 
          color: white; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.3s ease; 
          box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3); text-transform: uppercase; letter-spacing: 1px;
          margin-bottom: 15px; margin-top: 8px;
        }
        .b2b-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(6, 182, 212, 0.4); }
        .b2b-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        
        .logo-b2b-container {
          width: 100%; display: flex; flex-direction: column; align-items: center;
          margin-bottom: 0px; margin-top: 5px;
        }
        .b2b-logo { 
          height: 38px; object-fit: contain;
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
        }
        .b2b-footer-text { color: rgba(255, 255, 255, 0.5); font-size: 11px; font-weight: bold; letter-spacing: 1px; margin-top: 6px; }

        .modal-overlay-b2b {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
          z-index: 100; display: flex; align-items: center; justify-content: center;
        }
        .modal-content-b2b {
          background: #140d2b; border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px; padding: 25px; width: 85%; max-width: 350px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.8);
        }
      `}</style>

      <div className="glass-card-b2b">
        <div className="b2b-header">
          <span className="b2b-badge">Portal Institucional</span>
          <h2 className="b2b-title">Acceso a Convenios</h2>
          <p className="b2b-subtitle">Ingrese el nombre de su institución y el PIN secreto.</p>
        </div>

        <form onSubmit={iniciarSesionConvenio} style={{ width: '100%' }}>
          <div className="input-group-b2b">
            <svg className="icon-b2b" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 10a6.3 6.3 0 0 1 6 0"/>
            </svg>
            <input 
              type="text" 
              className="b2b-input" 
              placeholder="Nombre del Lab. u Hospital" 
              value={nombreInstitucion} 
              onChange={(e) => setNombreInstitucion(e.target.value)} 
              required 
              disabled={cargando}
            />
          </div>

          <div className="input-group-b2b">
            <svg className="icon-b2b" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input 
              type={mostrarPin ? "text" : "password"} 
              className="b2b-input pin-input" 
              placeholder="PIN Secreto" 
              value={pinSecreto} 
              onChange={(e) => setPinSecreto(e.target.value)} 
              required 
              disabled={cargando}
              maxLength={8}
            />
            
            <div className="right-icons-container">
              <span className="action-icon" onClick={() => setMostrarPin(!mostrarPin)} title={mostrarPin ? "Ocultar PIN" : "Mostrar PIN"}>
                {mostrarPin ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </span>
              <span className="action-icon help-icon" onClick={() => setShowModalRecuperar(true)} title="¿Olvidó su PIN?">
                ?
              </span>
            </div>
          </div>

          <button type="submit" className="b2b-btn" disabled={cargando}>
            {cargando ? 'Verificando...' : 'INGRESAR AL PORTAL'}
          </button>

          <div className="logo-b2b-container">
            <img src="/logo-tridlab.png" alt="TridLab" className="b2b-logo" />
            <span className="b2b-footer-text">
              <strong style={{ background: "linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</strong> WEB
            </span>
          </div>
        </form>
      </div>

      {showModalRecuperar && (
        <div className="modal-overlay-b2b">
          <div className="modal-content-b2b">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '16px' }}>Recuperar PIN</h3>
              <span onClick={() => setShowModalRecuperar(false)} style={{ cursor: 'pointer', color: '#64748b', fontSize: '18px' }}>✕</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '20px', lineHeight: '1.4' }}>
              Ingrese el <strong>correo electrónico</strong> o el <strong>nombre exacto</strong> de su institución. Le enviaremos su PIN de acceso.
            </p>
            
            <form onSubmit={solicitarRecuperacionPin}>
              <input 
                type="text" 
                className="b2b-input" 
                style={{ paddingLeft: '16px', paddingRight: '16px', marginBottom: '15px' }}
                placeholder="Ej: clinica@correo.com o Clínica San Juan" 
                value={nombreRecuperacion} 
                onChange={(e) => setNombreRecuperacion(e.target.value)} 
                required 
                disabled={enviandoRecuperacion}
              />
              <button type="submit" className="b2b-btn" style={{ margin: 0 }} disabled={enviandoRecuperacion}>
                {enviandoRecuperacion ? 'Buscando...' : 'ENVIAR PIN'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}