import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function VistaPreviaMicrobiologia({ orden, data, tabNombre, onClose }) {
  const [validadorData, setValidadorData] = useState(null);

  // Simulamos cargar los datos del validador para que la vista previa se vea 100% real
  useEffect(() => {
      async function cargarValidador() {
          const { data: vData } = await supabase.from('lab_usuarios').select('nombre, registro_senescyt, firma_path').eq('cargo', 'RESPONSABLE DE LABORATORIO').single();
          if (vData) {
             let urlFirma = null;
             if (vData.firma_path) {
                 const { data: pUrl } = supabase.storage.from('firmas').getPublicUrl(vData.firma_path);
                 urlFirma = pUrl.publicUrl;
             }
             setValidadorData({ nombre: vData.nombre, registro: vData.registro_senescyt, firma: urlFirma });
          }
      }
      cargarValidador();
  }, []);

  if (!data || !orden) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      backgroundColor: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        background: "#fff", width: "100%", maxWidth: "850px", height: "95vh", borderRadius: "8px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", display: "flex", flexDirection: "column", overflow: "hidden"
      }}>
        
        <div style={{ background: "#1e293b", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#f8fafc", fontWeight: "bold", fontSize: "13px", letterSpacing: "1px" }}>👁️ VISTA PREVIA DE IMPRESIÓN - MICROBIOLOGÍA</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>

        {/* 📄 CONTENEDOR DEL "PAPEL" A4 (Simulación visual estricta) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "30px 0", backgroundColor: "#64748b", display: "flex", justifyContent: "center" }}>
            
            <div style={{ width: "100%", maxWidth: "750px", backgroundColor: "#fff", padding: "40px 50px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)", color: "#1e293b", fontFamily: "Arial, Helvetica, sans-serif", position: "relative" }}>
                
                {/* 1. CABECERA TRIDLAB */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #0284c7", paddingBottom: "10px", marginBottom: "15px" }}>
                    <img src="/logo-tridlab.png" alt="TridLab" style={{ height: "65px", width: "85px", objectFit: "contain" }} />
                    <div style={{ flex: 1, textAlign: "center", padding: "0 10px" }}>
                        <div style={{ fontSize: "20px", fontWeight: "900", color: "#1F355E", letterSpacing: "0.5px" }}>LABORATORIO CLÍNICO TRIDLAB</div>
                        <div style={{ fontSize: "12px", color: "#0284c7", fontWeight: "bold", fontStyle: "italic", marginTop: "2px" }}>¡Ciencia, Salud y Tecnología a su servicio!</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "9px", lineHeight: "1.3", color: "#0f172a", width: "160px" }}>
                        <strong>WhatsApp:</strong> 0968624624 / 0989195035<br/>
                        <strong>Email:</strong> laboratorio_clinico_@outlook.com<br/>
                        Guayaquil, Ecuador
                    </div>
                </div>

                {/* 2. DATOS DEL PACIENTE */}
                <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", marginBottom: "20px", fontSize: "11px", overflow: "hidden" }}>
                    <div style={{ display: "flex", borderBottom: "1px solid #cbd5e1", background: "#f8fafc" }}>
                        <div style={{ padding: "6px 10px", display: "flex", flex: 1 }}>
                            <span style={{ fontWeight: "bold", color: "#64748b", width: "90px" }}>PACIENTE:</span>
                            <span style={{ fontWeight: "bold", fontSize: "12px", textTransform: "uppercase" }}>{orden.paciente_nombre}</span>
                        </div>
                    </div>
                    <div style={{ display: "flex", borderBottom: "1px solid #cbd5e1" }}>
                        <div style={{ padding: "6px 10px", display: "flex", flex: 1 }}>
                            <span style={{ fontWeight: "bold", color: "#64748b", width: "90px" }}>CÉDULA:</span>
                            <span style={{ fontWeight: "bold" }}>{orden.paciente_cedula}</span>
                        </div>
                        <div style={{ padding: "6px 10px", display: "flex", flex: 1, borderLeft: "1px solid #cbd5e1" }}>
                            <span style={{ fontWeight: "bold", color: "#64748b", width: "90px" }}>N° ORDEN:</span>
                            <span style={{ fontWeight: "bold", color: "#0284c7" }}>{orden.codigo_orden}</span>
                        </div>
                    </div>
                    <div style={{ display: "flex" }}>
                        <div style={{ padding: "6px 10px", display: "flex", flex: 1 }}>
                            <span style={{ fontWeight: "bold", color: "#64748b", width: "90px" }}>EDAD / SEXO:</span>
                            <span style={{ fontWeight: "bold" }}>{orden.paciente_edad} / {orden.paciente_sexo}</span>
                        </div>
                        <div style={{ padding: "6px 10px", display: "flex", flex: 1, borderLeft: "1px solid #cbd5e1" }}>
                            <span style={{ fontWeight: "bold", color: "#64748b", width: "90px" }}>MÉDICO:</span>
                            <span style={{ fontWeight: "bold" }}>{orden.solicitado_por || "PARTICULAR"}</span>
                        </div>
                    </div>
                </div>

                {/* 3. TÍTULO DEL ÁREA */}
                <div style={{ background: "#f1f5f9", padding: "6px 10px", fontWeight: "bold", borderLeft: "4px solid #0284c7", fontSize: "11px", marginBottom: "15px" }}>
                    MICROBIOLOGÍA
                </div>

                {/* 4. CUERPO DEL REPORTE */}
                <div style={{ padding: "0 10px", fontSize: "12px", lineHeight: "1.8", minHeight: "350px" }}>
                    
                    <div style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: "15px", fontSize: "14px", color: "#0f172a", textTransform: "uppercase" }}>
                        {tabNombre}
                    </div>

                    {data.is_otros && data.muestra_especifica && (
                        <div style={{ display: "flex", marginBottom: "10px" }}>
                            <span style={{ fontWeight: "bold", width: "180px" }}>MUESTRA:</span> 
                            <span>{data.muestra_especifica.toUpperCase()}</span>
                        </div>
                    )}

                    {data.is_preliminar ? (
                        <div style={{ marginTop: "20px", background: "#f8fafc", padding: "20px", border: "1px dashed #94a3b8" }}>
                            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#0f766e", marginBottom: "10px" }}>REPORTE PRELIMINAR:</div>
                            <div style={{ fontStyle: "italic", fontSize: "13px" }}>{data.reporte_preliminar || "Sin observaciones preliminares redactadas."}</div>
                        </div>
                    ) : data.es_microbiota_habitual ? (
                        <div style={{ marginTop: "20px" }}>
                            <div style={{ display: "flex", marginBottom: "10px" }}>
                                <span style={{ fontWeight: "bold", width: "180px" }}>GERMEN AISLADO:</span> 
                                <span style={{ fontWeight: "bold" }}>DESARROLLO DE MICROBIOTA HABITUAL</span>
                            </div>
                            <div style={{ fontWeight: "bold", marginTop: "20px" }}>NOTA: PRUEBA DE SUSCEPTIBILIDAD NO APLICA.</div>
                        </div>
                    ) : (
                        <>
                            {/* Microscopía */}
                            {data.tincion_gram && (
                                <div style={{ display: "flex", marginBottom: "4px" }}>
                                    <span style={{ fontWeight: "bold", width: "180px" }}>TINCIÓN DE GRAM DIRECTA:</span> 
                                    <span>{data.tincion_gram}</span>
                                </div>
                            )}
                            {data.aplica_microscopia && (
                                <>
                                    {data.polimorfonucleares && (
                                    <div style={{ display: "flex", marginBottom: "4px" }}>
                                        <span style={{ fontWeight: "bold", width: "180px" }}>POLIMORFONUCLEARES:</span> 
                                        <span>{data.polimorfonucleares}</span>
                                    </div>
                                    )}
                                    {data.celulas_epiteliales && (
                                    <div style={{ display: "flex", marginBottom: "4px" }}>
                                        <span style={{ fontWeight: "bold", width: "180px" }}>CÉLULAS EPITELIALES:</span> 
                                        <span>{data.celulas_epiteliales}</span>
                                    </div>
                                    )}
                                </>
                            )}
                            {data.aplica_nickerson && data.nickerson && (
                                <div style={{ display: "flex", marginBottom: "4px" }}>
                                    <span style={{ fontWeight: "bold", width: "180px" }}>MEDIO NICKERSON:</span> 
                                    <span>{data.nickerson}</span>
                                </div>
                            )}

                            {/* Contaje / Interpretación */}
                            <div style={{ marginTop: "10px", marginBottom: "10px" }}>
                                {data.tipo_muestra !== "SANGRE" && data.contaje_ufc && (
                                <div style={{ display: "flex", marginBottom: "4px" }}>
                                    <span style={{ fontWeight: "bold", width: "180px" }}>CONTAJE:</span> 
                                    <span>{data.contaje_ufc}</span>
                                </div>
                                )}
                                {data.aplica_interpretacion && data.interpretacion && (
                                <div style={{ display: "flex", marginBottom: "4px" }}>
                                    <span style={{ fontWeight: "bold", width: "180px" }}>INTERPRETACIÓN:</span> 
                                    <span>{data.interpretacion}</span>
                                </div>
                                )}
                            </div>

                            {/* Germen Final */}
                            <div style={{ display: "flex", marginTop: "15px", marginBottom: "20px", fontSize: "13px" }}>
                                <span style={{ fontWeight: "bold", width: "180px" }}>GERMEN AISLADO:</span> 
                                <span style={{ fontStyle: "italic", fontWeight: "bold" }}>
                                    {data.germen_aislado || "Pendiente de reporte"}
                                </span>
                            </div>

                            {/* Placeholder Antibiograma */}
                            <div style={{ border: "1px solid #cbd5e1", padding: "10px", textAlign: "center", color: "#64748b", background: "#f8fafc", fontSize: "10px" }}>
                                <i>[ Tabla de Antibiograma S/I/R se imprimirá aquí ]</i>
                            </div>
                        </>
                    )}

                    {/* Fila de Validado (Alineado a la derecha como en tu foto) */}
                    <div style={{ textAlign: "right", fontSize: "9px", color: "#64748b", marginTop: "15px", fontStyle: "italic" }}>
                        {data.validado ? (
                            <>Validado por: <span style={{ fontWeight: "bold", color: "#1e293b", fontStyle: "normal" }}>{validadorData?.nombre || "Administrador Laboratorio"}</span></>
                        ) : (
                            <span style={{ color: "#ef4444" }}>* Reporte Aún No Validado *</span>
                        )}
                    </div>

                </div>

                {/* 5. FIRMAS Y PIE DE PÁGINA */}
                <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    
                    {/* QR Code (Simulado) */}
                    <div style={{ width: "100px", textAlign: "center" }}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=TridLab_${orden.codigo_orden}`} alt="QR" style={{ width: "70px", height: "70px" }} />
                        <div style={{ fontSize: "8px", color: "#0284c7", fontWeight: "bold", marginTop: "5px" }}>Verificar reporte</div>
                    </div>

                    {/* Firma Digital */}
                    <div style={{ width: "220px", textAlign: "center", borderTop: "1px solid #1e293b", paddingTop: "5px" }}>
                        {validadorData?.firma ? (
                            <img src={validadorData.firma} alt="Firma" style={{ height: "50px", objectFit: "contain", position: "absolute", bottom: "35px", right: "80px", zIndex: -1 }} />
                        ) : null}
                        <div style={{ fontWeight: "bold", fontSize: "10px", color: "#1F355E" }}>RESPONSABLE DE LABORATORIO</div>
                        <div style={{ fontSize: "9px", color: "#0284c7" }}>Reg. Senescyt: {validadorData?.registro || "S/N"}</div>
                    </div>
                </div>

            </div>
        </div>

      </div>
    </div>
  );
}