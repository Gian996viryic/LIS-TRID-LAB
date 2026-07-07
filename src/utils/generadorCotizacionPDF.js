import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const VERIFY_WEB_BASE = "https://cotizador-trid.vercel.app";

// Paleta de colores corregida (terminando en el moradito del logo)
const TRIDLAB_COLORS = [
  [6, 182, 212],   // T (Cyan)
  [59, 130, 246],  // R (Azul)
  [99, 102, 241],  // I (Índigo)
  [139, 92, 246],  // D (Morado)
  [168, 85, 247],  // L (Morado claro)
  [192, 38, 211],  // A (Morado magenta)
  [162, 28, 175]   // B (Moradito oscuro del logo)
];

function money(n) { return Number(n || 0).toFixed(2); }

// Cargador de Logo en Base64
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

export async function generarPDFCotizacion(datos) {
  const doc = new jsPDF('p', 'pt', 'a4'); 
  const { codigo, paciente, fecha, validoHasta, verifyToken, examenes, total, subtotal, cuponMode, descuento, totalNormal } = datos;

  // ==========================================
  // 1. CABECERAS (CON EFECTO GRADIENTE)
  // ==========================================
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(16);
  
  // Dibujar "LABORATORIO CLINICO " en azul estandar
  let hX = 40;
  doc.setTextColor(29, 78, 216);
  doc.text("LABORATORIO CLINICO ", hX, 50);
  hX += doc.getTextWidth("LABORATORIO CLINICO ");
  
  // Declaramos la variable una sola vez aquí arriba
  const tridlabStr = "TRIDLAB";
  for (let i = 0; i < tridlabStr.length; i++) {
    doc.setTextColor(TRIDLAB_COLORS[i][0], TRIDLAB_COLORS[i][1], TRIDLAB_COLORS[i][2]);
    doc.text(tridlabStr[i], hX, 50);
    hX += doc.getTextWidth(tridlabStr[i]);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17); // Negro
  doc.text("25va Entre la A y la B\nCiudad: GUAYAQUIL\n\nE-mail: laboratorio_clinico_@outlook.com\nPROCEDENCIA: " + (paciente.procedencia || "PARTICULAR").toUpperCase(), 40, 65);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(162, 28, 175); // Cambiado a moradito para que combine
  doc.text("COTIZACIÓN", 555, 50, { align: "right" });

  // Tabla superior derecha
  autoTable(doc, {
    startY: 58,
    margin: { left: 395 },
    tableWidth: 160,
    theme: 'grid',
    body: [
      ['FECHA', fecha || ''],
      ['COTIZACIÓN #', codigo],
      ['VALIDO HASTA', validoHasta || '']
    ],
    styles: { fontSize: 8, textColor: 17, lineColor: 51, lineWidth: 1, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: 255 },
      1: { halign: 'center', fillColor: 255 }
    }
  });

  // ==========================================
  // 2. LOGO
  // ==========================================
  const logoB64 = await getBase64Image('/logo.png');
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', 257, 65, 80, 70, '', 'FAST'); 
  }

  // ==========================================
  // 3. SECCIÓN CLIENTE
  // ==========================================
  const clientY = 140;
  doc.setFillColor(147, 197, 253);
  doc.rect(40, clientY, 515, 14, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 17);
  doc.text("CLIENTE", 45, clientY + 10);

  doc.setFont("helvetica", "normal");
  const textY = clientY + 26;
  const lh = 12;
  const sexoLbl = paciente.sexo === "M" ? "MASCULINO" : paciente.sexo === "F" ? "FEMENINO" : "N/A";

  doc.text(`Nombre: ${paciente.nombre || "N/A"}`, 40, textY);
  doc.text(`Cédula: ${paciente.cedula || "N/A"}`, 40, textY + lh);
  doc.text(`Edad: ${paciente.edad || "N/A"}`, 40, textY + lh*2);
  doc.text(`Sexo: ${sexoLbl}`, 40, textY + lh*3);
  doc.text(`Email: ${paciente.correo || "N/A"}`, 40, textY + lh*4);

  doc.text(`Dirección: ${datosPDF.paciente.direccion || 'N/A'}`, x, y);
  doc.text(`Ciudad: ${datosPDF.paciente.ciudad || 'GUAYAQUIL'}`, x, y);
  doc.text(`Teléfono: ${paciente.telefono || "N/A"}`, 300, textY + lh*2);
  doc.text(`Doctor: ${paciente.doctor || "PARTICULAR"}`, 300, textY + lh*3);

  // ==========================================
  // 4. TABLA PRINCIPAL DE EXÁMENES
  // ==========================================
  const tableBody = examenes.map(ex => {
    const precio = Number(ex.precioFinal || ex.precio_normal || 0);
    const sub = precio * (ex.cant || 1);
    return [ex.codigo, ex.articulo, "1", "$", money(precio), "$", money(sub), "$", "-", "$", money(sub)];
  });

  while (tableBody.length < 9) {
    tableBody.push(["", "", "", "", "", "", "", "", "", "", ""]);
  }

  autoTable(doc, {
    startY: textY + lh*4 + 10,
    head: [['CODIGO', 'DESCRIPCION', 'CANT', {content:'PRECIO', colSpan:2}, {content:'SUB-TOTAL', colSpan:2}, {content:'IVA', colSpan:2}, {content:'TOTAL', colSpan:2}]],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [147, 197, 253], textColor: 17, fontSize: 8, fontStyle: 'bold', lineColor: 51, lineWidth: 1, halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: 17, lineColor: 51, lineWidth: 1, cellPadding: 3 },
    alternateRowStyles: { fillColor: [242, 242, 242] },
    columnStyles: {
      0: { cellWidth: 45, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 15, halign: 'center', border: { right: 0 } },
      4: { cellWidth: 35, halign: 'right', border: { left: 0 } },
      5: { cellWidth: 15, halign: 'center', border: { right: 0 } },
      6: { cellWidth: 40, halign: 'right', border: { left: 0 } },
      7: { cellWidth: 15, halign: 'center', border: { right: 0 } },
      8: { cellWidth: 20, halign: 'center', border: { left: 0 } },
      9: { cellWidth: 15, halign: 'center', border: { right: 0 } },
      10: { cellWidth: 40, halign: 'right', border: { left: 0 } }
    },
    margin: { left: 40, right: 40 }
  });

  const finalY = doc.lastAutoTable.finalY + 15;

  // ==========================================
  // 5. CAJA DE TÉRMINOS (IZQUIERDA)
  // ==========================================
  doc.setFillColor(96, 165, 250);
  doc.rect(40, finalY, 300, 16, 'F');
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(1);
  doc.rect(40, finalY, 300, 110, 'S');

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 17, 17);
  doc.text("TÉRMINOS Y CONDICIONES", 45, finalY + 11);
  doc.setFont("helvetica", "normal");
  doc.text("1. El pago será debitado antes de la entrega de bienes y servicios", 45, finalY + 28);
  doc.text("2. Enviar la cotización firmada al email indicado anteriormente", 45, finalY + 40);
  doc.text("La aceptación del cliente (firmar a continuación):", 45, finalY + 52);
  doc.text("3. O confirmar via whatsapp al 0968624624/0989195035", 45, finalY + 64);
  doc.text("X ___________________________________________", 45, finalY + 95);
  doc.text("Nombre del cliente:", 45, finalY + 107);

  // ==========================================
  // 6. TABLA DE TOTALES (DERECHA)
  // ==========================================
  const rightX = 350;
  const rightW = 205;
  const midLabel = cuponMode === "percent" ? "DESCUENTO" : "IVA";
  const midValue = cuponMode === "percent" && Number(descuento) > 0 ? `$ ${money(descuento)}` : "$-";
  const showNormalRow = cuponMode === "convenio" && Number(totalNormal) > 0;
  const showAhorro = cuponMode !== "none" && Number(descuento) > 0;

  const totalsBody = [ ['Subtotal', `$ ${money(subtotal)}`] ];
  if (showNormalRow) totalsBody.push(['TOTAL NORMAL', `$ ${money(totalNormal)}`]);
  totalsBody.push([midLabel, midValue]);
  totalsBody.push(['TOTAL', `$ ${money(total)}`]);
  if (showAhorro) totalsBody.push(['AHORRO', `$ ${money(descuento)}`]);

  autoTable(doc, {
    startY: finalY,
    margin: { left: rightX },
    tableWidth: rightW,
    theme: 'grid',
    body: totalsBody,
    styles: { fontSize: 8, textColor: 17, lineColor: 51, lineWidth: 1, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: 255 },
      1: { halign: 'right', fontStyle: 'bold', fillColor: 255 }
    },
    willDrawCell: function(data) {
      if (data.row.raw[0] === 'TOTAL' && data.section === 'body') {
        doc.setFillColor(147, 197, 253);
      }
      if (data.row.raw[0] === 'AHORRO' && data.column.index === 1) {
         doc.setTextColor(22, 163, 74); 
      }
    }
  });

  // ==========================================
  // 7. CÓDIGO QR Y TEXTOS
  // ==========================================
  const qrY = doc.lastAutoTable.finalY + 10;
  doc.rect(rightX, qrY, rightW, 105, 'S');
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17);
  doc.text("Verificación", rightX + rightW/2, qrY + 14, { align: 'center' });

  const verifyUrlPretty = `${VERIFY_WEB_BASE}/verify/?code=${encodeURIComponent(codigo)}&t=${encodeURIComponent(verifyToken)}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrlPretty, { margin: 0 });
    doc.addImage(qrDataUrl, 'PNG', rightX + (rightW/2) - 25, qrY + 20, 50, 50);
  } catch (err) {}

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Escanee para verificar autenticidad.", rightX + rightW/2, qrY + 82, { align: 'center' });
  doc.text(`Válida hasta: ${validoHasta || ""}.`, rightX + rightW/2, qrY + 91, { align: 'center' });
  doc.text("Si el enlace expira, escanee nuevamente.", rightX + rightW/2, qrY + 100, { align: 'center' });

  // ==========================================
  // 8. PIE DE PÁGINA (CON EFECTO GRADIENTE)
  // ==========================================
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.text("Si usted tiene alguna pregunta sobre esta cotización, por favor, póngase en contacto con nosotros", 297.5, pageHeight - 35, { align: "center" });

  doc.setFont("helvetica", "bold");
  
  const foot1 = "LABORATORIO CLINICO ";
  const foot2 = " | E-mail: laboratorio_clinico_@outlook.com";
  
  // Reutilizamos la constante de arriba sin declararla de nuevo
  const totalW = doc.getTextWidth(foot1 + tridlabStr + foot2);
  let fX = 297.5 - (totalW / 2);

  doc.setTextColor(17, 17, 17);
  doc.text(foot1, fX, pageHeight - 23);
  fX += doc.getTextWidth(foot1);

  for (let i = 0; i < tridlabStr.length; i++) {
    doc.setTextColor(TRIDLAB_COLORS[i][0], TRIDLAB_COLORS[i][1], TRIDLAB_COLORS[i][2]);
    doc.text(tridlabStr[i], fX, pageHeight - 23);
    fX += doc.getTextWidth(tridlabStr[i]);
  }

  doc.setTextColor(17, 17, 17);
  doc.text(foot2, fX, pageHeight - 23);

  doc.setFont("helvetica", "italic");
  doc.text("Gracias por confiar en nosotros!", 297.5, pageHeight - 11, { align: "center" });

  return doc.output('blob');
}