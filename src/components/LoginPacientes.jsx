import React, { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../supabaseClient";

const TECH_THEME = {
  bgGradient: "linear-gradient(135deg, #110f35 0%, #1a032e 100%)", 
  accentBlue: "#0ea5e9",   
  accentPurple: "#d946ef", 
  textWhite: "#ffffff",
  textDim: "rgba(255, 255, 255, 0.6)",
  glassBg: "rgba(15, 23, 42, 0.8)", 
  glassBorder: "rgba(255, 255, 255, 0.12)", 
  logoFlare: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)",
};

export default function LoginPacientes({ onLoginSuccess, onVolver }) {
  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (cedula.trim().length < 10) return toast.error("Cédula incompleta.");
    if (!pin.trim()) return toast.error("Ingrese su PIN.");

    setLoading(true);
    try {
      // LLAMADA A LA FUNCIÓN SEGURA RPC
      const { data, error } = await supabase
        .rpc("login_paciente_seguro", { 
          p_cedula: cedula.trim(), 
          p_pin: pin.trim() 
        })
        .maybeSingle();

      if (!data) {
        toast.error("Credenciales incorrectas.");
        setLoading(false);
        return;
      }

      toast.success(`Bienvenido, ${data.nombre}`);
      
      // Añadimos el PIN al objeto para que PortalPacientes lo pueda usar en las consultas seguras
      const authData = { ...data, pin_secreto: pin.trim() };
      
      localStorage.setItem("tridlab_paciente_auth", JSON.stringify(authData));
      onLoginSuccess(authData);
    } catch (error) {
      toast.error("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper" style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center", 
      background: TECH_THEME.bgGradient, // Funciona como color de respaldo
      fontFamily: "'Inter', system-ui, sans-serif",
      color: TECH_THEME.textWhite,
      padding: "20px",
      boxSizing: "border-box", 
      position: "relative",
      overflowX: "hidden",
      width: "100%"
    }}>
      
      {/* 🚀 INICIO DE LA IMAGEN DE FONDO DIFUMINADA */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: "url('/IMAGEN 2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(8px)",
        transform: "scale(1.1)", /* Evita bordes blancos por el desenfoque */
        zIndex: 1
      }} />
      
      {/* 🚀 CAPA OSCURA PARA MEJORAR EL CONTRASTE DE LA TARJETA DE CRISTAL */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(10, 5, 20, 0.5)",
        zIndex: 2
      }} />
      {/* FIN DEL FONDO */}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        
        .login-wrapper * {
          box-sizing: border-box !important;
        }

        input::placeholder { color: rgba(255,255,255,0.3); letter-spacing: normal; }
        
        .login-card {
           padding: 50px 40px;
           width: 100%;
           max-width: 420px;
        }

        .eye-btn { 
          color: #94a3b8; 
          transition: 0.2s; 
          opacity: 0.8;
        }
        .eye-btn:hover { 
          color: #f1f5f9; 
          transform: translateY(-50%) scale(1.1) !important; 
          opacity: 1;
        }

        @media (max-width: 480px) {
           .login-card { padding: 40px 25px; }
           .btn-volver { top: 20px !important; left: 20px !important; font-size: 13px !important; }
           .login-title { font-size: 28px !important; }
        }
      `}</style>

      {onVolver && (
        <button 
          className="btn-volver"
          onClick={onVolver}
          style={{ position: "absolute", top: "30px", left: "30px", background: "none", border: "none", color: TECH_THEME.textWhite, fontWeight: "600", cursor: "pointer", fontSize: "14px", transition: "0.3s", zIndex: 10, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          ← Regresar
        </button>
      )}

      <div className="login-card" style={{ 
        background: TECH_THEME.glassBg, 
        backdropFilter: "blur(20px)", 
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "32px", 
        border: `1px solid ${TECH_THEME.glassBorder}`,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        textAlign: "center",
        zIndex: 5,
        position: "relative"
      }}>
        
        <div style={{ marginBottom: "35px" }}>
          <img 
            src="/logo-tridlab.png" 
            alt="TridLab" 
            style={{ height: "90px", marginBottom: "15px", filter: "drop-shadow(0 0 20px rgba(14, 165, 233, 0.2))" }} 
          />
          <p style={{ margin: "0 0 5px 0", color: TECH_THEME.accentBlue, fontSize: "10px", fontWeight: "800", letterSpacing: "2px", textTransform: "uppercase" }}>
            Laboratorio Clínico <strong style={{ background: `linear-gradient(135deg, ${TECH_THEME.accentBlue} 0%, ${TECH_THEME.accentPurple} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</strong>
          </p>
          <h1 className="login-title" style={{ margin: "0", fontSize: "32px", fontWeight: "800", color: "#fff" }}>
            Portal de Resultados
          </h1>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ textAlign: "left" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: TECH_THEME.textDim, textTransform: "uppercase", marginLeft: "4px" }}>Número de Cédula</label>
            <input 
              type="text" 
              maxLength={10}
              placeholder="09XXXXXXXX"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))} 
              style={{ 
                width: "100%", padding: "15px", marginTop: "8px", borderRadius: "16px", 
                background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", 
                color: "#fff", fontSize: "16px", outline: "none", transition: "0.3s"
              }}
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: TECH_THEME.textDim, textTransform: "uppercase", marginLeft: "4px" }}>PIN de Acceso</label>
            <div style={{ position: "relative", marginTop: "8px" }}>
              <input 
                type={showPin ? "text" : "password"} 
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                style={{ 
                  width: "100%", padding: "15px", paddingRight: "45px", borderRadius: "16px", 
                  background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", 
                  color: "#fff", fontSize: "16px", outline: "none", letterSpacing: showPin ? "2px" : "8px"
                }}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", display: "flex", padding: "8px"
                }}
              >
                {showPin ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            <p style={{ margin: "8px 0 0 5px", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>El PIN está en su comprobante de pago.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: "10px", width: "100%", padding: "18px", 
              background: loading ? "#475569" : `linear-gradient(135deg, ${TECH_THEME.accentBlue}, ${TECH_THEME.accentPurple})`, 
              color: "#fff", border: "none", borderRadius: "16px", fontSize: "14px", 
              fontWeight: "800", cursor: loading ? "not-allowed" : "pointer", 
              boxShadow: "0 10px 20px -10px rgba(217, 70, 239, 0.4)",
              textTransform: "uppercase", letterSpacing: "1px"
            }}
          >
            {loading ? "Entrando..." : "Acceder a mis Resultados"}
          </button>
        </form>

        <footer style={{ marginTop: "35px", fontSize: "10px", opacity: 0.4, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "15px" }}>
          © 2026 <strong style={{ background: `linear-gradient(135deg, ${TECH_THEME.accentBlue} 0%, ${TECH_THEME.accentPurple} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</strong> Technology
        </footer>
      </div>
    </div>
  );
}