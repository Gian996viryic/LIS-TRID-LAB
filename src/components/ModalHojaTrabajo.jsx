import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { asignarAreaY_Tubo } from "./LabOrdenes"; 

function estimarFechaNacimiento(edadStr) {
  if (!edadStr) return "01-01-2000";
  const edad = Number(String(edadStr).replace(/[^0-9]/g, ''));
  if (isNaN(edad) || edad <= 0) return "01-01-2000";
  const anioNacimiento = new Date().getFullYear() - edad;
  return `01-01-${anioNacimiento}`;
}

const esExamenAgrupado = (nombreExamen) => {
  if (!nombreExamen) return false;
  const n = nombreExamen.toUpperCase();
  return n.includes("HEMOGRAMA") || 
         n.includes("URO") || n.includes("EMO") || n.includes("SEDIMENTO") ||
         n.includes("COPRO") || n.includes("PARASITO") || n.includes("HECES") ||
         n.includes("CULTIVO");
};

function formatearFirmaCargo(nombre, cargo) {
  if (!nombre) return "Responsable TridLab";
  const nombreLimpio = nombre.toUpperCase();
  
  if (!cargo) return nombreLimpio;
  
  const c = cargo.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  let prefijo = "";
  if (c.includes("QUIMICO FARMACEUTICO") || c === "QF" || c === "Q.F") prefijo = "Q.F. ";
  else if (c.includes("LICENCIAD")) prefijo = "Lic. ";
  else if (c.includes("TECNOLOGO MEDICO") || c.includes("TECNOLOGA MEDICA")) prefijo = "Tec. Med. ";
  else if (c.includes("DOCTOR") || c.includes("MEDICO")) prefijo = "Dr. ";
  
  return `${prefijo}${nombreLimpio}`.trim();
}

export default function ModalHojaTrabajo({ isOpen, onClose, ordenes, areaActiva, filtroPrueba }) {
  const [filasTrabajo, setFilasTrabajo] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [verCedula, setVerCedula] = useState(true);
  const [verNombre, setVerNombre] = useState(true);
  const [verEdad, setVerEdad] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("TODAS"); 
  
  const [pruebasDisponibles, setPruebasDisponibles] = useState([]);
  const [pruebasActivas, setPruebasActivas] = useState([]);
  const [dropdownAbierto, setDropdownAbierto] = useState(false); 
  
  const [busquedaPrueba, setBusquedaPrueba] = useState("");
  const [fechaImpresion, setFechaImpresion] = useState("");

  const [fechasExactasMap, setFechasExactasMap] = useState({});

  const [usuarioLogueado, setUsuarioLogueado] = useState({
    nombre: "Responsable TridLab",
    cargo: ""
  });

  useEffect(() => {
    if (isOpen && ordenes && ordenes.length > 0) {
      setFechaImpresion(new Date().toLocaleString());
      cargarDatosPruebas();
      obtenerUsuarioFirma();
    }
  }, [isOpen, ordenes]);

  async function obtenerUsuarioFirma() {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        const { data: userData } = await supabase
          .from("lab_usuarios")
          .select("nombre, cargo")
          .eq("id", authData.user.id)
          .single();

        if (userData) {
          setUsuarioLogueado({
            nombre: userData.nombre || "Responsable TridLab",
            cargo: userData.cargo || ""
          });
        }
      }
    } catch (error) {
      console.error("No se pudo obtener la firma del usuario", error);
    }
  }

  async function cargarDatosPruebas() {
    setCargando(true);
    try {
      const idsOrdenes = ordenes.map(o => o.id);
      
      const cedulasOrdenes = [...new Set(ordenes.map(o => o.paciente_cedula).filter(Boolean))];
      let mapaFechas = {};
      
      if (cedulasOrdenes.length > 0) {
        const { data: pacientesData, error: pacError } = await supabase
          .from("lab_pacientes")
          .select("cedula, fecha_nacimiento")
          .in("cedula", cedulasOrdenes);

        if (!pacError && pacientesData) {
          pacientesData.forEach(p => {
            if (p.fecha_nacimiento) {
              const [anio, mes, dia] = p.fecha_nacimiento.split('-');
              mapaFechas[p.cedula] = `${dia}-${mes}-${anio}`;
            }
          });
        }
      }
      setFechasExactasMap(mapaFechas);

      let query = supabase.from("lab_orden_resultados")
        .select("orden_id, grupo_nombre, nombre_examen, nombre_analito, resultado_numero, resultado_texto, validado")
        .in("orden_id", idsOrdenes);

      if (areaActiva !== "TODAS LAS ÁREAS") query = query.ilike("grupo_nombre", areaActiva);
      if (filtroPrueba && filtroPrueba !== "TODAS") query = query.ilike("nombre_examen", filtroPrueba);

      const { data, error } = await query;
      if (error) throw error;

      const filasPreAgrupadas = [];
      const setDeduplicacion = new Set();

      data.forEach(resultado => {
        const ordenMadre = ordenes.find(o => o.id === resultado.orden_id);
        if (!ordenMadre) return;

        const nomExamen = (resultado.nombre_examen || "EXAMEN").toUpperCase();
        const nomAnalito = (resultado.nombre_analito || "").toUpperCase();
        const valorReal = resultado.resultado_numero !== null ? resultado.resultado_numero : (resultado.resultado_texto || "");
        
        let pruebaMostrar = "";
        let resultadoMostrar = valorReal;

        if (esExamenAgrupado(nomExamen)) {
          pruebaMostrar = nomExamen; 
          resultadoMostrar = ""; 
        } else {
          if (!nomAnalito || nomExamen === nomAnalito) {
            pruebaMostrar = nomExamen; 
          } else {
            pruebaMostrar = `${nomExamen} (${nomAnalito})`; 
          }
        }

        const uniqueKey = `${ordenMadre.id}_${pruebaMostrar}`;

        if (!setDeduplicacion.has(uniqueKey)) {
          setDeduplicacion.add(uniqueKey);
          
          const tuboData = asignarAreaY_Tubo(resultado.grupo_nombre, nomExamen);
          
          filasPreAgrupadas.push({
            orden: ordenMadre,
            prueba: pruebaMostrar,
            area: resultado.grupo_nombre,
            resultado: resultadoMostrar,
            validado: resultado.validado, 
            tuboId: tuboData.id
          });
        }
      });

      filasPreAgrupadas.sort((a, b) => a.orden.codigo_orden.localeCompare(b.orden.codigo_orden));
      setFilasTrabajo(filasPreAgrupadas);

      const unicas = [...new Set(filasPreAgrupadas.map(f => f.prueba))].sort();
      setPruebasDisponibles(unicas);
      setPruebasActivas(unicas); 

    } catch (error) {
      toast.error("Error al cargar datos.");
    } finally {
      setCargando(false);
    }
  }

  const procesarDatosAgrupados = () => {
    const filtradas = filasTrabajo.filter(f => {
      if (!pruebasActivas.includes(f.prueba)) return false;
      
      const tieneResultado = (f.resultado !== null && String(f.resultado).trim() !== "") || f.validado;
      if (filtroEstado === 'CON_RESULTADO' && !tieneResultado) return false;
      if (filtroEstado === 'SIN_RESULTADO' && tieneResultado) return false;
      
      return true;
    });

    const mapaAgrupado = new Map();
    filtradas.forEach(f => {
      if (!mapaAgrupado.has(f.orden.id)) {
        mapaAgrupado.set(f.orden.id, {
          orden: f.orden,
          pruebas: []
        });
      }
      mapaAgrupado.get(f.orden.id).pruebas.push(f);
    });

    return Array.from(mapaAgrupado.values());
  };

  const datosAgrupados = procesarDatosAgrupados();

  const exportarExcelInterlab = async () => {
    if (datosAgrupados.length === 0) return toast.error("No hay pruebas seleccionadas o en ese estado.");
    const toastId = toast.loading("Aplicando plantilla de Interlab...");

    try {
      const response = await fetch('/plantilla_interlab.xlsx');
      if (!response.ok) throw new Error("No se encontró 'plantilla_interlab.xlsx' en la carpeta public.");
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      let currentRow = 16; 

      datosAgrupados.forEach(grupo => {
         const o = grupo.orden;
         
         const fechaExacta = fechasExactasMap[o.paciente_cedula];
         const dob = fechaExacta ? fechaExacta : estimarFechaNacimiento(o.paciente_edad);
         
         const nombresPruebas = grupo.pruebas.map(p => p.prueba.toUpperCase()).join(" + ");
         
         let isSTE = '', isS = '', isPH = '', isPE = '', isPC = '', is24H = '', isOCAS = '', isSS = '', isOtro = '';
         
         grupo.pruebas.forEach(p => {
            const nombrePruebaLimpio = p.prueba.toUpperCase();
            const esOrina24H = nombrePruebaLimpio.includes('24H') || nombrePruebaLimpio.includes('24 HORAS');

            if (p.tuboId === '1') isSTE = 'X';
            if (p.tuboId === '3') isS = 'X';
            if (p.tuboId === '2') isPC = 'X';
            if (p.tuboId === '6') isSS = 'X';
            if (p.tuboId === '5' || p.tuboId === '7' || p.tuboId === '8') isOtro = 'X';
            
            // 🚀 CORRECCIÓN: Separamos inteligentemente la Orina 24H de la Orina Ocasional
            if (esOrina24H) {
               is24H = 'X';
            } else if (p.tuboId === '4') {
               isOCAS = 'X';
            }
         });

         const xlsxRow = worksheet.getRow(currentRow);
         xlsxRow.getCell(1).value = o.codigo_orden;
         xlsxRow.getCell(2).value = o.paciente_cedula;
         xlsxRow.getCell(3).value = o.paciente_nombre;
         xlsxRow.getCell(4).value = dob; 
         xlsxRow.getCell(5).value = nombresPruebas;
         
         xlsxRow.getCell(6).value = isSTE;
         xlsxRow.getCell(7).value = isS;
         xlsxRow.getCell(8).value = isPH;
         xlsxRow.getCell(9).value = isPE;
         xlsxRow.getCell(10).value = isPC;
         xlsxRow.getCell(11).value = is24H;
         xlsxRow.getCell(12).value = isOCAS;
         xlsxRow.getCell(13).value = isSS;
         xlsxRow.getCell(14).value = isOtro;

         currentRow++;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Derivacion_Interlab_${areaActiva.replace(/\s+/g, '')}_${new Date().getTime()}.xlsx`);
      toast.success("Excel generado con corrección de 24H aplicada.", { id: toastId });

    } catch (error) {
      console.error(error);
      toast.error(error.message, { id: toastId });
    }
  };

  const imprimirHojaInterna = () => {
    const contenedor = document.getElementById("area-imprimible-ht").cloneNode(true);
    
    const headerReact = contenedor.querySelector('.react-view-header');
    if (headerReact) headerReact.remove();

    const ventanaImpresion = window.open('', '', 'width=1000,height=800');
    
    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>Hoja de Trabajo - TRIDLAB</title>
          <style>
            @page { margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; color: #1e293b; font-size: 11px; }
            
            /* Cabecera Premium Asimétrica */
            .header-container { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0369a1; padding-bottom: 12px; margin-bottom: 20px; }
            .logo-placeholder { max-width: 160px; max-height: 60px; object-fit: contain; }
            .header-info { text-align: right; }
            .header-title { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
            .header-subtitle { margin: 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
            .header-date { font-size: 10px; color: #94a3b8; margin-top: 6px; }

            /* Estilos de Tabla Minimalista */
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: none; padding: 10px 8px; text-align: left; }
            th { border-bottom: 2px solid #cbd5e1; border-top: 1px solid #e2e8f0; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; background-color: #f8fafc; }
            td { border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            tr:nth-child(even) td { background-color: #fcfcfc; }
            
            /* Tipografía de datos */
            .text-codigo { font-weight: 800; color: #0f172a; font-size: 12px; }
            .text-prueba { color: #0284c7; font-weight: 700; }
            .text-res { font-weight: 800; text-align: center; }

            /* Firmas y Footer */
            .firmas-container { display: flex; justify-content: space-around; margin-top: 60px; page-break-inside: avoid; }
            .firma-box { text-align: center; width: 220px; }
            .firma-linea { border-bottom: 1px solid #64748b; height: 30px; margin-bottom: 8px; }
            .firma-nombre { font-size: 12px; font-weight: bold; color: #0f172a; }
            .firma-cargo { font-size: 10px; color: #64748b; margin-top: 2px; }
            
            .footer-institucional { margin-top: 50px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; page-break-inside: avoid; text-transform: uppercase; letter-spacing: 0.5px; }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <img src="/logo.png" alt="TRIDLAB Logo" class="logo-placeholder" onerror="this.style.display='none'" />
            <div class="header-info">
              <h1 class="header-title">LABORATORIO CLÍNICO TRIDLAB</h1>
              <h2 class="header-subtitle">Hoja de Trabajo: ${areaActiva}</h2>
              <div class="header-date">Generado por sistema el: ${fechaImpresion}</div>
            </div>
          </div>

          ${contenedor.innerHTML}

          <div class="footer-institucional">
            Documento de uso interno exclusivo del laboratorio clínico TRIDLAB © ${new Date().getFullYear()}
          </div>
        </body>
      </html>
    `);
    
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
    }, 300);
  };

  const handleClickFuera = (e) => {
    if (e.target.closest('.dropdown-container') === null) {
      setDropdownAbierto(false);
      setBusquedaPrueba(""); 
    }
  };

  if (!isOpen) return null;

  const pruebasFiltradas = pruebasDisponibles.filter(p => 
    p.toLowerCase().includes(busquedaPrueba.toLowerCase())
  );

  return (
    <div onClick={handleClickFuera} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", width: "95%", maxWidth: "1100px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", maxHeight: "90vh", borderRadius: "8px", overflow: "hidden" }}>
        
        <div style={{ background: "#0f172a", color: "#fff", padding: "12px 20px", fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "15px", letterSpacing: "0.5px" }}>📑 Hoja de Trabajo y Derivaciones</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontWeight: "bold", fontSize: "20px", transition: "0.2s" }} onMouseOver={e=>e.target.style.color="#ef4444"} onMouseOut={e=>e.target.style.color="#f87171"}>✕</button>
        </div>

        <div style={{ padding: "15px 20px", background: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            
            <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontWeight: "800", fontSize: "12px", color: "#334155", textTransform: "uppercase" }}>Columnas Visibles:</span>
                <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}><input type="checkbox" checked={verCedula} onChange={e => setVerCedula(e.target.checked)} style={{accentColor: "#0ea5e9"}} /> Cédula</label>
                <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}><input type="checkbox" checked={verNombre} onChange={e => setVerNombre(e.target.checked)} style={{accentColor: "#0ea5e9"}} /> Nombres</label>
                <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}><input type="checkbox" checked={verEdad} onChange={e => setVerEdad(e.target.checked)} style={{accentColor: "#0ea5e9"}} /> Edad</label>
              </div>

              <div style={{ borderLeft: "2px solid #cbd5e1", paddingLeft: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontWeight: "800", fontSize: "12px", color: "#334155", textTransform: "uppercase" }}>Estado:</span>
                <select 
                  style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", cursor: "pointer", color: "#0f172a", fontWeight: "600" }}
                  value={filtroEstado} 
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="TODAS">Todas (Con o Sin Resultado)</option>
                  <option value="SIN_RESULTADO">Solo Pendientes (Sin Resultado)</option>
                  <option value="CON_RESULTADO">Solo Listas (Con Resultado)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={imprimirHojaInterna} style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", fontWeight: "800", cursor: "pointer", fontSize: "12px", transition: "0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} onMouseOver={e=>e.target.style.background="#f8fafc"} onMouseOut={e=>e.target.style.background="#ffffff"}>🖨️ Imprimir PDF / Papel</button>
              <button onClick={exportarExcelInterlab} style={{ background: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "800", cursor: "pointer", fontSize: "12px", transition: "0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} onMouseOver={e=>e.target.style.background="#059669"} onMouseOut={e=>e.target.style.background="#10b981"}>📊 Exportar a Interlab</button>
            </div>
          </div>

          {!cargando && pruebasDisponibles.length > 0 && (
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontWeight: "800", fontSize: "12px", color: "#0369a1", textTransform: "uppercase" }}>
                Filtro Específico:
              </div>
              
              <div className="dropdown-container" style={{ position: "relative", minWidth: "400px" }}>
                <div 
                  onClick={() => setDropdownAbierto(!dropdownAbierto)}
                  style={{ padding: "8px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", cursor: "pointer", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", color: "#334155", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)" }}
                >
                  <span>
                    {pruebasActivas.length === pruebasDisponibles.length 
                      ? "TODAS LAS PRUEBAS INCLUIDAS" 
                      : pruebasActivas.length === 0 
                        ? "NINGUNA PRUEBA SELECCIONADA" 
                        : `${pruebasActivas.length} PRUEBAS SELECCIONADAS`}
                  </span>
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>{dropdownAbierto ? "▲" : "▼"}</span>
                </div>

                {dropdownAbierto && (
                  <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", minWidth: "400px", maxHeight: "350px", overflowY: "hidden", display: "flex", flexDirection: "column", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", marginTop: "6px", zIndex: 1050, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
                    
                    <div style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", zIndex: 10, display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => setPruebasActivas([...new Set([...pruebasActivas, ...pruebasFiltradas])])} style={{ flex: 1, background: "#0ea5e9", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "800", textTransform: "uppercase" }}>☑ Marcar Visibles</button>
                        <button onClick={() => setPruebasActivas(pruebasActivas.filter(p => !pruebasFiltradas.includes(p)))} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "800", textTransform: "uppercase" }}>☐ Desmarcar Visibles</button>
                      </div>
                      
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "10px", top: "8px", fontSize: "12px", color: "#94a3b8" }}>🔍</span>
                        <input 
                          type="text" 
                          placeholder="Buscar prueba por nombre..." 
                          value={busquedaPrueba}
                          onChange={(e) => setBusquedaPrueba(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", flex: 1 }}>
                      {pruebasFiltradas.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>No se encontraron pruebas con ese nombre.</div>
                      ) : (
                        pruebasFiltradas.map(p => (
                          <label key={p} style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "6px", cursor: "pointer", background: pruebasActivas.includes(p) ? "#f0f9ff" : "transparent", transition: "0.2s" }} onMouseEnter={(e) => {if(!pruebasActivas.includes(p)) e.currentTarget.style.background = "#f8fafc"}} onMouseLeave={(e) => {if(!pruebasActivas.includes(p)) e.currentTarget.style.background = "transparent"}}>
                            <input type="checkbox" style={{ accentColor: "#0ea5e9", width: "16px", height: "16px", margin: 0 }} checked={pruebasActivas.includes(p)} onChange={(e) => {
                              if(e.target.checked) setPruebasActivas([...pruebasActivas, p]);
                              else setPruebasActivas(pruebasActivas.filter(x => x !== p));
                            }} />
                            <span style={{ fontWeight: pruebasActivas.includes(p) ? "800" : "500", color: pruebasActivas.includes(p) ? "#0369a1" : "#334155" }}>{p}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: "30px", overflowY: "auto", background: "white" }}>
          
          {cargando ? (
            <div style={{ textAlign: "center", padding: "50px", color: "#64748b", fontSize: "14px" }}>Sincronizando con base de datos...</div>
          ) : datosAgrupados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px", color: "#64748b", fontStyle: "italic", fontSize: "14px" }}>No hay registros que coincidan con los filtros aplicados.</div>
          ) : (
            <div id="area-imprimible-ht" style={{ maxWidth: "900px", margin: "0 auto" }}>
              
              <div className="react-view-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #0369a1", paddingBottom: "12px", marginBottom: "20px" }}>
                 <div style={{ width: "150px", height: "40px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px", color: "#94a3b8", fontSize: "10px", fontWeight: "bold", border: "1px dashed #cbd5e1" }}>Espacio para Logo</div>
                 <div style={{ textAlign: "right" }}>
                   <h1 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>LABORATORIO CLÍNICO TRIDLAB</h1>
                   <h2 style={{ margin: "0", fontSize: "13px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>Hoja de Trabajo: {areaActiva}</h2>
                 </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", color: "#1e293b" }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: "2px solid #cbd5e1", borderTop: "1px solid #e2e8f0", padding: "10px 8px", backgroundColor: "#f8fafc", textAlign: "left", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px" }}>Nº Petición</th>
                    {verCedula && <th style={{ borderBottom: "2px solid #cbd5e1", borderTop: "1px solid #e2e8f0", padding: "10px 8px", backgroundColor: "#f8fafc", textAlign: "left", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px" }}>Cédula</th>}
                    {verNombre && <th style={{ borderBottom: "2px solid #cbd5e1", borderTop: "1px solid #e2e8f0", padding: "10px 8px", backgroundColor: "#f8fafc", textAlign: "left", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px" }}>Paciente</th>}
                    {verEdad && <th style={{ borderBottom: "2px solid #cbd5e1", borderTop: "1px solid #e2e8f0", padding: "10px 8px", backgroundColor: "#f8fafc", textAlign: "center", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px" }}>Edad</th>}
                    <th style={{ borderBottom: "2px solid #cbd5e1", borderTop: "1px solid #e2e8f0", padding: "10px 8px", backgroundColor: "#f8fafc", textAlign: "left", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px" }}>Prueba / Examen</th>
                    <th style={{ borderBottom: "2px solid #cbd5e1", borderTop: "1px solid #e2e8f0", padding: "10px 8px", backgroundColor: "#f8fafc", textAlign: "center", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.5px" }}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {datosAgrupados.map((grupo) => (
                    <React.Fragment key={grupo.orden.id}>
                      {grupo.pruebas.map((fila, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 !== 0 ? "#fcfcfc" : "transparent" }}>
                          {index === 0 && (
                            <>
                              <td rowSpan={grupo.pruebas.length} style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 8px", fontWeight: "800", color: "#0f172a", fontSize: "12px", verticalAlign: "top" }}>{grupo.orden.codigo_orden}</td>
                              {verCedula && <td rowSpan={grupo.pruebas.length} style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 8px", verticalAlign: "top", color: "#334155" }}>{grupo.orden.paciente_cedula}</td>}
                              {verNombre && <td rowSpan={grupo.pruebas.length} style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 8px", verticalAlign: "top", fontWeight: "600", color: "#1e293b" }}>{grupo.orden.paciente_nombre}</td>}
                              {verEdad && <td rowSpan={grupo.pruebas.length} style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 8px", textAlign: "center", verticalAlign: "top", color: "#475569" }}>{grupo.orden.paciente_edad}</td>}
                            </>
                          )}
                          <td style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 8px", color: "#0284c7", fontWeight: "700" }}>{fila.prueba}</td>
                          <td style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 8px", textAlign: "center", fontWeight: "800", color: fila.validado ? "#15803d" : "#94a3b8" }}>
                            {fila.resultado || (fila.validado ? "Hecho" : "")}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <div className="firmas-container" style={{ marginTop: "60px", display: "flex", justifyContent: "space-around" }}>
                <div className="firma-box" style={{ textAlign: "center", width: "220px" }}>
                  <div className="firma-linea" style={{ borderBottom: "1px solid #64748b", height: "30px", margin: "0 auto 8px auto", width: "80%" }}></div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a" }}>Emitido Por</div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", letterSpacing: "0.5px" }}>
                    {formatearFirmaCargo(usuarioLogueado.nombre, usuarioLogueado.cargo)}
                  </div>
                </div>
                <div className="firma-box" style={{ textAlign: "center", width: "220px" }}>
                  <div className="firma-linea" style={{ borderBottom: "1px solid #64748b", height: "30px", margin: "0 auto 8px auto", width: "80%" }}></div>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a" }}>Recibido Por</div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px", letterSpacing: "0.5px" }}>LABORATORIO DERIVADO</div>
                </div>
              </div>
            </div>

          )}
        </div>
      </div>
    </div>
  );
}