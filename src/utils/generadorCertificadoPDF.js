import jsPDF from 'jspdf';

// Función auxiliar para formatear la fecha actual en texto formal
function obtenerFechaEnLetras() {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const hoy = new Date();
  return `${hoy.getDate()} de ${meses[hoy.getMonth()]} del ${hoy.getFullYear()}`;
}

// Cargador de imágenes en Base64 (igual al de las cotizaciones)
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
  // Inicializamos PDF en formato A4 (puntos)
  const doc = new jsPDF('p', 'pt', 'a4');
  
  const { nombre, cedula } = datosPaciente;
  const { nombre: nombreResponsable, cedula: cedulaResponsable } = responsable;

  // ==========================================
  // 1. ENCABEZADO / DISEÑO REUTILIZADO
  // ==========================================
  // Línea decorativa superior (Cyan/Azul del laboratorio)
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 0, 595, 15, 'F');

  // Nombre del Laboratorio Clínico
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(22);
  doc.setTextColor(29, 78, 216); // Azul estándar
  doc.text("LABORATORIO CLINICO TRIDLAB", 40, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Gris secundario
  doc.text("Dirección: 25va Entre la A y la B  |  Guayaquil, Ecuador\nContacto: laboratorio_clinico_@outlook.com", 40, 78);

  // Carga del Logo institucional
  const logoB64 = await getBase64Image('/logo.png');
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', 475, 35, 80, 70, '', 'FAST');
  }

  // Línea divisoria
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 120, 555, 120);

  // ==========================================
  // 2. TÍTULO DEL CERTIFICADO
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate oscuro
  doc.text("CERTIFICADO DE ASISTENCIA", 297.5, 180, { align: "center" });

  // ==========================================
  // 3. CUERPO DEL TEXTO (Formato formal)
  // ==========================================
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(51, 51, 51);
  
  // Texto justificado o estructurado formalmente
  const textoCuerpo = `Por medio de la presente, se certifica que el/la paciente LOPEZ LEON VIRGINIA GEOCONDA, con documento de identidad N°. 0930413414, asistió a las instalaciones de nuestro laboratorio el día de hoy, ${obtenerFechaEnLetras()}, para la realización de análisis y exámenes clínicos requeridos.\n\nSe extiende el presente certificado a petición de la parte interesada para los fines legales o laborales que estime convenientes.`;

  // splitTextToSize divide el texto automáticamente para que no se salga de las márgenes (ancho máximo de 515 puntos)
  const lineasTexto = doc.splitTextToSize(textoCuerpo, 515);
  doc.text(lineasTexto, 40, 240, { lineHeightFactor: 1.6 });

  // Fecha de emisión al final del cuerpo
  doc.setFont("helvetica", "italic");
  doc.text(`Guayaquil, ${obtenerFechaEnLetras()}`, 40, 380);

  // ==========================================
  // 4. SECCIÓN DE FIRMA AUTOMÁTICA
  // ==========================================
  const firmaY = 460;
  
  // Carga de la foto de la firma de la carpeta public
  const firmaB64 = await getBase64Image('/firma.png');
  if (firmaB64) {
    // Ajusta las coordenadas y proporciones (X, Y, Ancho, Alto) según tu imagen de firma
    doc.addImage(firmaB64, 'PNG', 247.5, firmaY, 100, 50, '', 'FAST');
  }

  // Línea para firmar
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(1);
  doc.line(210, firmaY + 55, 385, firmaY + 55);

  // Datos dinámicos del responsable predefinidos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(nombreResponsable.toUpperCase(), 297.5, firmaY + 70, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`C.I. ${cedulaResponsable}`, 297.5, firmaY + 83, { align: "center" });
  doc.text("Responsable de Laboratorio", 297.5, firmaY + 95, { align: "center" });

  // ==========================================
  // 5. PIE DE PÁGINA
  // ==========================================
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento emitido de forma automatizada por el sistema LIS TridLab. Cualquier alteración invalida este documento.", 297.5, pageHeight - 30, { align: "center" });

  // Retorna el Blob listo para ser descargado o abierto
  return doc.output('blob');
}