import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";

export default function Inicio() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false); 

  // Formulario de contacto
  const [formContacto, setFormContacto] = useState({ nombre: "", correo: "", mensaje: "" });
  
  // Estados para el CAPTCHA y el envío
  const [mostrarCaptcha, setMostrarCaptcha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const theme = {
    bg: "#0a0514", 
    navBg: "rgba(10, 5, 20, 0.95)",
    card: "rgba(18, 11, 41, 0.85)", 
    textPrimary: "#ffffff", 
    textSecondary: "#94a3b8", 
    cyan: "#06b6d4",
    purple: "#d946ef",
    accentGrad: "linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)"
  };

  const scrollToSection = (id) => {
    setMenuAbierto(false); // Cierra el menú en móvil al hacer clic
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const procesarEnvioFinal = async (captchaToken) => {
    if (!captchaToken) return; 
    
    setEnviando(true);
    try {
      const respuesta = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: "service_cbxm29h",
          template_id: "template_qrgmvtc", 
          user_id: "UKANIhXTZLFz73ikU",
          template_params: {
            name: formContacto.nombre,       
            email: formContacto.correo,      
            message: formContacto.mensaje,
            "g-recaptcha-response": captchaToken
          }
        })
      });

      if (respuesta.ok) {
        alert("Mensaje enviado correctamente. Nos pondremos en contacto pronto."); 
        setFormContacto({nombre:"", correo:"", mensaje:""});
        setMostrarCaptcha(false);
      } else {
        alert("Hubo un problema al enviar el mensaje. Inténtelo más tarde.");
      }
    } catch (error) {
      alert("Error de conexión. Por favor, revise su red.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ backgroundColor: theme.bg, fontFamily: "'Segoe UI', Roboto, sans-serif", color: theme.textPrimary, width: "100%", display: "flex", flexDirection: "column", minHeight: "100vh", position: "relative" }}>
      
      {/* 🚀 FONDO EN POSICIÓN -1 PARA NO BLOQUEAR NINGÚN TOQUE EN LA PANTALLA */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: -1, pointerEvents: "none" }}>
        <div style={{ width: "100%", height: "100%", backgroundImage: 'url("/IMAGEN_3.png")', backgroundSize: "cover", backgroundPosition: "center", filter: "blur(8px)", transform: "scale(1.1)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(10, 5, 20, 0.75)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
        
        {/* 🔥 REGLA MAESTRA PARA FORZAR EL SCROLL EN REACT (CRÍTICO PARA CHROME MÓVIL) 🔥 */}
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          html, body, #root { 
            background-color: #0a0514 !important; 
            color: #ffffff !important; 
            width: 100% !important;
            height: auto !important; 
            min-height: 100vh !important;
            overflow-x: hidden !important; /* Bloquea el desbordamiento a los lados */
            overflow-y: auto !important;   /* 🔥 FUERZA EL SCROLL VERTICAL 🔥 */
            scroll-behavior: smooth !important; 
            -webkit-overflow-scrolling: touch !important; /* Deslizamiento suave en móviles */
          }

          .hover-btn { transition: all 0.3s ease; }
          .hover-btn:hover { transform: translateY(-3px); filter: brightness(1.2); box-shadow: 0 10px 20px rgba(6, 182, 212, 0.4); }
          .nav-link { transition: color 0.3s; color: #ffffff; cursor: pointer; }
          .nav-link:hover { color: #06b6d4 !important; }
          
          .contact-input {
            width: 100%; padding: 12px 15px; border-radius: 8px; background: rgba(255,255,255,0.05); 
            border: 1px solid rgba(255,255,255,0.1); color: #fff; font-family: inherit; margin-bottom: 15px;
            outline: none; transition: border-color 0.3s;
          }
          .contact-input:focus { border-color: #06b6d4; background: rgba(255,255,255,0.1); }
          .contact-input:disabled { opacity: 0.6; cursor: not-allowed; }

          /* ⚙️ ESCRITORIO */
          .desktop-nav { display: flex; align-items: center; gap: 30px; font-weight: 700; font-size: 13px; text-transform: uppercase; }
          .mobile-menu-btn { display: none; background: none; border: none; color: white; font-size: 32px; cursor: pointer; padding: 5px; }
          .mobile-nav-overlay { display: none; }
          
          .hero-title { font-size: clamp(35px, 8vw, 80px); }
          .section-padding { padding: 80px 20px; }

          /* ⚙️ MÓVILES */
          @media (max-width: 850px) {
            .desktop-nav { display: none !important; }
            .mobile-menu-btn { display: block; z-index: 1001; position: relative; }
            .hero-buttons { flex-direction: column; width: 100%; gap: 15px !important; }
            .hero-buttons button { width: 100%; }
            .section-padding { padding: 60px 15px; }
            
            .mobile-nav-overlay {
              display: flex !important; 
              flex-direction: column !important; 
              justify-content: center !important; 
              align-items: center !important; 
              position: fixed !important; 
              top: 0 !important; 
              left: 0 !important; 
              width: 100vw !important; 
              height: 100vh !important;
              height: 100dvh !important;
              background: rgba(10, 5, 20, 0.98) !important; 
              z-index: 999 !important; 
              gap: 30px !important;
              opacity: 0; 
              pointer-events: none; 
              transition: opacity 0.3s ease;
            }
            .mobile-nav-overlay.open { opacity: 1; pointer-events: auto; }
          }
        `}</style>

        {/* 🟢 NAVBAR ADAPTATIVA */}
        <nav style={{ 
          position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000, 
          padding: scrolled ? "15px 20px" : "25px 20px",
          backgroundColor: scrolled || menuAbierto ? theme.navBg : "transparent",
          backdropFilter: "blur(10px)", borderBottom: scrolled || menuAbierto ? `1px solid rgba(255,255,255,0.05)` : "1px solid transparent",
          display: "flex", justifyContent: "space-between", alignItems: "center", transition: "0.3s all"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", zIndex: 1001 }} onClick={() => scrollToSection("inicio")}>
            <img src="/logo-tridlab.png" alt="Logo" style={{ height: "35px" }} />
            <span style={{ fontWeight: "900", fontSize: "22px", letterSpacing: "1px", background: theme.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              TRIDLAB
            </span>
          </div>
          
          {/* ENLACES ESCRITORIO */}
          <div className="desktop-nav">
            <span className="nav-link" onClick={() => scrollToSection("inicio")}>Inicio</span>
            <span className="nav-link" onClick={() => scrollToSection("nosotros")}>Nosotros</span>
            <span className="nav-link" onClick={() => scrollToSection("portales")}>Portales</span>
            <button type="button" className="hover-btn" onClick={() => scrollToSection("contacto")} style={{ background: theme.accentGrad, border: "none", color: "#ffffff", padding: "10px 24px", borderRadius: "50px", fontWeight: "900", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}>
              CONTÁCTANOS
            </button>
          </div>

          {/* BOTÓN HAMBURGUESA MÓVIL */}
          <button className="mobile-menu-btn" onClick={() => setMenuAbierto(!menuAbierto)}>
            {menuAbierto ? "✕" : "☰"}
          </button>
        </nav>

        {/* 📱 MENÚ DESPLEGABLE MÓVIL */}
        <div className={`mobile-nav-overlay ${menuAbierto ? 'open' : ''}`}>
          <span className="nav-link" style={{ fontSize: "22px", fontWeight: "bold" }} onClick={() => scrollToSection("inicio")}>Inicio</span>
          <span className="nav-link" style={{ fontSize: "22px", fontWeight: "bold" }} onClick={() => scrollToSection("nosotros")}>Nosotros</span>
          <span className="nav-link" style={{ fontSize: "22px", fontWeight: "bold" }} onClick={() => scrollToSection("portales")}>Portales</span>
          <button type="button" className="hover-btn" onClick={() => scrollToSection("contacto")} style={{ background: theme.accentGrad, border: "none", color: "#ffffff", padding: "15px 40px", borderRadius: "50px", fontWeight: "900", cursor: "pointer", fontSize: "16px", marginTop: "20px" }}>
            CONTÁCTANOS
          </button>
        </div>

        {/* 🔵 HERO SECTION */}
        <header id="inicio" style={{ 
          minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          background: `radial-gradient(circle at center, rgba(30, 27, 75, 0.6) 0%, rgba(10, 5, 20, 0.2) 100%)`, textAlign: "center", padding: "100px 15px 40px 15px"
        }}>
          <div style={{ fontSize: "50px", marginBottom: "15px" }}>🩺🧪</div>

          <h3 style={{ fontSize: "clamp(18px, 4vw, 24px)", fontWeight: "900", margin: "0 0 5px 0", color: "#f8fafc" }}>
            LABORATORIO CLÍNICO <span style={{ background: theme.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</span>
          </h3>
          <p style={{ color: theme.cyan, fontStyle: "italic", fontWeight: "700", marginBottom: "40px", fontSize: "clamp(12px, 3vw, 14px)" }}>
            ¡CIENCIA, SALUD Y TECNOLOGÍA A SU SERVICIO!
          </p>
          
          <h1 className="hero-title" style={{ fontWeight: "900", lineHeight: "1.1", margin: "0 0 20px 0", color: "#ffffff" }}>
            CIENCIA QUE <span style={{ color: theme.cyan }}>CONECTA</span><br/>CON TU SALUD
          </h1>
          
          <p style={{ maxWidth: "650px", fontSize: "clamp(14px, 4vw, 16px)", color: theme.textSecondary, marginBottom: "40px", lineHeight: "1.6", marginInline: "auto" }}>
            Redefinimos la experiencia médica combinando la más alta rigurosidad científica con un acceso digital inmediato, seguro y transparente.
          </p>
          
          <div className="hero-buttons" style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="hover-btn" onClick={() => scrollToSection("portales")} style={{ padding: "14px 35px", borderRadius: "50px", background: theme.accentGrad, border: "none", color: "#ffffff", fontWeight: "800", cursor: "pointer", fontSize: "15px", whiteSpace: "nowrap" }}>Acceder a Portales</button>
            <button type="button" className="hover-btn" onClick={() => scrollToSection("contacto")} style={{ padding: "14px 35px", borderRadius: "50px", background: "transparent", border: "2px solid rgba(255,255,255,0.2)", color: "#ffffff", fontWeight: "800", cursor: "pointer", fontSize: "15px", whiteSpace: "nowrap" }}>Contáctanos</button>
          </div>
        </header>

        {/* 🟣 SECCIÓN NOSOTROS */}
        <section id="nosotros" className="section-padding" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: "1000px", width: "100%", textAlign: "center", marginBottom: "40px" }}>
             <h2 style={{ fontSize: "14px", color: theme.purple, fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px" }}>Nuestra Esencia</h2>
             <h3 style={{ fontSize: "clamp(26px, 6vw, 36px)", fontWeight: "900", color: "#fff", marginTop: "10px" }}>Ciencia con Calidad Humana</h3>
          </div>

          <div style={{ maxWidth: "1000px", width: "100%", display: "flex", flexDirection: "column", gap: "30px" }}>
            <div style={{ background: theme.card, borderRadius: "20px", padding: "clamp(20px, 5vw, 40px)", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
              <h4 style={{ color: theme.cyan, fontSize: "20px", marginBottom: "15px", fontWeight: "800" }}>El Origen de TridLab</h4>
              <p style={{ color: theme.textSecondary, fontSize: "15px", lineHeight: "1.8" }}>
                Nuestra motivación nació de la experiencia en grandes hospitales, donde la eficiencia y velocidad a menudo eclipsaban la conexión humana. El punto de inflexión fue un diagnóstico crítico familiar retrasado por fallos administrativos. Allí entendimos nuestro propósito: crear un laboratorio donde la <strong>precisión científica</strong> sea la base, y la <strong>calidad humana</strong> en la atención al paciente sea la prioridad en <strong style={{ background: theme.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</strong>.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px" }}>
              <div style={{ background: theme.card, borderRadius: "20px", padding: "clamp(20px, 5vw, 40px)", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
                <h4 style={{ color: theme.purple, fontSize: "20px", marginBottom: "15px", fontWeight: "800" }}>Nuestra Misión</h4>
                <p style={{ color: theme.textSecondary, fontSize: "15px", lineHeight: "1.8" }}>
                  Brindar diagnósticos clínicos de la más alta precisión y rapidez mediante tecnología de vanguardia, acompañados de un trato humano, cálido y empático. Nos comprometemos a entregar certidumbre a nuestros pacientes y respaldo absoluto a los médicos tratantes, siendo un eslabón vital donde la ciencia se une con la compasión.
                </p>
              </div>
              <div style={{ background: theme.card, borderRadius: "20px", padding: "clamp(20px, 5vw, 40px)", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
                <h4 style={{ color: theme.cyan, fontSize: "20px", marginBottom: "15px", fontWeight: "800" }}>Nuestra Visión</h4>
                <p style={{ color: theme.textSecondary, fontSize: "15px", lineHeight: "1.8" }}>
                  Ser el referente en diagnóstico clínico en Guayaquil, un espacio donde la tecnología de vanguardia y la empatía humana convergen. Redefinimos la atención médica para entregar respuestas precisas, ágiles y transparentes cuando las personas más lo necesitan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 🟠 SECCIÓN PORTALES */}
        <section id="portales" className="section-padding" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.05))` }}>
          <div style={{ maxWidth: "1000px", width: "100%", textAlign: "center" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "40px", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: "2px" }}>
              SELECCIONE EL PORTAL DE ACCESO SEGURO
            </h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px", justifyContent: "center" }}>
              <div style={{ background: theme.card, backdropFilter: "blur(5px)", borderRadius: "20px", padding: "40px 30px", border: `1px solid rgba(255,255,255,0.05)`, textAlign: "center", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "60px", marginBottom: "20px", textShadow: "0 0 20px rgba(6, 182, 212, 0.5)" }}>🌍</div>
                <h4 style={{ fontSize: "24px", fontWeight: "900", marginBottom: "15px", color: "#ffffff" }}>Portal de Pacientes</h4>
                <p style={{ fontSize: "14px", color: theme.textSecondary, marginBottom: "40px", lineHeight: "1.6", flex: 1 }}>
                  Consulte, visualice y descargue de forma directa su historial completo de resultados médicos desde la comodidad de su celular o computadora.
                </p>
                <button type="button" className="hover-btn" onClick={() => navigate("/resultados")} style={{ width: "100%", padding: "16px", background: "#0284c7", color: "#ffffff", border: "none", borderRadius: "50px", fontWeight: "900", cursor: "pointer", fontSize: "15px" }}>
                  Ingresar como Paciente
                </button>
              </div>

              <div style={{ background: theme.card, backdropFilter: "blur(5px)", borderRadius: "20px", padding: "40px 30px", border: `1px solid rgba(255,255,255,0.05)`, textAlign: "center", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "60px", marginBottom: "20px", textShadow: "0 0 20px rgba(217, 70, 239, 0.5)" }}>🤝</div>
                <h4 style={{ fontSize: "24px", fontWeight: "900", marginBottom: "15px", color: "#ffffff" }}>Portal Institucional</h4>
                <p style={{ fontSize: "14px", color: theme.textSecondary, marginBottom: "40px", lineHeight: "1.6", flex: 1 }}>
                  Zona B2B exclusiva para empresas, clínicas y laboratorios aliados. Gestione y audite de forma masiva los análisis de sus pacientes vinculados.
                </p>
                <button type="button" className="hover-btn" onClick={() => navigate("/convenios")} style={{ width: "100%", padding: "16px", background: "transparent", color: theme.cyan, border: `2px solid ${theme.cyan}`, borderRadius: "50px", fontWeight: "900", cursor: "pointer", fontSize: "15px" }}>
                  Acceso Convenios
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 📞 SECCIÓN: CONTÁCTANOS */}
        <section id="contacto" className="section-padding" style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: "1000px", width: "100%" }}>
            <h2 style={{ fontSize: "clamp(28px, 6vw, 36px)", fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: "40px" }}>CONTÁCTANOS</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "40px" }}>
              <div>
                <h4 style={{ fontSize: "20px", fontWeight: "800", color: theme.cyan, marginBottom: "20px" }}>Información de Contacto</h4>
                <p style={{ color: theme.textSecondary, fontSize: "15px", marginBottom: "30px", lineHeight: "1.6" }}>
                  Estamos listos para atender tus dudas, agendar citas o brindarte soporte con nuestro portal digital.
                </p>
                
                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>📍</div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>Nuestra Ubicación</div>
                    <div style={{ color: theme.textSecondary, fontSize: "13px" }}>Guayaquil, Ecuador</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(217, 70, 239, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>📞</div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>Teléfono / WhatsApp</div>
                    <div style={{ color: theme.textSecondary, fontSize: "13px" }}>+593 99 999 9999</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>✉️</div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>Correo Electrónico</div>
                    <div style={{ color: theme.textSecondary, fontSize: "13px" }}>info@tridlab.com</div>
                  </div>
                </div>
              </div>

              <div style={{ background: theme.card, backdropFilter: "blur(5px)", padding: "clamp(20px, 5vw, 30px)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <form onSubmit={(e) => e.preventDefault()}>
                  <label style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "5px", display: "block" }}>Nombre Completo</label>
                  <input type="text" className="contact-input" required value={formContacto.nombre} onChange={e => setFormContacto({...formContacto, nombre: e.target.value})} placeholder="Ej. Ana Pérez" disabled={mostrarCaptcha} />

                  <label style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "5px", display: "block" }}>Correo Electrónico</label>
                  <input type="email" className="contact-input" required value={formContacto.correo} onChange={e => setFormContacto({...formContacto, correo: e.target.value})} placeholder="ejemplo@correo.com" disabled={mostrarCaptcha} />

                  <label style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "5px", display: "block" }}>¿En qué podemos ayudarte?</label>
                  <textarea className="contact-input" required value={formContacto.mensaje} onChange={e => setFormContacto({...formContacto, mensaje: e.target.value})} rows="4" placeholder="Escribe tu mensaje aquí..." style={{ resize: "none" }} disabled={mostrarCaptcha}></textarea>

                  {!mostrarCaptcha ? (
                    <button type="button" className="hover-btn" onClick={() => { if(formContacto.nombre && formContacto.correo && formContacto.mensaje) { setMostrarCaptcha(true); } else { alert("Por favor, llena todos los campos antes de enviar."); } }} style={{ width: "100%", padding: "14px", background: theme.accentGrad, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}>
                      Enviar Mensaje
                    </button>
                  ) : (
                    <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      {enviando ? (
                        <span style={{ color: theme.cyan, fontWeight: "bold", fontSize: "14px", textAlign: "center" }}>Enviando mensaje...</span>
                      ) : (
                        <>
                          <span style={{ color: theme.textSecondary, fontSize: "12px", textAlign: "center" }}>Confirma que eres humano para enviar:</span>
                          <div style={{ transform: "scale(0.85)", transformOrigin: "center" }}>
                            <ReCAPTCHA sitekey="6LcfIkwtAAAAABjmTmzI-feWVVYQfl6FsPc7qKkj" onChange={procesarEnvioFinal} theme="dark" />
                          </div>
                          <button type="button" onClick={() => setMostrarCaptcha(false)} style={{ background: "transparent", color: theme.textSecondary, border: "none", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}>
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </form>
              </div>

            </div>
          </div>
        </section>

        {/* 🔴 PIE DE PÁGINA */}
        <footer style={{ padding: "40px 20px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)", background: "#05020a", marginTop: "auto" }}>
          <p style={{ color: theme.textSecondary, fontSize: "12px", fontWeight: "600" }}>
            © {new Date().getFullYear()} Laboratorio Clínico <strong style={{ background: theme.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</strong>. Todos los derechos reservados.
          </p>
        </footer>

      </div>
    </div>
  );
}