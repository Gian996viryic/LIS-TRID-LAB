import React from 'react';
import { supabase } from '../supabaseClient';
import { Document, Page, Text, View, Image, StyleSheet, pdf, Svg, Path } from '@react-pdf/renderer';

const IconoFlechaArriba = () => (
  <Svg width="8" height="10" viewBox="0 0 24 24"><Path d="M12 4l-8 8h6v8h4v-8h6z" fill="#dc2626" /></Svg>
);

const IconoFlechaAbajo = () => (
  <Svg width="8" height="10" viewBox="0 0 24 24"><Path d="M12 20l8-8h-6v-8h-4v8h-6z" fill="#dc2626" /></Svg>
);

const styles = StyleSheet.create({
  page: { paddingTop: 30, paddingHorizontal: 30, paddingBottom: 45, fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' },
  logo: { height: 60, width: 80, objectFit: 'contain' },
  headerCenter: { flex: 1, textAlign: 'center', paddingHorizontal: 2 }, 
  labTitle: { fontSize: 17.5, fontWeight: 'bold', color: '#1F355E', textTransform: 'uppercase', letterSpacing: 0.5 },
  labSlogan: { fontSize: 10.5, color: '#0284c7', marginTop: 2, fontWeight: 'bold', fontStyle: 'italic' },
  headerRight: { width: 140, textAlign: 'right', fontSize: 7.5, lineHeight: 1.3 },
  blueLine: { borderBottomWidth: 3, borderBottomColor: '#0284c7', marginVertical: 8 },
  patientTable: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 10 },
  patientRow: { flexDirection: 'row', borderBottom: '1px solid #e2e8f0' },
  patientCell: { padding: 5, flexDirection: 'row', flex: 1 },
  pLabel: { fontWeight: 'bold', color: '#64748b', width: 90, fontSize: 8 },
  pValue: { fontWeight: 'bold', color: '#1e293b', flex: 1, textTransform: 'uppercase' },
  areaContainer: { marginBottom: 10 }, 
  areaHeader: { backgroundColor: '#f1f5f9', padding: 5, fontWeight: 'bold', borderLeftWidth: 4, borderLeftColor: '#0284c7', textTransform: 'uppercase', fontSize: 9, marginBottom: 2 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#cbd5e1', paddingBottom: 2 },
  headerText: { fontSize: 8, color: '#64748b', fontWeight: 'bold' },
  subHeaderRow: { backgroundColor: '#f8fafc', paddingVertical: 4, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  subHeaderText: { fontSize: 8, fontWeight: 'bold', color: '#475569', fontStyle: 'italic' },
  tableRowContainer: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', paddingVertical: 3, alignItems: 'center', paddingHorizontal: 4 },
  colAnalito: { width: '35%', fontWeight: 'bold' },
  colResultado: { width: '18%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },
  flagSpace: { width: 10, alignItems: 'center', justifyContent: 'center' }, 
  colUnidad: { width: '12%', textAlign: 'center' },
  colRef: { width: '35%', fontSize: 8, color: '#334155', paddingLeft: 5 },
  comentarioRow: { flexDirection: 'row', paddingBottom: 4, paddingHorizontal: 4 },
  comentarioTexto: { flex: 1, fontSize: 8, fontStyle: 'italic', color: '#475569', paddingLeft: 10 },
  textValidado: { textAlign: 'right', fontSize: 7, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  nombreValidadorBold: { fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase' },
  validationAlert: { fontSize: 8, color: '#ef4444', fontStyle: 'italic', textAlign: 'right', marginTop: 10 },
  runningFooter: { position: 'absolute', bottom: 15, left: 30, right: 30, borderTopWidth: 0.5, borderTopColor: '#cbd5e1', paddingTop: 4, fontSize: 7.5, color: '#64748b', flexDirection: 'row', justifyContent: 'center' },
  footerContainer: { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerContainerMicro: { position: 'absolute', bottom: 30, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qrContainer: { width: 90, alignItems: 'center', justifyContent: 'flex-end' },
  qrImage: { width: 65, height: 65, marginBottom: 4 },
  qrText: { fontSize: 7, color: '#0284c7', textAlign: 'center', fontWeight: 'bold' },
  signatureSection: { width: 190, alignItems: 'center' },
  signatureSectionMicro: { width: 190, alignItems: 'center', borderTop: '1px solid #1e293b', paddingTop: 4 },
  signatureImg: { height: 50, objectFit: 'contain' },
  signatureImgMicro: { height: 50, objectFit: 'contain', position: 'absolute', bottom: 25 },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#1e293b', width: '100%', paddingTop: 4, textAlign: 'center', fontWeight: 'bold', color: '#1F355E', fontSize: 8 },
  signatureLineMicro: { textAlign: 'center', fontWeight: 'bold', color: '#1F355E', fontSize: 8 },
  regText: { fontSize: 7, color: '#0284c7', textAlign: 'center' },
  reportTitle: { fontSize: 12, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 10, textTransform: 'uppercase' },
  row: { flexDirection: 'row', marginBottom: 5 },
  rowLabel: { width: 160, fontWeight: 'bold', fontSize: 10 },
  rowValue: { flex: 1, fontSize: 10 },
  rowValueItalic: { flex: 1, fontSize: 11, fontStyle: 'italic', color: '#1e293b' }, 
  boxPreliminar: { backgroundColor: '#f8fafc', padding: 15, border: '1px dashed #94a3b8', marginTop: 10, marginBottom: 15 },
  antibiogramTable: { width: '100%', marginTop: 10, marginBottom: 10, border: '1px solid #cbd5e1', borderBottomWidth: 0 },
  antibiogramHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontWeight: 'bold' },
  antibiogramRow: { flexDirection: 'row', borderBottom: '1px solid #cbd5e1' },
  antibiogramCell: { padding: 5, fontSize: 9, borderRight: '1px solid #cbd5e1' },
  antibiogramCellLast: { padding: 5, fontSize: 9 },
  colAnti: { flex: 3 },
  colMetodo: { flex: 1, textAlign: 'center' },
  colValor: { flex: 1, textAlign: 'center' },
  colInter: { flex: 2, textAlign: 'center', fontWeight: 'bold' },
  noteText: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 8, marginTop: 30, fontSize: 8, textAlign: 'justify', color: '#334155', fontStyle: 'italic' },
});

const ReportePDF = ({ orden, validador, mapaNombres, groupedResults, qrUrl, cultivos }) => {
  const areas = Object.keys(groupedResults || {});
  const fechaStr = orden?.created_at ? new Date(orden.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : "";

  const esAreaLarga = (name) => {
    const n = String(name || "").toUpperCase().trim();
    return n.includes("UROAN") || n.includes("ORINA") || n.includes("COPRO") || n.includes("HECES") || n.includes("PARASITO");
  };

  const esHematologia = (name) => String(name || "").toUpperCase().trim().includes("HEMATO");

  return (
    <Document title={`Resultados_${orden?.codigo_orden || "000"}`}>
      
      {/* HOJAS GENERALES (SANGRE, ORINA, HECES) */}
      {areas.length > 0 ? (
        <Page size="A4" style={styles.page}>
          
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

          <View style={styles.patientTable}>
            <View style={styles.patientRow}>
              <View style={styles.patientCell}><Text style={styles.pLabel}>PACIENTE:</Text><Text style={{ ...styles.pValue, fontSize: 10 }}>{orden?.paciente_nombre || "-"}</Text></View>
            </View>
            <View style={styles.patientRow}>
              <View style={styles.patientCell}><Text style={styles.pLabel}>CÉDULA:</Text><Text style={styles.pValue}>{orden?.paciente_cedula || "-"}</Text></View>
              <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }}><Text style={styles.pLabel}>N° ORDEN:</Text><Text style={{ ...styles.pValue, color: '#0284c7' }}>{orden?.codigo_orden || "-"}</Text></View>
            </View>
            <View style={styles.patientRow}>
              <View style={styles.patientCell}><Text style={styles.pLabel}>EDAD / SEXO:</Text><Text style={styles.pValue}>{orden?.paciente_edad || "-"} / {orden?.paciente_sexo || "-"}</Text></View>
              <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }}><Text style={styles.pLabel}>FECHA:</Text><Text style={styles.pValue}>{fechaStr}</Text></View>
            </View>
            <View style={{ ...styles.patientRow, borderBottomWidth: 0 }}>
              <View style={styles.patientCell}><Text style={styles.pLabel}>MÉDICO:</Text><Text style={styles.pValue}>{orden?.solicitado_por || 'PARTICULAR'}</Text></View>
              <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }}><Text style={styles.pLabel}>PROCEDENCIA:</Text><Text style={styles.pValue}>{orden?.procedencia || 'AMBULATORIO'}</Text></View>
            </View>
          </View>

          <View style={styles.runningFooter} fixed>
            <Text render={({ pageNumber, totalPages }) => `Paciente: ${orden?.paciente_nombre || "-"}    |    Cédula: ${orden?.paciente_cedula || "-"}    |    N° Orden: ${orden?.codigo_orden || "-"}    |    Página ${pageNumber} de ${totalPages}`} />
          </View>

          {areas.map((area, idx) => {
            const areaResults = groupedResults[area] || [];
            
            const validadorAreaId = areaResults.find(r => r.validado_por)?.validado_por;
            const nombreValidadorArea = validadorAreaId ? (mapaNombres[validadorAreaId] || "Profesional de Laboratorio") : null;

            const isLastArea = idx === areas.length - 1;
            const rowsCount = areaResults.length;
            const prevArea = idx > 0 ? areas[idx - 1] : null;

            const areaNameUpper = String(area || "").toUpperCase().trim();
            const isOrinaArea = areaNameUpper.includes("ORINA") || areaNameUpper.includes("URO");
            const isHecesArea = areaNameUpper.includes("HECES") || areaNameUpper.includes("COPRO") || areaNameUpper.includes("PARASITO");

            let debeRomperPagina = false;
            if (idx > 0) {
              if (esAreaLarga(area) || esHematologia(area)) debeRomperPagina = true;
              else if (prevArea && esHematologia(prevArea) && (groupedResults[prevArea] || []).length <= 30) debeRomperPagina = true;
            }

            return (
              <View key={area} style={styles.areaContainer} break={debeRomperPagina}>
                <Text style={styles.areaHeader}>{area}</Text>
                <View style={styles.tableHeader}>
                  <Text style={{ ...styles.headerText, ...styles.colAnalito }}>Examen / Analito</Text>
                  <Text style={{ ...styles.headerText, ...styles.colResultado }}>Resultado</Text>
                  <Text style={{ ...styles.headerText, ...styles.colUnidad }}>Unidades</Text>
                  <Text style={{ ...styles.headerText, ...styles.colRef }}>Valores de Referencia</Text>
                </View>

                {areaResults.map((r, i) => {
                  const isLastRow = i === rowsCount - 1;
                  const estaValidado = r.validado === true || String(r.estado_validacion || "").toLowerCase().trim() === 'validado';
                  let resColor = '#1e293b'; let finalRes = ""; let flecha = null;
                  
                  if (!estaValidado) {
                    finalRes = "EN PROCESO"; resColor = "#f59e0b";
                  } else {
                    finalRes = r.resultado_numero !== null && r.resultado_numero !== undefined ? String(r.resultado_numero) : (r.resultado_texto || "");
                    if (r.resultado_numero !== null && r.resultado_numero !== undefined && !finalRes.includes("REPORTE")) {
                      if (r.rango_min !== null && r.resultado_numero < r.rango_min) { flecha = <IconoFlechaAbajo />; resColor = "#dc2626"; }
                      else if (r.rango_max !== null && r.resultado_numero > r.rango_max) { flecha = <IconoFlechaArriba />; resColor = "#dc2626"; }
                    } else if (finalRes.includes("REPORTE")) {
                      resColor = "#0284c7"; 
                    }
                  }

                  const comentarioExtra = r.local_comentario_resultado || r.comentario_resultado || "";
                  const analitoUpper = String(r.nombre_analito || "").toUpperCase().trim();

                  let subTitle = null;
                  if (isOrinaArea) {
                      if (analitoUpper === "COLOR") subTitle = "EXAMEN FÍSICO Y QUÍMICO";
                      if (analitoUpper === "CÉLULAS EPITELIALES ESCAMOSAS") subTitle = "EXAMEN MICROSCÓPICO (SEDIMENTO)";
                  } else if (isHecesArea) {
                      if (analitoUpper === "COLOR") subTitle = "EXAMEN MACROSCÓPICO";
                      if (analitoUpper === "LEUCOCITOS") subTitle = "EXAMEN MICROSCÓPICO";
                  }

                  const filaAnalito = (
                    <View>
                      {!!subTitle ? <View style={styles.subHeaderRow}><Text style={styles.subHeaderText}>{subTitle}</Text></View> : null}
                      <View style={[styles.tableRowContainer, { backgroundColor: i % 2 !== 0 ? '#f1f5f9' : '#ffffff' }]}>
                        <View style={styles.tableRow}>
                          <Text style={styles.colAnalito}>{analitoUpper}</Text>
                          <View style={styles.colResultado}>
                            <View style={styles.flagSpace}>{flecha ? flecha : null}</View>
                            <Text style={{ color: resColor }}>{finalRes}</Text>
                          </View>
                          <Text style={styles.colUnidad}>{r.unidad || ""}</Text>
                          <Text style={styles.colRef}>{r.rango_texto?.split(';').join('\n') || ""}</Text>
                        </View>
                        {!!comentarioExtra ? (
                          <View style={styles.comentarioRow}>
                            <Text style={{ width: '35%' }}></Text>
                            <Text style={styles.comentarioTexto}>* Nota: {comentarioExtra}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );

                  if (isLastArea && isLastRow) {
                    return (
                      <View key={i} wrap={false}>
                        {filaAnalito}
                        
                        {!!nombreValidadorArea ? <Text style={styles.textValidado}>Validado por: <Text style={styles.nombreValidadorBold}>{nombreValidadorArea}</Text></Text> : null}
                        
                        {(!cultivos || cultivos.length === 0) ? (
                          <View style={styles.footerContainer}>
                            <View style={styles.qrContainer}><Image src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=1&data=${encodeURIComponent(qrUrl || "TRIDLAB")}`} style={styles.qrImage} /><Text style={styles.qrText}>Verificar reporte</Text></View>
                            <View style={styles.signatureSection}>
                              {!!validador?.firmaUrl && validador.firmaUrl !== 'null' ? <Image src={validador.firmaUrl} style={styles.signatureImg} /> : null}
                              <Text style={styles.signatureLine}>RESPONSABLE DE LABORATORIO</Text>
                              <Text style={styles.regText}>Reg. Senescyt: {validador?.registro || "S/N"}</Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    );
                  }
                  return <View key={i} wrap={false}>{filaAnalito}</View>;
                })}
                
                {!isLastArea && !!nombreValidadorArea ? <Text style={styles.textValidado}>Validado por: <Text style={styles.nombreValidadorBold}>{nombreValidadorArea}</Text></Text> : null}
              
              </View>
            );
          })}
        </Page>
      ) : null}

      {/* HOJAS ANEXAS DE MICROBIOLOGÍA */}
      {cultivos && cultivos.map((data, idx) => {
        const validadorEspecífico = data.validado_por ? mapaNombres[data.validado_por] : null;
        const tabNombre = data.hemocultivo_indice || "CULTIVO";

        return (
          <Page key={`micro-${idx}`} size="A4" style={styles.page}>
            
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

            <View style={{ ...styles.patientTable, marginBottom: 15 }}>
              <View style={styles.patientRow}><View style={styles.patientCell}><Text style={styles.pLabel}>PACIENTE:</Text><Text style={{ ...styles.pValue, fontSize: 10 }}>{orden?.paciente_nombre || "-"}</Text></View></View>
              <View style={styles.patientRow}>
                <View style={styles.patientCell}><Text style={styles.pLabel}>CÉDULA:</Text><Text style={styles.pValue}>{orden?.paciente_cedula || "-"}</Text></View>
                <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#cbd5e1' }}><Text style={styles.pLabel}>N° ORDEN:</Text><Text style={{ ...styles.pValue, color: '#0284c7' }}>{orden?.codigo_orden || "-"}</Text></View>
              </View>
              <View style={styles.patientRow}>
                <View style={styles.patientCell}><Text style={styles.pLabel}>EDAD / SEXO:</Text><Text style={styles.pValue}>{orden?.paciente_edad || "-"} / {orden?.paciente_sexo || "-"}</Text></View>
                <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#cbd5e1' }}><Text style={styles.pLabel}>FECHA:</Text><Text style={styles.pValue}>{fechaStr}</Text></View>
              </View>
              <View style={{ ...styles.patientRow, borderBottomWidth: 0, backgroundColor: '#fff' }}>
                <View style={styles.patientCell}><Text style={styles.pLabel}>MÉDICO:</Text><Text style={styles.pValue}>{orden?.solicitado_por || 'PARTICULAR'}</Text></View>
                <View style={{ ...styles.patientCell, borderLeftWidth: 1, borderLeftColor: '#cbd5e1' }}><Text style={styles.pLabel}>PROCEDENCIA:</Text><Text style={styles.pValue}>{orden?.procedencia || 'AMBULATORIO'}</Text></View>
              </View>
            </View>

            <View style={{ ...styles.areaHeader, fontSize: 10, padding: 6, marginBottom: 15 }}><Text>MICROBIOLOGÍA</Text></View>

            <View style={{ paddingHorizontal: 10 }}>
                <Text style={styles.reportTitle}>{tabNombre}</Text>

                {data.tipo_muestra === "OTROS" && !!data.muestra_especifica ? (
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>MUESTRA:</Text>
                        <Text style={styles.rowValue}>{String(data.muestra_especifica).toUpperCase()}</Text>
                    </View>
                ) : null}

                {data.is_preliminar ? (
                    <View style={styles.boxPreliminar}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0f766e', marginBottom: 5 }}>REPORTE PRELIMINAR:</Text>
                        <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{data.reporte_preliminar || "Sin observaciones preliminares."}</Text>
                    </View>
                ) : (
                    <View>
                        {!data.is_preliminar && !!data.reporte_preliminar ? (
                             <View style={{ marginBottom: 15 }}>
                                 <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#1e293b' }}>{String(data.reporte_preliminar)}</Text>
                             </View>
                        ) : null}

                        {data.es_microbiota_habitual ? (
                            <View style={{ marginTop: 5 }}>
                                <View style={styles.row}><Text style={styles.rowLabel}>GERMEN AISLADO:</Text><Text style={styles.rowValue}>DESARROLLO DE MICROBIOTA HABITUAL</Text></View>
                                {!!data.mecanismo_resistencia ? (
                                    <View style={{ ...styles.row, marginTop: 5 }}>
                                        <Text style={styles.rowLabel}>VIGILANCIA EPIDEMIOLÓGICA:</Text><Text style={{ ...styles.rowValue, color: '#1e293b' }}>{String(data.mecanismo_resistencia)}</Text>
                                    </View>
                                ) : null}
                                <Text style={{ fontWeight: 'bold', marginTop: 15, fontSize: 10 }}>NOTA: PRUEBA DE SUSCEPTIBILIDAD NO APLICA.</Text>
                            </View>
                        ) : (
                            <>
                                {!!data.fresco ? <View style={styles.row}><Text style={styles.rowLabel}>EXAMEN EN FRESCO:</Text><Text style={styles.rowValue}>{String(data.fresco)}</Text></View> : null}
                                {!!data.tincion_gram ? <View style={styles.row}><Text style={styles.rowLabel}>TINCIÓN DE GRAM DIRECTA:</Text><Text style={styles.rowValue}>{String(data.tincion_gram)}</Text></View> : null}
                                {!!data.polimorfonucleares ? <View style={styles.row}><Text style={styles.rowLabel}>POLIMORFONUCLEARES:</Text><Text style={styles.rowValue}>{String(data.polimorfonucleares)}</Text></View> : null}
                                {!!data.celulas_epiteliales ? <View style={styles.row}><Text style={styles.rowLabel}>CÉLULAS EPITELIALES:</Text><Text style={styles.rowValue}>{String(data.celulas_epiteliales)}</Text></View> : null}
                                {!!data.nickerson ? <View style={styles.row}><Text style={styles.rowLabel}>MEDIO NICKERSON:</Text><Text style={styles.rowValue}>{String(data.nickerson).toUpperCase()}</Text></View> : null}

                                <View style={{ marginTop: 10, marginBottom: 10 }}>
                                    {!!data.contaje_ufc ? <View style={styles.row}><Text style={styles.rowLabel}>CONTAJE:</Text><Text style={styles.rowValue}>{String(data.contaje_ufc)}</Text></View> : null}
                                    {!!data.interpretacion_contaje ? <View style={styles.row}><Text style={styles.rowLabel}>INTERPRETACIÓN:</Text><Text style={styles.rowValue}>{String(data.interpretacion_contaje)}</Text></View> : null}
                                </View>

                                {!!data.germen_aislado ? (
                                    <View style={{ ...styles.row, marginTop: 10, marginBottom: 5 }}>
                                        <Text style={styles.rowLabel}>GERMEN AISLADO:</Text><Text style={styles.rowValueItalic}>{String(data.germen_aislado)}</Text>
                                    </View>
                                ) : null}

                                {!!data.mecanismo_resistencia ? (
                                    <View style={{ ...styles.row, marginBottom: 10 }}>
                                        <Text style={styles.rowLabel}>MECANISMO DE RESISTENCIA:</Text><Text style={{ ...styles.rowValue, color: '#1e293b' }}>{String(data.mecanismo_resistencia)}</Text>
                                    </View>
                                ) : null}

                                {data.antibiograma && Array.isArray(data.antibiograma) && data.antibiograma.length > 0 ? (
                                    <View style={styles.antibiogramTable}>
                                        <View style={styles.antibiogramHeader}>
                                            <Text style={[styles.antibiogramCell, styles.colAnti]}>Antibiótico</Text>
                                            <Text style={[styles.antibiogramCell, styles.colMetodo]}>Método</Text>
                                            <Text style={[styles.antibiogramCell, styles.colValor]}>Valor</Text>
                                            <Text style={[styles.antibiogramCellLast, styles.colInter]}>Interpretación</Text>
                                        </View>
                                        {data.antibiograma.map((anti, xId) => {
                                            let interText = anti.interpretacion || "";
                                            if (interText === 'S') interText = 'S - Sensible';
                                            else if (interText === 'I') interText = 'I - Intermedio';
                                            else if (interText === 'R') interText = 'R - Resistente';

                                            return (
                                                <View key={xId} style={[styles.antibiogramRow, { backgroundColor: xId % 2 === 0 ? '#ffffff' : '#f8fafc' }]}>
                                                    <Text style={[styles.antibiogramCell, styles.colAnti]}>{anti.antibiotico || "-"}</Text>
                                                    <Text style={[styles.antibiogramCell, styles.colMetodo]}>{anti.metodo || "-"}</Text>
                                                    <Text style={[styles.antibiogramCell, styles.colValor]}>{anti.valor || "-"}</Text>
                                                    <Text style={[styles.antibiogramCellLast, styles.colInter]}>{interText}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </>
                        )}
                    </View>
                )}

                {data.validado ? (
                    <Text style={styles.textValidado}>
                        Validado por: <Text style={styles.nombreValidadorBold}>{validadorEspecífico || "Profesional de Laboratorio"}</Text>
                    </Text>
                ) : (
                    <Text style={styles.validationAlert}>* REPORTE AÚN NO VALIDADO *</Text>
                )}

                <Text style={styles.noteText}>El médico es el profesional capacitado para realizar la interpretación del resultado correlacionándolo con otros datos clínicos. Entregar el informe al médico para su análisis.</Text>
            </View>

            <View style={styles.runningFooter} fixed>
              <Text render={({ pageNumber, totalPages }) => `Paciente: ${orden?.paciente_nombre || "-"}    |    Cédula: ${orden?.paciente_cedula || "-"}    |    N° Orden: ${orden?.codigo_orden || "-"}    |    Página ${pageNumber} de ${totalPages}`} />
            </View>

            <View style={styles.footerContainerMicro} fixed>
              <View style={styles.qrContainer}><Image src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=1&data=${encodeURIComponent(qrUrl || "TRIDLAB")}`} style={styles.qrImage} /><Text style={styles.qrText}>Verificar reporte</Text></View>
              <View style={styles.signatureSectionMicro}>
                {!!validador?.firmaUrl && validador.firmaUrl !== 'null' ? <Image src={validador.firmaUrl} style={styles.signatureImgMicro} /> : null}
                <Text style={styles.signatureLineMicro}>RESPONSABLE DE LABORATORIO</Text>
                <Text style={styles.regText}>Reg. Senescyt: {validador?.registro || "S/N"}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export async function generarReporteImpresion({ ordenSeleccionada, resultados, cultivosExternos = null }) {
  try {
    const safeResultados = Array.isArray(resultados) ? resultados : [];
    let safeCultivos = Array.isArray(cultivosExternos) ? cultivosExternos : null;

    if (!safeCultivos) {
       try {
           const { data } = await supabase.from('lab_cultivos_resultados').select('*').eq('orden_id', ordenSeleccionada.id).eq('validado', true);
           safeCultivos = data || [];
       } catch (e) { safeCultivos = []; }
    }

    const tieneExamenValidado = safeResultados.some(r => r.validado === true || String(r.estado_validacion || "").toLowerCase().trim() === 'validado');
    const tieneCultivoValidado = safeCultivos.length > 0;

    if (!tieneExamenValidado && !tieneCultivoValidado) {
      alert("No se puede descargar el reporte. Todos los exámenes se encuentran 'EN PROCESO' y no hay ningún resultado validado aún.");
      return; 
    }

    // 🚀 EL BORRADOR MÁGICO: Filtra de manera infalible la hoja general
    const resultadosGenerales = safeResultados.filter(r => {
        const textoResultado = String(r.resultado_texto || "").toUpperCase().trim();
        
        // 1. Si el texto tiene la palabra "REPORTE" (ej: "VER REPORTE ADJUNTO"), lo eliminamos de la hoja general
        if (textoResultado.includes("REPORTE")) return false;
        
        // 2. Por seguridad extra: si coincide con uno de los cultivos listos
        const nombreExamenStr = String(r.nombre_examen || "").toUpperCase().trim();
        const esCultivoValidado = safeCultivos.some(c => {
             const indiceCultivo = String(c.hemocultivo_indice || "").toUpperCase().trim();
             return indiceCultivo === nombreExamenStr || indiceCultivo.includes(nombreExamenStr) || nombreExamenStr.includes(indiceCultivo);
        });
        
        if (esCultivoValidado) return false; 

        return true; 
    });

    const validadoresIds = [...new Set([
        ...resultadosGenerales.map(r => r.validado_por),
        ...safeCultivos.map(c => c.validado_por)
    ].filter(Boolean))];

    const mapaNombres = {};
    let validador = { registro: "S/N", firmaUrl: null };
    
    let usuariosArr = [];
    try {
        const { data: uData, error: uErr } = await supabase.rpc('get_todos_los_validadores');
        if (!uErr && uData) usuariosArr = uData;
    } catch (e) { console.warn("Error RPC usuarios:", e); }

    if (usuariosArr.length === 0) {
        try {
            const { data } = await supabase.from('lab_usuarios').select('id, nombre, cargo, registro_senescyt, firma_path');
            if (data) usuariosArr = data;
        } catch(e) {}
    }

    if (usuariosArr.length > 0) {
        usuariosArr.forEach(u => {
          let acro = "";
          const cargo = (u.cargo || "").toUpperCase().trim();
          if (cargo.includes("QUIM") || cargo.includes("QUÍM") || cargo.includes("FARM")) acro = "Q.F. ";
          else if (cargo.includes("LIC")) acro = "Lic. ";
          else if (cargo.includes("TEC")) acro = "Tec. Med. ";
          
          mapaNombres[u.id] = `${acro}${u.nombre}`.trim();
        });

        const responsable = usuariosArr.find(u => (u.cargo || "").toUpperCase().includes('RESPONSABLE'));
        if (responsable) {
            validador.registro = responsable.registro_senescyt || "S/N";
            if (responsable.firma_path && String(responsable.firma_path).trim() !== 'null') {
                const { data: pUrl } = supabase.storage.from('firmas').getPublicUrl(responsable.firma_path);
                validador.firmaUrl = pUrl.publicUrl;
            }
        }
    }

    let dict = {};
    try {
        const { data: exConfig } = await supabase.from("examenes").select("id, orden_impresion, lab_areas(nombre, orden_visual)");
        if (exConfig) {
          exConfig.forEach(ex => {
            const area = Array.isArray(ex.lab_areas) ? ex.lab_areas[0] : ex.lab_areas;
            dict[ex.id] = { area: area?.nombre || "OTROS", aOrd: area?.orden_visual || 999, eOrd: ex.orden_impresion || 999 };
          });
        }
    } catch(e) { console.warn("Exámenes protegidos. Usando configuración por defecto."); }

    const sorted = resultadosGenerales.map(r => ({ ...r, aN: dict[r.examen_id]?.area || "OTROS", aO: dict[r.examen_id]?.aOrd || 999, eO: dict[r.examen_id]?.eOrd || 999 }))
      .sort((a, b) => a.aO - b.aO || a.eO - b.eO || ((a.orden_visual || 0) - (b.orden_visual || 0)));

    const grouped = {};
    sorted.forEach(r => { if (!grouped[r.aN]) grouped[r.aN] = []; grouped[r.aN].push(r); });

    let tokenParaQR = ordenSeleccionada?.codigo_orden || "TRIDLAB"; 
    
    const urlVerificacion = `${window.location.origin}/verificar?token=${tokenParaQR}`;

    const blob = await pdf(<ReportePDF orden={ordenSeleccionada} validador={validador} mapaNombres={mapaNombres} groupedResults={grouped} qrUrl={urlVerificacion} cultivos={safeCultivos} />).toBlob();
    const url = URL.createObjectURL(blob);
    
    const esDispositivoMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (esDispositivoMovil) {
      window.open(url, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = `Resultados_TridLab_${ordenSeleccionada?.codigo_orden || "000"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) { 
    console.error("Crash Error PDF:", error);
    throw error;
  }
}