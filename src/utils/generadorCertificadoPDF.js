import jsPDF from 'jspdf';

// Función auxiliar para formatear la fecha
function obtenerFechaEnLetras() {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const hoy = new Date();
  return `${hoy.getDate()} de ${meses[hoy.getMonth()]} del ${hoy.getFullYear()}`;
}

async function getBase64Image(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

export async function generarPDFCertificadoAsistencia(datosPaciente, responsable) {
  const doc = new jsPDF('p', 'pt', 'a4');
  
  const { nombre, cedula } = datosPaciente;
  const { nombre: nombreResponsable, registro_senescyt } = responsable;

  // ==========================================
  // 1. ENCABEZADO (SIN LÍNEA SUPERIOR)
  // ==========================================
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(22);
  doc.setTextColor(29, 78, 216); // Azul estándar
  doc.text("LABORATORIO CLINICO TRIDLAB", 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); 
  doc.text("Dirección: 25va Entre la A y la B  |  Guayaquil, Ecuador\nContacto: laboratorio_clinico_@outlook.com", 40, 68);

  const logoB64 = await getBase64Image('/logo.png');
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', 475, 25, 80, 70, '', 'FAST');
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 110, 555, 110);

  // ==========================================
  // 2. TÍTULO
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("CERTIFICADO DE ASISTENCIA", 297.5, 170, { align: "center" });

  // ==========================================
  // 3. CUERPO DEL TEXTO (DATOS DINÁMICOS)
  // ==========================================
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  
  const textoCuerpo = `Por medio de la presente, se certifica que el/la paciente ${nombre || ""}, con documento de identidad N°. ${cedula || "S/N"}, asistió a las instalaciones de nuestro laboratorio el día de hoy, ${obtenerFechaEnLetras()}, para la realización de análisis y exámenes clínicos requeridos.\n\nSe extiende el presente certificado a petición de la parte interesada para los fines legales o laborales que estime convenientes.`;

  const lineasTexto = doc.splitTextToSize(textoCuerpo, 515);
  doc.text(lineasTexto, 40, 230, { lineHeightFactor: 1.6 });

  doc.setFont("helvetica", "italic");
  doc.text(`Guayaquil, ${obtenerFechaEnLetras()}`, 40, 370);

  // ==========================================
  // 4. FIRMA INTELIGENTE
  // ==========================================
  const firmaY = 460;
  
  const firmaB64 = await getBase64Image('/firma.png');
  if (firmaB64) {
    doc.addImage(firmaB64, 'PNG', 247.5, firmaY, 100, 50, '', 'FAST');
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(1);
  doc.line(210, firmaY + 55, 385, firmaY + 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(nombreResponsable ? nombreResponsable.toUpperCase() : "", 297.5, firmaY + 70, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  
  let currentY = firmaY + 83;

  // Si existe el registro (y no dice undefined o S/N), lo imprime. Si no, lo salta.
  if (registro_senescyt && String(registro_senescyt) !== "undefined" && registro_senescyt !== "S/N" && registro_senescyt.trim() !== "") {
    doc.text(`Reg. Senescyt: ${registro_senescyt}`, 297.5, currentY, { align: "center" });
    currentY += 12; // Empuja el texto de abajo
  }

  doc.text("Responsable de Laboratorio", 297.5, currentY, { align: "center" });

  // ==========================================
  // 5. PIE DE PÁGINA
  // ==========================================
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento emitido de forma automatizada por el sistema LIS TridLab. Cualquier alteración invalida este documento.", 297.5, pageHeight - 30, { align: "center" });

  return doc.output('blob');
}