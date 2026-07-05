import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Inicio() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Formulario de contacto
  const [formContacto, setFormContacto] = useState({ nombre: "", correo: "", mensaje: "" });

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
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div style={{ backgroundColor: "transparent", fontFamily: "'Segoe UI', Roboto, sans-serif", color: theme.textPrimary, width: "100%", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      {/* 🚀 INICIO DE LA IMAGEN DE FONDO DIFUMINADA */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("/IMAGEN_3.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(8px)",
        transform: "scale(1.1)", 
        zIndex: 0 /* ✅ SOLUCIÓN: Cambiado a 0 para que no se oculte tras el fondo global */
      }} />
      
      {/* 🚀 CAPA OSCURA PARA MEJORAR EL CONTRASTE DE LAS LETRAS */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(10, 5, 20, 0.75)",
        zIndex: 1 /* ✅ SOLUCIÓN: Capa oscura en nivel 1 */
      }} />

      {/* 🚀 CONTENEDOR PRINCIPAL (TODO EL CONTENIDO VA SOBRE EL FONDO) */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", width: "100%" }}>
        
        {/* CSS GLOBAL */}
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          html, body, #root { 
            background-color: #0a0514; 
            color: #ffffff !important;
            height: auto !important;
            min-height: 100vh !important;
            overflow-y: auto !important; 
            overflow-x: hidden !important; 
            scroll-behavior: smooth !important; 
            scroll-padding-top: 80px !important;
            position: relative !important;
          }

          .hover-btn { transition: all 0.3s ease; }
          .hover-btn:hover { transform: translateY(-3px); filter: brightness(1.2); box-shadow: 0 10px 20px rgba(6, 182, 212, 0.4); }
          .nav-link { transition: color 0.3s; }
          .nav-link:hover { color: #06b6d4 !important; }
          
          .contact-input {
            width: 100%; padding: 12px 15px; border-radius: 8px; background: rgba(255,255,255,0.05); 
            border: 1px solid rgba(255,255,255,0.1); color: #fff; font-family: inherit; margin-bottom: 15px;
            outline: none; transition: border-color 0.3s;
          }
          .contact-input:focus { border-color: #06b6d4; background: rgba(255,255,255,0.1); }
        `}</style>

        {/* 🟢 NAVBAR FIJA */}
        <nav style={{ 
          position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000, 
          padding: scrolled ? "15px 40px" : "25px 40px",
          backgroundColor: scrolled ? theme.navBg : "transparent",
          backdropFilter: "blur(10px)", 
          borderBottom: scrolled ? `1px solid rgba(255,255,255,0.05)` : "1px solid transparent",
          display: "flex", justifyContent: "space-between", alignItems: "center", transition: "0.3s all"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => scrollToSection("inicio")}>
            <img src="/logo-tridlab.png" alt="Logo" style={{ height: "35px" }} />
            <span style={{ fontWeight: "900", fontSize: "22px", letterSpacing: "1px", background: theme.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              TRIDLAB
            </span>
          </div>
          
          {/* ENLACES Y BOTÓN EN EL ORDEN CORRECTO DEL SCROLL */}
          <div style={{ display: "flex", gap: "30px", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", alignItems: "center" }}>
            <span className="nav-link" style={{ cursor: "pointer", color: "#ffffff" }} onClick={() => scrollToSection("inicio")}>Inicio</span>
            <span className="nav-link" style={{ cursor: "pointer", color: "#ffffff" }} onClick={() => scrollToSection("nosotros")}>Nosotros</span>
            <span className="nav-link" style={{ cursor: "pointer", color: "#ffffff" }} onClick={() => scrollToSection("portales")}>Portales</span>
            <button 
               type="button"
               className="hover-btn"
               onClick={() => scrollToSection("contacto")}
               style={{ background: theme.accentGrad, border: "none", color: "#ffffff", padding: "10px 24px", borderRadius: "50px", fontWeight: "900", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
            >
              CONTÁCTANOS
            </button>
          </div>
        </nav>

        {/* 🔵 HERO SECTION */}
        <header id="inicio" style={{ 
          minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          background: `radial-gradient(circle at center, rgba(30, 27, 75, 0.6) 0%, rgba(10, 5, 20, 0.2) 100%)`, textAlign: "center", padding: "100px 20px 20px 20px"
        }}>
          <div style={{ fontSize: "50px", marginBottom: "15px" }}>🩺🧪</div>

          <h3 style={{ fontSize: "24px", fontWeight: "900", margin: "0 0 5px 0", color: "#f8fafc" }}>
            LABORATORIO CLÍNICO <span style={{ background: theme.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</span>
          </h3>
          <p style={{ color: theme.cyan, fontStyle: "italic", fontWeight: "700", marginBottom: "40px", fontSize: "14px" }}>
            ¡CIENCIA, SALUD Y TECNOLOGÍA A SU SERVICIO!
          </p>
          
          <h1 style={{ fontSize: "clamp(45px, 8vw, 80px)", fontWeight: "900", lineHeight: "1.1", margin: "0 0 20px 0", color: "#ffffff" }}>
            CIENCIA QUE <span style={{ color: theme.cyan }}>CONECTA</span><br/>CON TU SALUD
          </h1>
          
          <p style={{ maxWidth: "650px", fontSize: "16px", color: theme.textSecondary, marginBottom: "40px", lineHeight: "1.6", marginLeft: "auto", marginRight: "auto" }}>
            Redefinimos la experiencia médica combinando la más alta rigurosidad científica con un acceso digital inmediato, seguro y transparente.
          </p>
          
          <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
            <button type="button" className="hover-btn" onClick={() => scrollToSection("portales")} style={{ padding: "14px 35px", borderRadius: "50px", background: theme.accentGrad, border: "none", color: "#ffffff", fontWeight: "800", cursor: "pointer", fontSize: "15px" }}>Acceder a Portales</button>
            <button type="button" className="hover-btn" onClick={() => scrollToSection("contacto")} style={{ padding: "14px 35px", borderRadius: "50px", background: "transparent", border: "2px solid rgba(255,255,255,0.2)", color: "#ffffff", fontWeight: "800", cursor: "pointer", fontSize: "15px" }}>Contáctanos</button>
          </div>
        </header>

        {/* 🟣 SECCIÓN NOSOTROS (Historia, Misión y Visión) */}
        <section id="nosotros" style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          
          <div style={{ maxWidth: "1000px", width: "100%", textAlign: "center", marginBottom: "40px" }}>
             <h2 style={{ fontSize: "14px", color: theme.purple, fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px" }}>Nuestra Esencia</h2>
             <h3 style={{ fontSize: "36px", fontWeight: "900", color: "#fff", marginTop: "10px" }}>Ciencia con Calidad Humana</h3>
          </div>

          <div style={{ maxWidth: "1000px", width: "100%", display: "flex", flexDirection: "column", gap: "30px" }}>
            
            <div style={{ background: theme.card, borderRadius: "20px", padding: "40px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
              <h4 style={{ color: theme.cyan, fontSize: "20px", marginBottom: "15px", fontWeight: "800" }}>El Origen de TridLab</h4>
              <p style={{ color: theme.textSecondary, fontSize: "15px", lineHeight: "1.8" }}>
                Nuestra motivación nació de la experiencia en grandes hospitales, donde la eficiencia y velocidad a menudo eclipsaban la conexión humana. El punto de inflexión fue un diagnóstico crítico familiar retrasado por fallos administrativos. Allí entendimos nuestro propósito: crear un laboratorio donde la <strong>precisión científica</strong> sea la base, y la <strong>calidad humana</strong> en la atención al paciente sea la prioridad en <strong style={{ background: theme.accentGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>TRIDLAB</strong>.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
              <div style={{ background: theme.card, borderRadius: "20px", padding: "40px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
                <h4 style={{ color: theme.purple, fontSize: "20px", marginBottom: "15px", fontWeight: "800" }}>Nuestra Misión</h4>
                <p style={{ color: theme.textSecondary, fontSize: "15px", lineHeight: "1.8" }}>
                  Brindar diagnósticos clínicos de la más alta precisión y rapidez mediante tecnología de vanguardia, acompañados de un trato humano, cálido y empático. Nos comprometemos a entregar certidumbre a nuestros pacientes y respaldo absoluto a los médicos tratantes, siendo un eslabón vital donde la ciencia se une con la compasión.
                </p>
              </div>
              <div style={{ background: theme.card, borderRadius: "20px", padding: "40px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(5px)" }}>
                <h4 style={{ color: theme.cyan, fontSize: "20px", marginBottom: "15px", fontWeight: "800" }}>Nuestra Visión</h4>
                <p style={{ color: theme.textSecondary, fontSize: "15px", lineHeight: "1.8" }}>
                  Ser el referente en diagnóstico clínico en Guayaquil, un espacio donde la tecnología de vanguardia y la empatía humana convergen. Redefinimos la atención médica para entregar respuestas precisas, ágiles y transparentes cuando las personas más lo necesitan.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* 🟠 SECCIÓN PORTALES */}
        <section id="portales" style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.05))` }}>
          <div style={{ maxWidth: "1000px", width: "100%", textAlign: "center" }}>
            
            <h2 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "40px", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: "2px" }}>
              SELECCIONE EL PORTAL DE ACCESO SEGURO
            </h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "30px", justifyContent: "center" }}>
              
              <div style={{ background: theme.card, backdropFilter: "blur(5px)", borderRadius: "20px", padding: "50px 40px", border: `1px solid rgba(255,255,255,0.05)`, textAlign: "center", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "60px", marginBottom: "20px", textShadow: "0 0 20px rgba(6, 182, 212, 0.5)" }}>🌍</div>
                <h4 style={{ fontSize: "24px", fontWeight: "900", marginBottom: "15px", color: "#ffffff" }}>Portal de Pacientes</h4>
                <p style={{ fontSize: "14px", color: theme.textSecondary, marginBottom: "40px", lineHeight: "1.6", flex: 1 }}>
                  Consulte, visualice y descargue de forma directa su historial completo de resultados médicos desde la comodidad de su celular o computadora.
                </p>
                <button 
                  type="button"
                  className="hover-btn"
                  onClick={() => navigate("/resultados")}
                  style={{ width: "100%", padding: "16px", background: "#0284c7", color: "#ffffff", border: "none", borderRadius: "50px", fontWeight: "900", cursor: "pointer", fontSize: "15px" }}
                >
                  Ingresar como Paciente
                </button>
              </div>

              <div style={{ background: theme.card, backdropFilter: "blur(5px)", borderRadius: "20px", padding: "50px 40px", border: `1px solid rgba(255,255,255,0.05)`, textAlign: "center", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "60px", marginBottom: "20px", textShadow: "0 0 20px rgba(217, 70, 239, 0.5)" }}>🤝</div>
                <h4 style={{ fontSize: "24px", fontWeight: "900", marginBottom: "15px", color: "#ffffff" }}>Portal Institucional</h4>
                <p style={{ fontSize: "14px", color: theme.textSecondary, marginBottom: "40px", lineHeight: "1.6", flex: 1 }}>
                  Zona B2B exclusiva para empresas, clínicas y laboratorios aliados. Gestione y audite de forma masiva los análisis de sus pacientes vinculados.
                </p>
                <button 
                  type="button"
                  className="hover-btn"
                  onClick={() => navigate("/convenios")}
                  style={{ width: "100%", padding: "16px", background: "transparent", color: theme.cyan, border: `2px solid ${theme.cyan}`, borderRadius: "50px", fontWeight: "900", cursor: "pointer", fontSize: "15px" }}
                >
                  Acceso Convenios
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* 📞 NUEVA SECCIÓN: CONTÁCTANOS */}
        <section id="contacto" style={{ padding: "80px 20px", display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: "1000px", width: "100%" }}>
            <h2 style={{ fontSize: "36px", fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: "40px" }}>CONTÁCTANOS</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "50px" }}>
              
              <div>
                <h4 style={{ fontSize: "20px", fontWeight: "800", color: theme.cyan, marginBottom: "20px" }}>Información de Contacto</h4>
                <p style={{ color: theme.textSecondary, fontSize: "15px", marginBottom: "30px", lineHeight: "1.6" }}>
                  Estamos listos para atender tus dudas, agendar citas o brindarte soporte con nuestro portal digital.
                </p>
                
                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📍</div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>Nuestra Ubicación</div>
                    <div style={{ color: theme.textSecondary, fontSize: "13px" }}>Guayaquil, Ecuador</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(217, 70, 239, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📞</div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>Teléfono / WhatsApp</div>
                    <div style={{ color: theme.textSecondary, fontSize: "13px" }}>+593 99 999 9999</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>✉️</div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>Correo Electrónico</div>
                    <div style={{ color: theme.textSecondary, fontSize: "13px" }}>info@tridlab.com</div>
                  </div>
                </div>
              </div>

              <div style={{ background: theme.card, backdropFilter: "blur(5px)", padding: "30px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <form onSubmit={(e) => { e.preventDefault(); alert("¡Mensaje enviado correctamente! Nos pondremos en contacto pronto."); setFormContacto({nombre:"", correo:"", mensaje:""}); }}>
                  <label style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "5px", display: "block" }}>Nombre Completo</label>
                  <input type="text" className="contact-input" required value={formContacto.nombre} onChange={e => setFormContacto({...formContacto, nombre: e.target.value})} placeholder="Ej. Ana Pérez" />

                  <label style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "5px", display: "block" }}>Correo Electrónico</label>
                  <input type="email" className="contact-input" required value={formContacto.correo} onChange={e => setFormContacto({...formContacto, correo: e.target.value})} placeholder="ejemplo@correo.com" />

                  <label style={{ fontSize: "12px", color: theme.textSecondary, marginBottom: "5px", display: "block" }}>¿En qué podemos ayudarte?</label>
                  <textarea className="contact-input" required value={formContacto.mensaje} onChange={e => setFormContacto({...formContacto, mensaje: e.target.value})} rows="4" placeholder="Escribe tu mensaje aquí..." style={{ resize: "none" }}></textarea>

                  <button type="submit" className="hover-btn" style={{ width: "100%", padding: "14px", background: theme.accentGrad, color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}>
                    Enviar Mensaje
                  </button>
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

      </div> {/* FIN DEL CONTENEDOR PRINCIPAL Z-INDEX 2 */}
    </div>
  );
}