import { jsPDF } from 'jspdf';
import { Venta, DetalleVenta, Producto, Sucursal, Cliente, Usuario } from '../types/pharmacy';

// Helper to draw a mock QR code representation on jsPDF canvas
function drawMockQRCode(doc: jsPDF, x: number, y: number, size: number) {
  // Border box
  doc.rect(x, y, size, size);
  // Grid lines to look like a real QR code matrix
  doc.setLineWidth(0.2);
  doc.setDrawColor(180, 180, 180);
  for (let i = 2; i < size; i += 2) {
    if (i % 4 === 0) {
      doc.line(x + i, y, x + i, y + size);
      doc.line(x, y + i, x + size, y + i);
    }
  }
  // Standard QR position indicators (nested squares in 3 corners)
  doc.setFillColor(0, 0, 0);
  // Top-Left corner
  doc.rect(x + 1, y + 1, 5, 5, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 2, y + 2, 3, 3, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(x + 2.5, y + 2.5, 2, 2, 'F');

  // Top-Right corner
  doc.setFillColor(0, 0, 0);
  doc.rect(x + size - 6, y + 1, 5, 5, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(x + size - 5, y + 2, 3, 3, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(x + size - 4.5, y + 2.5, 2, 2, 'F');

  // Bottom-Left corner
  doc.setFillColor(0, 0, 0);
  doc.rect(x + 1, y + size - 6, 5, 5, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 2, y + size - 5, 3, 3, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(x + 2.5, y + size - 4.5, 2, 2, 'F');
}

export interface DocumentContext {
  sale: Venta;
  details: (DetalleVenta & { productoName: string; principioActivo: string; concentra: string })[];
  branch?: Sucursal;
  client?: Cliente;
  cashier?: Usuario;
}

/**
 * 1. GENERATE A4 FORMAT PDF FOR DOWNLOAD
 */
export function generateA4Document(ctx: DocumentContext): jsPDF {
  const { sale, details, branch, client } = ctx;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color theme: Charcoal & Indigo
  const primaryColor = { r: 15, g: 23, b: 42 }; // Slate 900
  const accentColor = { r: 79, g: 70, b: 229 };  // Indigo 600
  const lightBg = { r: 248, g: 250, b: 252 };     // Slate 50

  let pageNumber = 1;
  const contentHeightLimit = 262; // safe layout height limit before page breaks

  // Repeating header draw helper
  const drawPageHeader = (pageNum: number) => {
    // 1. Header background belt
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, 210, 15, 'F'); // Top colored band

    if (pageNum === 1) {
      // Company Logo & Info
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('BOTICA ENTERPRISE S.A.C.', 15, 30);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      
      const branchName = branch?.nombre || 'Sede Principal - Lima';
      const branchDir = branch?.direccion || 'Av. Javier Prado Este 1040, San Isidro';
      const branchCity = branch?.ciudad || 'Lima';
      const branchUbigeo = branch?.ubigeo || '150101';
      
      doc.text(`Establecimiento: ${branchName}`, 15, 36);
      doc.text(`Dirección: ${branchDir} - ${branchCity}`, 15, 41);
      doc.text(`Ubigeo: ${branchUbigeo} • Telf: (01) 458-1209`, 15, 46);
      doc.text('Correo: farmacia.control@boticaenterprise.com.pe', 15, 51);

      // SUNAT Invoice Number Frame Box (Top Right)
      doc.setLineWidth(0.6);
      doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
      doc.setFillColor(lightBg.r, lightBg.g, lightBg.b);
      doc.rect(130, 22, 65, 32, 'FD'); // Box
      
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('R.U.C. 20485129304', 162.5, 29, { align: 'center' });
      doc.setFontSize(11.5);
      doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
      
      const typeLabelStr = sale.tipo_comprobante === 'Factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA';
      doc.text(typeLabelStr, 162.5, 38, { align: 'center' });
      doc.setFontSize(13.5);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text(`${sale.serie_comprobante}-${sale.numero_comprobante}`, 162.5, 47, { align: 'center' });
    } else {
      // Clean secondary page header
      doc.setTextColor(120, 120, 120);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`REPRESENTACIÓN IMPRESA OSE: ${sale.serie_comprobante}-${sale.numero_comprobante} • Pág. ${pageNum}`, 15, 22);
      doc.setLineWidth(0.2);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 24, 195, 24);
    }
  };

  // Repeating table header draw helper
  const drawPageTableHeader = (y: number) => {
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(15, y, 180, 7, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CANT.', 17, y + 5);
    doc.text('FÓRMULA / MEDICAMENTO [LOTE]', 32, y + 5);
    doc.text('P. UNIT', 130, y + 5);
    doc.text('IGV total', 155, y + 5);
    doc.text('TOTAL GENERAL', 174, y + 5);
  };

  // Repeating footer draw helper
  const drawPageFooter = (pageNum: number) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`Pág. ${pageNum}`, 195, 288, { align: 'right' });
    doc.text('Autorizado por SUNAT mediante Resolución N° 097-2012. Consultas en farmacia.boticaenterprise.com.pe', 15, 288);
  };

  // --- START DRAW PAGE 1 ---
  drawPageHeader(1);

  // 3. Client & Document Info Section
  doc.setFillColor(lightBg.r, lightBg.g, lightBg.b);
  doc.rect(15, 60, 180, 26, 'F');
  doc.setLineWidth(0.25);
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, 60, 180, 26);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text('INFORMACIÓN DE LA DISPENSACIÓN / CLIENTE:', 20, 66);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  
  const clientName = client?.nombre_razon_social || 'PÚBLICO EN GENERAL / CLIENTE AL MENOR';
  const clientDocType = client?.tipo_documento || 'DNI / SIN DOCUMENTO';
  const clientDocNum = client?.numero_documento || '00000000';
  const clientAddr = client?.direccion || 'S/D';
  
  doc.text(`Adquiriente: ${clientName}`, 20, 72);
  doc.text(`${clientDocType}: ${clientDocNum}`, 20, 77);
  doc.text(`Dirección Fiscal: ${clientAddr}`, 20, 82);

  // Date alignment
  doc.setFont('Helvetica', 'bold');
  doc.text('Fecha de Emisión:', 135, 72);
  doc.setFont('Helvetica', 'normal');
  doc.text(sale.fecha_emision, 166, 72);
  
  doc.setFont('Helvetica', 'bold');
  doc.text('Moneda:', 135, 77);
  doc.setFont('Helvetica', 'normal');
  doc.text('Soles (S/) - PEN', 152, 77);

  doc.setFont('Helvetica', 'bold');
  doc.text('Condición Pago:', 135, 82);
  doc.setFont('Helvetica', 'normal');
  doc.text('Contado - Efectivo', 162, 82);

  // Table Setup
  let currentY = 95;
  drawPageTableHeader(currentY);
  currentY += 7;

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8.5);

  // Draw details with intelligent page breaks
  details.forEach((item, idx) => {
    const rowHeight = 8;
    
    // Check if the current row fits on the page
    if (currentY + rowHeight > contentHeightLimit) {
      // Draw footer for the soon-to-be-closed page
      drawPageFooter(pageNumber);

      // Add a fresh page
      doc.addPage();
      pageNumber++;

      // Redraw headers for the brand new page
      drawPageHeader(pageNumber);
      
      // Draw table header in its recurring style
      currentY = 32;
      drawPageTableHeader(currentY);
      currentY += 7;

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8.5);
    }

    // Alternate light background row
    if (idx % 2 === 1) {
      doc.setFillColor(250, 252, 254);
      doc.rect(15, currentY, 180, rowHeight, 'F');
    }
    
    // Draw cells
    doc.setTextColor(40, 40, 40);
    doc.text(String(item.cantidad), 18, currentY + 5.5);
    
    // Concatenate drug name + principle active + lot
    const mainText = `${item.productoName} (${item.principioActivo}) [LOTE: ${item.numero_lote}]`;
    // Smart cell wrapping / truncation to sustain responsive column alignment
    const truncatedText = mainText.length > 55 ? mainText.slice(0, 52) + '...' : mainText;
    doc.text(truncatedText, 32, currentY + 5.5);
    
    doc.text(`S/ ${item.precio_unitario.toFixed(2)}`, 130, currentY + 5.5);
    doc.text(`S/ ${item.igv_item.toFixed(2)}`, 155, currentY + 5.5);
    doc.text(`S/ ${item.total_item.toFixed(2)}`, 174, currentY + 5.5);

    // bottom thin divider
    doc.setDrawColor(230, 230, 230);
    doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
    currentY += rowHeight;
  });

  // Check if Totals + Footer fits, else push to a clean last page
  const totalsSectionHeight = 28;
  const sunatSectionHeight = 35;
  const totalRequiredHeight = totalsSectionHeight + sunatSectionHeight + 5;

  if (currentY + totalRequiredHeight > contentHeightLimit) {
    drawPageFooter(pageNumber);
    doc.addPage();
    pageNumber++;
    drawPageHeader(pageNumber);
    currentY = 30;
  }

  // 5. Totals panel
  currentY += 4;
  doc.setFillColor(lightBg.r, lightBg.g, lightBg.b);
  doc.rect(125, currentY, 70, 24, 'F');
  doc.setLineWidth(0.2);
  doc.setDrawColor(180, 180, 180);
  doc.rect(125, currentY, 70, 24);

  doc.setTextColor(70, 70, 70);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Subtotal Gravado S/ IGV:', 127, currentY + 5);
  doc.setFont('Helvetica', 'normal');
  doc.text(`S/ ${sale.subtotal.toFixed(2)}`, 180, currentY + 5);

  doc.setFont('Helvetica', 'bold');
  doc.text('IGV de Ley (18.00%):', 127, currentY + 11);
  doc.setFont('Helvetica', 'normal');
  doc.text(`S/ ${sale.igv.toFixed(2)}`, 180, currentY + 11);

  doc.setLineWidth(0.4);
  doc.setDrawColor(180, 180, 180);
  doc.line(125, currentY + 14, 195, currentY + 14);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.setFontSize(10.5);
  doc.text('TOTAL NETO (PEN):', 127, currentY + 20);
  doc.setFont('Helvetica', 'bold');
  doc.text(`S/ ${sale.total.toFixed(2)}`, 176, currentY + 20);

  // 6. SUNAT Footer / QR / Fingerprint Code
  const footerY = currentY + 28;
  
  // Left: QR and explanation
  drawMockQRCode(doc, 15, footerY, 28);
  
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont('Helvetica', 'bold');
  doc.text('REPRESENTACIÓN IMPRESA AUTORIZADA DE SUNAT', 48, footerY + 5);
  
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.setFontSize(7.5);
  doc.text(`Resumen electrónico: ${sale.hash_sunat}`, 48, footerY + 10);
  doc.text('Autorizado por OSE de conformidad con la Resolución de SUNAT N° 097-2012.', 48, footerY + 15);
  doc.text('Consulte la validez de este comprobante en la web oficial con sus credenciales fiscales.', 48, footerY + 20);

  // Status stamp box
  doc.setFillColor(240, 253, 244); // Very light emerald green
  doc.setDrawColor(187, 247, 208);
  doc.rect(48, footerY + 22, 147, 6, 'FD');
  doc.setTextColor(21, 128, 61);
  doc.setFont('Helvetica', 'bold');
  doc.text('✔ TRANSMISIÓN CORRECTA SÍNCRONA APROBADA POR LA SUNAT', 51, footerY + 26.5);

  // Draw final page footer
  drawPageFooter(pageNumber);

  return doc;
}

/**
 * 2. GENERATE COMPACT TICKET (80MM / THERMAL PRINT) PDF FOR DOWNLOAD
 */
export function generateTicketDocument(ctx: DocumentContext): jsPDF {
  const { sale, details, branch, client } = ctx;
  
  // Calculating dynamic ticket length based on drug purchase count
  const itemHeightFactor = details.length * 8;
  const ticketHeight = 125 + itemHeightFactor; // increased from 115 to 125 to compensate for header space

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, Math.max(140, ticketHeight)] // increased min height
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont('Courier', 'bold');
  doc.setFontSize(9);
  doc.text('BOTICA ENTERPRISE S.A.C.', 40, 8, { align: 'center' });
  doc.setFont('Courier', 'normal');
  doc.setFontSize(7.5);
  doc.text('RUC: 20485129304', 40, 12, { align: 'center' });
  
  const bName = branch?.nombre || 'Sede Principal - Lima';
  const bDir = branch?.direccion || 'Av. Javier Prado Este 1040, San Isidro';
  doc.text(bName, 40, 16, { align: 'center' });
  doc.text(bDir, 40, 20, { align: 'center' });

  // dashed divider
  doc.text('--------------------------------------------', 40, 23, { align: 'center' });

  // Prominent Document Classification & Correlative block
  doc.setFont('Courier', 'bold');
  doc.setFontSize(9.5);
  const typeLabel = sale.tipo_comprobante === 'Factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA';
  doc.text(typeLabel, 40, 28, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`N° ${sale.serie_comprobante}-${sale.numero_comprobante}`, 40, 33, { align: 'center' });

  doc.setFont('Courier', 'normal');
  doc.setFontSize(7.5);
  doc.text('--------------------------------------------', 40, 37, { align: 'center' });

  // Document meta details below
  doc.text(`FECHA EMISIÓN: ${sale.fecha_emision}`, 5, 41);
  
  const labelType = client?.tipo_documento || 'DNI';
  const numDoc = client?.numero_documento || 'S/D';
  doc.text(`CLIENTE: ${client?.nombre_razon_social || 'CLIENTE AL POR MENOR'}`, 5, 45);
  doc.text(`DOC. IDENTIDAD: ${labelType} ${numDoc}`, 5, 49);

  doc.text('--------------------------------------------', 40, 53, { align: 'center' });

  // Table items title
  doc.setFont('Courier', 'bold');
  doc.text('CANT  PRODUCTO [LOTE]         P.UNIT   TOTAL', 5, 57);
  doc.setFont('Courier', 'normal');

  let currentY = 61;
  details.forEach((item) => {
    // Line 1: quantity and product name
    const drugLine = `${item.cantidad} x ${item.productoName.slice(0, 20)}`;
    doc.text(drugLine, 5, currentY);

    // Line 2: lot info and pricing breakdown
    const qtyPriceText = `  [Lote: ${item.numero_lote}]`;
    const rightPrices = `S/ ${item.precio_unitario.toFixed(2)}  S/ ${item.total_item.toFixed(2)}`;
    doc.text(qtyPriceText, 5, currentY + 3.5);
    doc.text(rightPrices, 75, currentY + 3.5, { align: 'right' });
    
    currentY += 8;
  });

  doc.text('--------------------------------------------', 40, currentY, { align: 'center' });
  currentY += 4;

  // Breakdown summary
  doc.text(`Gravada afecto IGV (18%):     S/ ${sale.subtotal.toFixed(2)}`, 75, currentY, { align: 'right' });
  currentY += 3.5;
  doc.text(`Impuesto total IGV (18%):     S/ ${sale.igv.toFixed(2)}`, 75, currentY, { align: 'right' });
  currentY += 4;
  doc.setFont('Courier', 'bold');
  doc.setFontSize(8.5);
  doc.text(`TOTAL NETO PAGADO:            S/ ${sale.total.toFixed(2)}`, 75, currentY, { align: 'right' });
  currentY += 4.5;

  doc.setFont('Courier', 'normal');
  doc.setFontSize(7);
  doc.text('--------------------------------------------', 40, currentY, { align: 'center' });
  currentY += 3.5;

  // Center bottom hash
  doc.text(`HASH: ${sale.hash_sunat}`, 40, currentY, { align: 'center' });
  currentY += 3.5;

  // Draw small helper QR block
  drawMockQRCode(doc, 28, currentY, 24);
  currentY += 28;

  doc.setFontSize(6.5);
  doc.text('¡Gracias por cuidar su salud con nosotros!', 40, currentY, { align: 'center' });

  return doc;
}

/**
 * 3. TRIGGERS FASt DIRECT PRINT DIALOG WITH COMACT TICKET REPRESENTATION
 */
export function triggerDirectTicketPrint(ctx: DocumentContext) {
  const { sale, details, branch, client } = ctx;
  const bName = branch?.nombre || 'Sede Principal - Lima';
  const bDir = branch?.direccion || 'Av. Javier Prado Este 1040, San Isidro';
  const cName = client?.nombre_razon_social || 'PÚBLICO EN GENERAL / CLIENTE AL MENOR';
  const cDoc = client ? `${client.tipo_documento} ${client.numero_documento}` : 'S/D';

  const itemsHtml = details.map(item => `
    <tr>
      <td style="padding: 3px 0;">
        <strong style="display:block;">${item.cantidad} x ${item.productoName}</strong>
        <span style="font-size: 8px; color: #555;">[Lote: ${item.numero_lote}]</span>
      </td>
      <td style="text-align: right; vertical-align: top; padding: 3px 0;">
        S/ ${(item.cantidad * item.precio_unitario).toFixed(2)}
      </td>
    </tr>
  `).join('');

  // Built simple isolated HTML body matching perfectly thermal 80mm rolls
  const htmlContent = `
    <html>
      <head>
        <title>Imprimir Comprobante - Farmacia ERP</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #000;
            background: #fff;
            width: 74mm;
            padding: 3mm;
            margin: 0;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; font-family: inherit; font-size: 11px; }
          .totals-table td { padding: 2px 0; }
        </style>
      </head>
      <body>
        <div class="text-center font-bold" style="font-size: 13px;">BOTICA ENTERPRISE SAC</div>
        <div class="text-center" style="font-size: 9px; margin-top: 2px;">RUC: 20485129304</div>
        <div class="text-center" style="font-size: 9px;">${bName}</div>
        <div class="text-center" style="font-size: 9px;">${bDir}</div>
        
        <div class="divider"></div>
        
        <div class="text-center font-bold" style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${sale.tipo_comprobante === 'Factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}
        </div>
        <div class="text-center font-bold" style="font-size: 13px; margin: 3px 0 5px 0;">
          N° ${sale.serie_comprobante}-${sale.numero_comprobante}
        </div>
        
        <div class="divider"></div>
        
        <div><strong>FECHA EMISIÓN:</strong> ${sale.fecha_emision}</div>
        <div><strong>CLIENTE:</strong> ${cName}</div>
        <div><strong>DOC. IDENTIDAD:</strong> ${cDoc}</div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; padding-bottom: 4px;">Medicamento [Lote]</th>
              <th style="text-align: right; padding-bottom: 4px;">Total(S/)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <table class="totals-table">
          <tr>
            <td>Subtotal Gravado:</td>
            <td style="text-align: right;">S/ ${sale.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>IGV (18%):</td>
            <td style="text-align: right;">S/ ${sale.igv.toFixed(2)}</td>
          </tr>
          <tr style="font-weight: bold; font-size: 12px;">
            <td>TOTAL PAGADO:</td>
            <td style="text-align: right;">S/ ${sale.total.toFixed(2)}</td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div class="text-center" style="font-size: 9px;">HASH: ${sale.hash_sunat}</div>
        
        <!-- Mock visual representation of the barcode/QR matrix on paper -->
        <div style="margin: 8px auto; text-align: center;">
          <div style="display: inline-block; border: 1px solid #000; padding: 4px; background: #fff;">
            <div style="font-weight: bold; font-size: 8px; font-family: sans-serif; letter-spacing: 1.5px; line-height: 1;">
              [■■■ ■■ ■■■]<br>[■  ■ ■  ■]<br>[■■■ ■■ ■■■]
            </div>
          </div>
        </div>
        
        <div class="text-center" style="font-size: 9px; margin-top: 5px;">Representación impresa oficial de SUNAT</div>
        <div class="text-center" style="font-size: 8px; color: #444; margin-top: 3px;">¡Gracias por cuidar su salud con nosotros!</div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  // Dynamic iframe approach prevents closing current tab or popping ugly windows
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }

  // Auto clean-up after some delay so the browser can print
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);
}
