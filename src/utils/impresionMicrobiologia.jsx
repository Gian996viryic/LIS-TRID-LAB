import React from 'react';
import { supabase } from '../supabaseClient';
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer';

// ESTILOS DE LA IMPRESIÓN
const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingHorizontal: 30, paddingBottom: 45, fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b' },
  
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  logo: { height: 60, width: 80, objectFit: 'contain' },
  headerCenter: { flex: 1, textAlign: 'center', paddingHorizontal: 2 }, 
  labTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F355E', textTransform: 'uppercase', letterSpacing: 0.5 },
  labSlogan: { fontSize: 11, color: '#0284c7', marginTop: 2, fontWeight: 'bold', fontStyle: 'italic' },
  headerRight: { width: 150, textAlign: 'right', fontSize: 8, lineHeight: 1.3 },
  
  blueLine: { borderBottomWidth: 3, borderBottomColor: '#0284c7', marginVertical: 8 },

  patientTable: { width: '100%', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 15 },
  patientRow: { flexDirection: 'row', borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc' },
  patientCell: { padding: 6, flexDirection: 'row', flex: 1 },
  pLabel: { fontWeight: 'bold', color: '#64748b', width: 90, fontSize: 8 },
  pValue: { fontWeight: 'bold', color: '#1e293b', flex: 1, textTransform: 'uppercase' },

  areaHeader: { backgroundColor: '#f1f5f9', padding: 6, fontWeight: 'bold', borderLeftWidth: 4, borderLeftColor: '#0284c7', textTransform: 'uppercase', fontSize: 10, marginBottom: 15 },

  reportTitle: { fontSize: 12, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 10, textTransform: 'uppercase' },
  row: { flexDirection: 'row', marginBottom: 5 },
  rowLabel: { width: 160, fontWeight: 'bold', fontSize: 10 },
  rowValue: { flex: 1, fontSize: 10 },
  rowValueItalic: { flex: 1, fontSize: 11, fontStyle: 'italic', color: '#1e293b' }, 

  boxPreliminar: { backgroundColor: '#f8fafc', padding: 15, border: '1px dashed #94a3b8', marginTop: 10, marginBottom: 15 },

  // ESTILOS DE LA TABLA ANTIBIOGRAMA
  antibiogramTable: { width: '100%', marginTop: 10, marginBottom: 10, border: '1px solid #cbd5e1', borderBottomWidth: 0 },
  antibiogramHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontWeight: 'bold' },
  antibiogramRow: { flexDirection: 'row', borderBottom: '1px solid #cbd5e1' },
  antibiogramCell: { padding: 5, fontSize: 9, borderRight: '1px solid #cbd5e1' },
  antibiogramCellLast: { padding: 5, fontSize: 9 },
  colAnti: { flex: 3 },
  colMetodo: { flex: 1, textAlign: 'center' },
  colValor: { flex: 1, textAlign: 'center' },
  colInter: { flex: 2, textAlign: 'center', fontWeight: 'bold' },

  // ESTILOS DE VALIDACIÓN
  validadoPorText: { textAlign: 'right', fontSize: 8, color: '#64748b', marginTop: 10, fontStyle: 'italic' },
  validadoPorName: { fontWeight: 'bold', color: '#1e293b', fontStyle: 'normal' },
  validationAlert: { fontSize: 8, color: '#ef4444', fontStyle: 'italic', textAlign: 'right', marginTop: 10 },

  noteText: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 8, marginTop: 30, fontSize: 8, textAlign: 'justify', color: '#334155', fontStyle: 'italic' },

  footerContainer: { position: 'absolute', bottom: 30, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qrContainer: { width: 90, alignItems: 'center' },
  qrImage: { width: 65, height: 65, marginBottom: 4 },
  qrText: { fontSize: 7, color: '#0284c7', textAlign: 'center', fontWeight: 'bold' },

  signatureSection: { width: 190, alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 4 },
  signatureImg: { height: 50, objectFit: 'contain', position: 'absolute', bottom: 25 },
  signatureLine: { textAlign: 'center', fontWeight: 'bold', color: '#1F355E', fontSize: 8 },
  regText: { fontSize: 7, color: '#0284c7', textAlign: 'center' }
});

const ReporteMicrobiologiaPDF = ({ orden, data, tabNombre, validador, qrUrl, validadorEspecífico }) => {
  const fechaStr = new Date(orden.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <Document title={`Microbiologia_${orden.codigo_orden}`}>
      <Page size="A4" style={styles.page}>
        
        {/* Cabecera */}
        <View style={styles.headerContainer}>
          <Image src={`${window.location.origin}/logo-tridlab.png`} style={styles.logo} />
          <View style={styles.headerCenter}>
            <Text style={styles.labTitle}>LABORATORIO CLÍNICO TRIDLAB</Text>
            <Text style={styles.labSlogan}>¡Ciencia, Salud y Tecnología a su servicio!</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontWeight: 'bold' }}>WhatsApp: 0968624624 / 0989195035</Text>
            <Text>Email: laboratorio_clinico_@outlook.com</Text>
            <Text>Guayaquil, Ecuador</Text>
          </View>
        </View>

        <View style={styles.blueLine} />

        {/* DATOS DEL PACIENTE */}
        <View style={styles.patientTable}>
          <View style={styles.patientRow}>
            <View style={styles.patientCell}><Text style={styles.pLabel}>PACIENTE:</Text><Text style={{ ...styles.pValue, fontSize: 10 }}>{orden.paciente_nombre}</Text></View>
          </View>
          <View style={styles.patientRow}>
            <View style={styles.patientCell}><Text style={styles.pLabel}>CÉDULA:</Text><Text style={styles.pValue}>{orden.paciente_cedula}</Text></View>
            <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#cbd5e1' }}><Text style={styles.pLabel}>N° ORDEN:</Text><Text style={{ ...styles.pValue, color: '#0284c7' }}>{orden.codigo_orden}</Text></View>
          </View>
          <View style={styles.patientRow}>
            <View style={styles.patientCell}><Text style={styles.pLabel}>EDAD / SEXO:</Text><Text style={styles.pValue}>{orden.paciente_edad} / {orden.paciente_sexo}</Text></View>
            <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#cbd5e1' }}><Text style={styles.pLabel}>FECHA:</Text><Text style={styles.pValue}>{fechaStr}</Text></View>
          </View>
          <View style={{ ...styles.patientRow, borderBottomWidth: 0, backgroundColor: '#fff' }}>
            <View style={styles.patientCell}><Text style={styles.pLabel}>MÉDICO:</Text><Text style={styles.pValue}>{orden.solicitado_por || 'PARTICULAR'}</Text></View>
            <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#cbd5e1' }}><Text style={styles.pLabel}>PROCEDENCIA:</Text><Text style={styles.pValue}>{orden.procedencia || 'AMBULATORIO'}</Text></View>
          </View>
        </View>

        <View style={styles.areaHeader}>
            <Text>MICROBIOLOGÍA</Text>
        </View>

        <View style={{ paddingHorizontal: 10 }}>
            <Text style={styles.reportTitle}>{tabNombre}</Text>

            {data.is_otros && data.muestra_especifica && (
                <View style={styles.row}>
                    <Text style={styles.rowLabel}>MUESTRA:</Text>
                    <Text style={styles.rowValue}>{data.muestra_especifica.toUpperCase()}</Text>
                </View>
            )}

            {data.estado_reporte === "PRELIMINAR" ? (
                <View style={styles.boxPreliminar}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0f766e', marginBottom: 5 }}>REPORTE PRELIMINAR:</Text>
                    <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{data.reporte_texto || "Sin observaciones preliminares."}</Text>
                </View>
            ) : (
                <View>
                    {/* 🚀 SOLUCIÓN: Aplica a CUALQUIER cultivo DEFINITIVO donde el usuario redactó un resultado (Especialmente los Negativos) */}
                    {data.estado_reporte === "DEFINITIVO" && data.reporte_texto && (
                         <View style={{ marginBottom: 15 }}>
                             <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#1e293b' }}>{data.reporte_texto}</Text>
                         </View>
                    )}

                    {data.es_microbiota_habitual ? (
                        <View style={{ marginTop: 5 }}>
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>GERMEN AISLADO:</Text>
                                <Text style={styles.rowValue}>DESARROLLO DE MICROBIOTA HABITUAL</Text>
                            </View>

                            {/* MECANISMO DE RESISTENCIA EN MICROBIOTA (VIGILANCIA) */}
                            {data.mecanismo_resistencia && (
                                <View style={{ ...styles.row, marginTop: 5 }}>
                                    <Text style={styles.rowLabel}>VIGILANCIA EPIDEMIOLÓGICA:</Text>
                                    <Text style={{ ...styles.rowValue, color: '#1e293b' }}>
                                        {data.mecanismo_resistencia}
                                    </Text>
                                </View>
                            )}

                            <Text style={{ fontWeight: 'bold', marginTop: 15, fontSize: 10 }}>NOTA: PRUEBA DE SUSCEPTIBILIDAD NO APLICA.</Text>
                        </View>
                    ) : (
                        <>
                            {/* Examen en Fresco */}
                            {data.fresco && (
                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>EXAMEN EN FRESCO:</Text>
                                    <Text style={styles.rowValue}>{data.fresco}</Text>
                                </View>
                            )}

                            {/* Microscopía */}
                            {data.tincion_gram && (
                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>TINCIÓN DE GRAM DIRECTA:</Text>
                                    <Text style={styles.rowValue}>{data.tincion_gram}</Text>
                                </View>
                            )}

                            {data.aplica_microscopia && (
                                <>
                                    {data.polimorfonucleares && (
                                        <View style={styles.row}>
                                            <Text style={styles.rowLabel}>POLIMORFONUCLEARES:</Text>
                                            <Text style={styles.rowValue}>{data.polimorfonucleares}</Text>
                                        </View>
                                    )}
                                    {data.celulas_epiteliales && (
                                        <View style={styles.row}>
                                            <Text style={styles.rowLabel}>CÉLULAS EPITELIALES:</Text>
                                            <Text style={styles.rowValue}>{data.celulas_epiteliales}</Text>
                                        </View>
                                    )}
                                </>
                            )}

                            {data.aplica_nickerson && data.nickerson && (
                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>MEDIO NICKERSON:</Text>
                                    <Text style={styles.rowValue}>{data.nickerson.toUpperCase()}</Text>
                                </View>
                            )}

                            <View style={{ marginTop: 10, marginBottom: 10 }}>
                                {data.tipo_muestra !== "SANGRE" && data.tipo_muestra !== "RETROCULTIVO" && data.contaje_ufc && (
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>CONTAJE:</Text>
                                        <Text style={styles.rowValue}>{data.contaje_ufc}</Text>
                                    </View>
                                )}
                                {data.aplica_interpretacion && data.interpretacion && (
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>INTERPRETACIÓN:</Text>
                                        <Text style={styles.rowValue}>{data.interpretacion}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Germen Aislado */}
                            {data.germen_aislado && (
                                <View style={{ ...styles.row, marginTop: 10, marginBottom: 5 }}>
                                    <Text style={styles.rowLabel}>GERMEN AISLADO:</Text>
                                    <Text style={styles.rowValueItalic}>{data.germen_aislado}</Text>
                                </View>
                            )}

                            {/* MECANISMO DE RESISTENCIA (GERMEN POSITIVO) */}
                            {data.mecanismo_resistencia && (
                                <View style={{ ...styles.row, marginBottom: 10 }}>
                                    <Text style={styles.rowLabel}>MECANISMO DE RESISTENCIA:</Text>
                                    <Text style={{ ...styles.rowValue, color: '#1e293b' }}>
                                        {data.mecanismo_resistencia}
                                    </Text>
                                </View>
                            )}

                            {/* TABLA DE ANTIBIOGRAMA */}
                            {data.antibiograma && data.antibiograma.length > 0 && (
                                <View style={styles.antibiogramTable}>
                                    <View style={styles.antibiogramHeader}>
                                        <Text style={[styles.antibiogramCell, styles.colAnti]}>Antibiótico</Text>
                                        <Text style={[styles.antibiogramCell, styles.colMetodo]}>Método</Text>
                                        <Text style={[styles.antibiogramCell, styles.colValor]}>Valor</Text>
                                        <Text style={[styles.antibiogramCellLast, styles.colInter]}>Interpretación</Text>
                                    </View>
                                    {data.antibiograma.map((anti, idx) => {
                                        let interText = anti.interpretacion;
                                        if (interText === 'S') interText = 'S - Sensible';
                                        else if (interText === 'I') interText = 'I - Intermedio';
                                        else if (interText === 'R') interText = 'R - Resistente';

                                        return (
                                            <View key={idx} style={[styles.antibiogramRow, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}>
                                                <Text style={[styles.antibiogramCell, styles.colAnti]}>{anti.antibiotico}</Text>
                                                <Text style={[styles.antibiogramCell, styles.colMetodo]}>{anti.metodo}</Text>
                                                <Text style={[styles.antibiogramCell, styles.colValor]}>{anti.valor}</Text>
                                                <Text style={[styles.antibiogramCellLast, styles.colInter]}>
                                                    {interText}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </>
                    )}
                </View>
            )}

            {/* VALIDADOR ESPECÍFICO DE ESTA PRUEBA */}
            {data.validado && validadorEspecífico ? (
                <Text style={styles.validadoPorText}>
                    Validado por: <Text style={styles.validadoPorName}>{validadorEspecífico}</Text>
                </Text>
            ) : !data.validado ? (
                <Text style={styles.validationAlert}>* REPORTE AÚN NO VALIDADO *</Text>
            ) : null}

            <Text style={styles.noteText}>
                El médico es el profesional capacitado para realizar la interpretación del resultado correlacionándolo con otros datos clínicos. Entregar el informe al médico para su análisis.
            </Text>
        </View>

        {/* Firmas y Pie (Responsable de Laboratorio) */}
        <View style={styles.footerContainer} fixed>
          <View style={styles.qrContainer}>
             <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=1&data=${encodeURIComponent(qrUrl)}`} style={styles.qrImage} />
             <Text style={styles.qrText}>Verificar reporte</Text>
          </View>
          
          <View style={styles.signatureSection}>
            {validador?.firmaUrl && <Image src={validador.firmaUrl} style={styles.signatureImg} />}
            <Text style={styles.signatureLine}>RESPONSABLE DE LABORATORIO</Text>
            <Text style={styles.regText}>Reg. Senescyt: {validador?.registro || "S/N"}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export async function generarVistaPreviaMicrobiologia({ orden, data, tabNombre }) {
  try {
    // 1. OBTENER AL RESPONSABLE DE LABORATORIO (Para el Footer Fijo)
    const { data: userData } = await supabase.from('lab_usuarios').select('registro_senescyt, firma_path').eq('cargo', 'RESPONSABLE DE LABORATORIO').single();
    let validador = { registro: userData?.registro_senescyt || "S/N", firmaUrl: null };
    if (userData?.firma_path) {
      const { data: pUrl } = supabase.storage.from('firmas').getPublicUrl(userData.firma_path);
      validador.firmaUrl = pUrl.publicUrl;
    }

    // 2. OBTENER AL USUARIO QUE VALIDÓ LA PRUEBA (Para texto discreto debajo de la tabla)
    let validadorEspecífico = "";
    if (data.validado_por) {
        const { data: vData } = await supabase.from('lab_usuarios').select('nombre, cargo').eq('id', data.validado_por).single();
        if (vData) {
            let acro = "";
            const cargo = (vData.cargo || "").toUpperCase().trim();
            if (cargo.includes("QUIM") || cargo.includes("QUÍM") || cargo.includes("FARM")) acro = "Q.F. ";
            else if (cargo.includes("LIC")) acro = "Lic. ";
            else if (cargo.includes("TEC")) acro = "Tec. Med. ";
            
            validadorEspecífico = `${acro}${vData.nombre}`.trim();
        }
    }

    // 3. OBTENER TOKEN DE QR
    let tokenParaQR = orden.codigo_orden; 
    if (orden.cotizacion_id) {
      const { data: cotData } = await supabase.from('cotizaciones').select('verify_token').eq('id', orden.cotizacion_id).single();
      if (cotData && cotData.verify_token) tokenParaQR = cotData.verify_token;
    }
    const urlVerificacion = `${window.location.origin}/verificar?token=${tokenParaQR}`;

    const blob = await pdf(<ReporteMicrobiologiaPDF orden={orden} data={data} tabNombre={tabNombre} validador={validador} qrUrl={urlVerificacion} validadorEspecífico={validadorEspecífico} />).toBlob();
    const url = URL.createObjectURL(blob);
    
    window.open(url, '_blank');
    
  } catch (error) { 
    console.error("Error PDF Micro:", error); 
  }
}