import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { Toaster, toast } from "react-hot-toast";

// COMPONENTES ADMINISTRATIVOS
import LabOrdenes from "./components/LabOrdenes";
import AdminRangosGlobales from "./components/AdminRangosGlobales";

// IMPORTACIÓN DE LOS COMPONENTES DE PACIENTES 🚀
import LoginPacientes from "./components/LoginPacientes";
import PortalPacientes from "./components/PortalPacientes"; 

// IMPORTACIONES DE CONVENIOS 🚀
import LoginConvenios from "./components/LoginConvenios";
import PortalConvenios from "./components/PortalConvenios"; 

// IMPORTACIÓN PARA VALIDACIÓN DE DOCUMENTOS (QR) 🚀
import VerificarDocumento from "./components/VerificarDocumento";

// 🚀 AÑADE ESTA LÍNEA AQUÍ:
import Inicio from "./components/Inicio";

// ==========================================
// 🌍 PORTAL DE PACIENTES (ZONA PÚBLICA)
// ==========================================
function PacientePortal() {
  const [pacienteAuth, setPacienteAuth] = useState(() => {
    const guardado = localStorage.getItem("tridlab_paciente_auth");
    return guardado ? JSON.parse(guardado) : null;
  });

  if (!pacienteAuth) {
    return <LoginPacientes onLoginSuccess={(datos) => setPacienteAuth(datos)} />;
  }

  return (
    <PortalPacientes 
      pacienteAuth={pacienteAuth} 
      onLogout={() => {
        localStorage.removeItem("tridlab_paciente_auth");
        setPacienteAuth(null);
      }} 
    />
  );
}

// ==========================================
// 🤝 PORTAL DE CONVENIOS (ZONA B2B INSTITUCIONAL)
// ==========================================
function ConvenioPortal() {
  const [convenioAuth, setConvenioAuth] = useState(() => {
    const guardado = localStorage.getItem("tridlab_convenio_auth");
    return guardado ? JSON.parse(guardado) : null;
  });

  // Si no está autenticado, mostramos el componente de Login que acabas de crear
  if (!convenioAuth) {
    return <LoginConvenios onLoginSuccess={(datos) => setConvenioAuth(datos)} />;
  }

  // Si ya inició sesión, mostramos el Portal de Convenios
  return (
    <PortalConvenios 
      convenioAuth={convenioAuth} 
      onLogout={() => {
        localStorage.removeItem("tridlab_convenio_auth");
        setConvenioAuth(null);
      }} 
    />
  );
}

// ==========================================
// 🔒 PORTAL DEL LABORATORIO (ADMIN)
// ==========================================
function AdminPortal() {
  const [session, setSession] = useState(null);
  const [rol, setRol] = useState(null);
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tabAdmin, setTabAdmin] = useState("ordenes");

  const [showAyudaModal, setShowAyudaModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const [recuperarEmail, setRecuperarEmail] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sessionNueva) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowResetModal(true);
      }
      setSession(sessionNueva ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function cargarRol() {
      if (!session?.user?.id) {
        setRol(null);
        setNombre("");
        setCargo("");
        return;
      }

      const { data, error } = await supabase
        .from("lab_usuarios")
        .select("rol, activo, nombre, cargo")
        .eq("id", session.user.id)
        .single();

      if (error || !data?.activo) {
        setRol("sin_acceso");
        setNombre("");
        setCargo("");
        return;
      }

      setRol(data.rol);
      setNombre(data.nombre || "");
      setCargo(data.cargo || ""); 
    }

    cargarRol();
  }, [session]);

  async function iniciarSesion(e) {
    e.preventDefault();
    setMensaje("Verificando credenciales...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje("Correo o contraseña incorrectos.");
      return;
    }

    setMensaje("");
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setRol(null);
    setNombre("");
    setCargo("");
    setTabAdmin("ordenes");
  }

  async function enviarCorreoRecuperacion(e) {
    e.preventDefault();
    if (!recuperarEmail) return;
    setEnviandoCorreo(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(recuperarEmail, {
      redirectTo: lis-tridlab.vercel.app + "/intranet-trd", // <--- RUTA CORRECTA
    });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("Enlace enviado. Revisa tu bandeja de entrada o spam.", { duration: 6000 });
      setRecuperarEmail("");
      setShowAyudaModal(false);
    }
    setEnviandoCorreo(false);
  }

  async function guardarNuevaPassword(e) {
    e.preventDefault();
    if (nuevaPassword.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres.");
    
    const toastId = toast.loading("Actualizando contraseña...");
    const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
    
    if (error) {
      toast.error(error.message, { id: toastId });
    } else {
      toast.success("Contraseña actualizada exitosamente.", { id: toastId });
      setShowResetModal(false);
      setNuevaPassword("");
      cerrarSesion();
    }
  }

  const ModalBase = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
            <h3 style={{ margin: 0, color: '#334155' }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    );
  };

  if (!session) {
    return (
      <div className="login-container">
        <Toaster position="top-center" />
        <style>{`
          .login-container {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100vh; width: 100vw;
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.8) 0%, rgba(192, 38, 211, 0.8) 100%), url('/fondo-lab.jpg') center/cover no-repeat;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; position: relative; overflow: hidden;
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
            border: 1.5px solid rgba(255, 255, 255, 0.7); border-radius: 24px; padding: 30px;
            width: 90%; max-width: 340px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            display: flex; flex-direction: column; align-items: center; z-index: 10;
          }
          .logo-container {
            display: flex; flex-direction: column; align-items: center; margin-bottom: 20px;
            background-image: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 40%, transparent 75%);
            padding: 15px; border-radius: 50%;
          }
          .login-logo { height: 90px; object-fit: contain; margin-bottom: 10px; filter: drop-shadow(0px 0px 10px rgba(255,255,255,0.8)); }
          .input-group { width: 100%; margin-bottom: 16px; position: relative; }
          .login-input {
            width: 100%; box-sizing: border-box; padding: 14px 16px 14px 44px; border-radius: 50px; 
            border: 1px solid rgba(255, 255, 255, 0.8); background: rgba(255, 255, 255, 0.9); 
            color: #334155; font-size: 14px; outline: none; transition: 0.2s; font-weight: 600;
          }
          .login-input:focus { border-color: #0ea5e9; background: white; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.3); }
          .input-icon { 
            position: absolute; left: 16px; top: 50%; transform: translateY(-50%); 
            display: flex; align-items: center; justify-content: center; color: #64748b; transition: color 0.2s; pointer-events: none; 
          }
          .input-group:focus-within .input-icon { color: #0284c7; }
          .login-btn {
            width: 100%; padding: 14px; border-radius: 50px; border: none; background: #0284c7; 
            color: white; font-weight: 700; font-size: 16px; cursor: pointer; transition: 0.2s; 
            box-shadow: 0 6px 15px rgba(2, 132, 199, 0.4); margin-top: 5px;
          }
          .login-btn:hover { background: #0369a1; transform: translateY(-2px); }
          .error-msg { color: #991b1b; font-size: 13px; margin-top: 12px; text-align: center; font-weight: bold; min-height: 18px; background: rgba(255,255,255,0.5); border-radius: 8px; padding: 2px;}
          .login-footer {
            position: absolute; bottom: 40px; width: 100%; max-width: 800px;
            display: flex; justify-content: center; align-items: stretch; z-index: 10;
          }
          .footer-btn {
            flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: transparent; border: none; color: white; cursor: pointer; transition: 0.2s; padding: 10px;
            border-right: 1px solid rgba(255, 255, 255, 0.3); 
          }
          .footer-btn:last-child { border-right: none; }
          .footer-btn:hover { background: rgba(255, 255, 255, 0.1); }
          .footer-icon { font-size: 26px; margin-bottom: 6px; }
          .footer-text { font-size: 12px; font-weight: 600; text-align: center; line-height: 1.2; }
          .footer-subtext { font-size: 10px; font-weight: 400; opacity: 0.8; margin-top: 3px; }
        `}</style>

        <div className="logo-container">
          <img src="/logo-tridlab.png" alt="Logo TRIDLAB" className="login-logo" onError={(e) => e.target.style.display = 'none'} />
          <h1 style={{ color: "#ffffff", display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", margin: 0, fontSize: "26px", fontWeight: 900, letterSpacing: "0.5px" }}>
            <span style={{ 
              background: "linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.8))"
            }}>
              TRIDLAB
            </span> 
            <span style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.5)" }}>LIS</span>
          </h1>
        </div>

        <div className="glass-card">
          <form onSubmit={iniciarSesion} style={{ width: '100%' }}>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input type="email" className="login-input" placeholder="laboratorio_clinico_@outlook.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input type="password" className="login-input" placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button type="submit" className="login-btn">Iniciar Sesión</button>
            <div className="error-msg">{mensaje}</div>
          </form>
        </div>

        <div className="login-footer">
          <button className="footer-btn" onClick={() => window.location.href = '/resultados'}>
            <span className="footer-icon">🌍</span><span className="footer-text">Portal Pacientes</span>
          </button>
          
          <button className="footer-btn" onClick={() => window.location.href = '/convenios'}>
            <span className="footer-icon">🤝</span><span className="footer-text">Portal Convenios</span>
          </button>

          <button className="footer-btn" onClick={() => setShowAyudaModal(true)}>
            <span className="footer-icon">❓</span><span className="footer-text">Ayuda / Preguntas<br/>Frecuentes</span>
          </button>
          <button className="footer-btn" onClick={() => setShowInfoModal(true)}>
            <span className="footer-icon">ℹ️</span><span className="footer-text">Información</span>
          </button>
          <button className="footer-btn" onClick={() => window.open('https://wa.me/593989195035?text=Hola,%20necesito%20ayuda%20técnica', '_blank')}>
            <span className="footer-icon">🎧</span><span className="footer-text">SOPORTE TÉCNICO</span>
          </button>
        </div>

        <ModalBase isOpen={showAyudaModal} onClose={() => setShowAyudaModal(false)} title="Ayuda y Recuperación">
          <p style={{ fontSize: '13px', color: '#475569' }}>Ingresa tu correo para recibir un enlace de recuperación.</p>
          <form onSubmit={enviarCorreoRecuperacion} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input type="email" placeholder="tu@correo.com" value={recuperarEmail} onChange={(e) => setRecuperarEmail(e.target.value)} required style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <button type="submit" disabled={enviandoCorreo} style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '0 16px', borderRadius: '6px', fontWeight: 'bold' }}>{enviandoCorreo ? '...' : 'Enviar'}</button>
          </form>
        </ModalBase>

        <ModalBase isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} title="Información del Sistema">
          <p style={{ fontSize: '13px', color: '#475569' }}>
            <b><span style={{ background: "linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</span> LIS v3.0</b> - Edición Corporativa
          </p>
        </ModalBase>

        {showResetModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ background: "white" }}>
              <h2>Nueva Contraseña</h2>
              <form onSubmit={guardarNuevaPassword} style={{ width: '100%' }}>
                <input type="password" className="login-input" placeholder="Mínimo 6 caracteres" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} required style={{ marginBottom: "16px", paddingLeft: "16px" }} />
                <button type="submit" className="login-btn">Actualizar and Entrar</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (rol === null) return <div style={{ padding: 30, textAlign: "center" }}>Cargando perfil...</div>;

  if (rol === "sin_acceso") {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <h2 style={{ color: "#dc2626" }}>Acceso Restringido</h2>
        <button onClick={cerrarSesion} style={{ padding: "10px 20px", cursor: "pointer" }}>Regresar</button>
      </div>
    );
  }

  // =========================================================
  // 🚀 RENDERIZADO DE LA INTERFAZ PRINCIPAL
  // =========================================================
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f1f5f9", overflow: "hidden" }}>
      
      {/* CABECERA CORPORATIVA FUTURISTA & SERIA */}
      <div style={{ 
        background: "linear-gradient(135deg, #1e0b36 0%, #0b0416 100%)", 
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)", 
        fontFamily: "Segoe UI, Tahoma, sans-serif", 
        flexShrink: 0,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)"
      }}>
        
        {/* BARRA SUPERIOR: Identidad, Usuario y Logout */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px" }}>
          
          {/* Lado Izquierdo: Logotipo protegido con Brillo en lugar de fondo blanco */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
            }}>
              <img 
                src="/logo-tridlab.png" 
                alt="TridLab" 
                style={{ 
                  height: "38px", 
                  objectFit: "contain", 
                  filter: "drop-shadow(0 0 10px rgba(6, 182, 212, 0.9))" // Brillo Neón en el Logo
                }} 
              />
            </div>
            <div style={{ borderLeft: "1px solid rgba(255, 255, 255, 0.15)", paddingLeft: "14px" }}>
              <h1 style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff", margin: 0, letterSpacing: "0.8px" }}>
                <span style={{ background: "linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</span> WEB
              </h1>
              <span style={{ fontSize: "11px", color: "#e9d5ff", fontWeight: "600", letterSpacing: "0.3px" }}>
                Laboratorio Clínico LIS
              </span>
            </div>
          </div>

          {/* Lado Derecho: Bloque de Perfil Humano */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#ffffff", letterSpacing: "0.3px" }}>
                {nombre ? nombre : session.user.email}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "3px" }}>
                {/* Badge de Seguridad con Estilo Cristal */}
                <span style={{ 
                  fontSize: "9px", 
                  backgroundColor: rol === "admin_lab" ? "rgba(239, 68, 68, 0.2)" : "rgba(168, 85, 247, 0.2)", 
                  color: rol === "admin_lab" ? "#fca5a5" : "#e9d5ff", 
                  border: `1px solid ${rol === "admin_lab" ? "rgba(239, 68, 68, 0.4)" : "rgba(168, 85, 247, 0.4)"}`,
                  padding: "2px 8px", 
                  borderRadius: "12px", 
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  {rol === "admin_lab" ? "🔑 Admin" : "🔬 Laboratorio"}
                </span>
                
                {/* Cargo Oficial Profesional */}
                <span style={{ fontSize: "11px", color: "#cbd5e1", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  • {cargo ? cargo : rol}
                </span>
              </div>
            </div>

            {/* Botón de Cierre de Sesión Nítido */}
            <button 
              onClick={cerrarSesion}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #f87171",
                color: "#f87171",
                padding: "6px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out"
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(248, 113, 113, 0.12)"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        {rol === "admin_lab" && (
          <div style={{ display: "flex", gap: "4px", padding: "8px 24px 0 24px", backgroundColor: "#f8fafc", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <button
              onClick={() => setTabAdmin("ordenes")}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "9px 20px", fontSize: "12px", fontWeight: "bold",
                border: "1px solid", borderColor: tabAdmin === "ordenes" ? "#cbd5e1" : "transparent", borderBottom: "none",
                backgroundColor: tabAdmin === "ordenes" ? "#ffffff" : "transparent", color: tabAdmin === "ordenes" ? "#2e0854" : "#64748b",
                borderTopLeftRadius: "6px", borderTopRightRadius: "6px", cursor: "pointer", position: "relative", top: "1px",
                zIndex: tabAdmin === "ordenes" ? 2 : 1, transition: "all 0.15s ease"
              }}
            >
              <span style={{ filter: tabAdmin === "ordenes" ? "none" : "grayscale(100%)" }}>📋</span> Gestión de Órdenes
            </button>

            <button
              onClick={() => setTabAdmin("rangos")}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "9px 20px", fontSize: "12px", fontWeight: "bold",
                border: "1px solid", borderColor: tabAdmin === "rangos" ? "#cbd5e1" : "transparent", borderBottom: "none",
                backgroundColor: tabAdmin === "rangos" ? "#ffffff" : "transparent", color: tabAdmin === "rangos" ? "#2e0854" : "#64748b",
                borderTopLeftRadius: "6px", borderTopRightRadius: "6px", cursor: "pointer", position: "relative", top: "1px",
                zIndex: tabAdmin === "rangos" ? 2 : 1, transition: "all 0.15s ease"
              }}
            >
              <span style={{ filter: tabAdmin === "rangos" ? "none" : "grayscale(100%)" }}>⚙️</span> Configuración
            </button>
          </div>
        )}
      </div>

      {/* CONTENEDOR OPERATIVO DE TRABAJO DEL LIS */}
      <div style={{ flex: 1, overflow: "hidden", padding: "6px" }}>
        {(rol === "laboratorista" || (rol === "admin_lab" && tabAdmin === "ordenes")) && <LabOrdenes rol={rol} />}
        {rol === "admin_lab" && tabAdmin === "rangos" && <AdminRangosGlobales />}
      </div>
    </div>
  );
}

// ==========================================
// 🚦 ENRUTADOR PRINCIPAL (APLICACIÓN)
// ==========================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. LA RAÍZ: Si entran a localhost o tridlab.com, el sistema los redirige de inmediato a /inicio */}
        <Route path="/" element={<Navigate to="/inicio" />} />
        
        {/* 2. NUEVA RUTA PÚBLICA DE PRESENTACIÓN */}
        <Route path="/inicio" element={<Inicio />} />
        
        {/* 3. RUTA PRIVADA DEL PERSONAL (Intranet TridLab) */}
        <Route path="/intranet-trd" element={<AdminPortal />} />
        
        {/* 4. PORTALES DE SERVICIO AL PÚBLICO E INSTITUCIONES */}
        <Route path="/resultados" element={<PacientePortal />} />
        <Route path="/convenios" element={<ConvenioPortal />} />
        <Route path="/verificar" element={<VerificarDocumento />} />

        {/* REDIRECCIÓN GLOBAL RESTRIGIDA: Si escriben una url rota, los devuelve a /inicio */}
        <Route path="*" element={<Navigate to="/inicio" />} />
      </Routes>
    </BrowserRouter>
  );
}