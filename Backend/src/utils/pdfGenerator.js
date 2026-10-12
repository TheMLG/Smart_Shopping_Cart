import PDFDocument from 'pdfkit';

export const generateBillPDF = (order, stream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: 'A4' });

      doc.pipe(stream);

      // ── Palette ────────────────────────────────────────────
      const PRIMARY      = '#1D4ED8';
      const PRIMARY_SOFT = '#DBEAFE';
      const PRIMARY_MID  = '#93C5FD';
      const DARK         = '#111827';
      const MEDIUM       = '#4B5563';
      const LIGHT        = '#9CA3AF';
      const WHITE        = '#FFFFFF';
      const ROW_ALT      = '#F9FAFB';
      const BORDER       = '#E5E7EB';

      const ML = 50;                          // margin left
      const MR = doc.page.width - 50;        // margin right
      const PW = MR - ML;                    // printable width

      // ── HEADER BLOCK ───────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 105).fill(PRIMARY);

      // Company name
      doc.fillColor(WHITE).fontSize(26).font('Helvetica-Bold')
         .text('Embedded Elite\'s Store', ML, 28, { lineBreak: false });

      // Company contact
      doc.fillColor(PRIMARY_MID).fontSize(9).font('Helvetica')
         .text('store@embeddedelite.com  |  www.embeddedelite.com', ML, 65, { lineBreak: false });

      // "INVOICE" right side
      doc.fillColor(WHITE).fontSize(22).font('Helvetica-Bold')
         .text('INVOICE', ML, 28, { width: PW, align: 'right', lineBreak: false });

      // Order number + date right side
      doc.fillColor(PRIMARY_MID).fontSize(9).font('Helvetica')
         .text(`# ${order.orderId}`, ML, 60, { width: PW, align: 'right', lineBreak: false });

      // ── META BAR ───────────────────────────────────────────
      doc.rect(0, 105, doc.page.width, 30).fill(PRIMARY_SOFT);

      const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      doc.fillColor(PRIMARY).fontSize(8).font('Helvetica-Bold')
         .text(`DATE: ${dateStr}`, ML, 117, { lineBreak: false });

      const statusLabel = order.paymentInfo.status.toUpperCase();
      doc.fillColor(PRIMARY).fontSize(8).font('Helvetica-Bold')
         .text(`PAYMENT STATUS: ${statusLabel}`, ML, 117, { width: PW, align: 'right', lineBreak: false });

      // ── BILL TO / PAYMENT DETAILS ─────────────────────────
      let y = 155;

      // Section labels
      doc.fillColor(LIGHT).fontSize(8).font('Helvetica-Bold')
         .text('BILL TO', ML, y, { lineBreak: false });
      doc.text('PAYMENT DETAILS', ML + PW / 2, y, { lineBreak: false });

      y += 14;

      // Customer name
      doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold')
         .text(order.customerInfo.name, ML, y, { width: PW / 2 - 10, lineBreak: false });

      // Payment method
      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold')
         .text(order.paymentInfo.method.toUpperCase(), ML + PW / 2, y, {
           width: PW / 2, lineBreak: false,
         });

      y += 18;

      // Customer email + payment method value
      doc.fillColor(MEDIUM).fontSize(10).font('Helvetica')
         .text(order.customerInfo.email, ML, y, { width: PW / 2 - 10, lineBreak: false });

      doc.fillColor(MEDIUM).fontSize(9).font('Helvetica')
         .text(`Status: ${statusLabel}`, ML + PW / 2, y, { width: PW / 2, lineBreak: false });

      y += 15;

      // Customer phone
      doc.fillColor(MEDIUM).fontSize(10).font('Helvetica')
         .text(order.customerInfo.phone, ML, y, { width: PW / 2 - 10, lineBreak: false });

      // Transaction / payment ID
      const txnId = order.paymentInfo.transactionId;
      if (txnId) {
        doc.fillColor(MEDIUM).fontSize(9).font('Helvetica')
           .text(`Txn ID: ${txnId}`, ML + PW / 2, y, { width: PW / 2, lineBreak: false });
        y += 15;
      } else {
        y += 15;
      }

      // ── ITEMS TABLE ────────────────────────────────────────
      y += 22;

      // Table header row
      doc.rect(ML, y, PW, 26).fill(PRIMARY);
      doc.fillColor(WHITE).fontSize(9).font('Helvetica-Bold')
         .text('#',          ML + 8,    y + 8, { lineBreak: false })
         .text('ITEM',       ML + 28,   y + 8, { width: 210, lineBreak: false })
         .text('QTY',        ML + 248,  y + 8, { width: 60,  align: 'center', lineBreak: false })
         .text('UNIT PRICE', ML + 318,  y + 8, { width: 90,  align: 'right',  lineBreak: false })
         .text('AMOUNT',     ML + 418,  y + 8, { width: PW - 418, align: 'right', lineBreak: false });

      y += 26;
      const tableBodyTop = y;

      order.items.forEach((item, idx) => {
        const rowH  = 28;
        const total = item.price * item.quantity;
        doc.rect(ML, y, PW, rowH).fill(idx % 2 === 0 ? ROW_ALT : WHITE);

        doc.fillColor(LIGHT).fontSize(9).font('Helvetica')
           .text((idx + 1).toString(), ML + 8, y + 9, { lineBreak: false });

        doc.fillColor(DARK).fontSize(9).font('Helvetica')
           .text(item.name, ML + 28, y + 9, { width: 210, lineBreak: false });

        doc.fillColor(MEDIUM).fontSize(9).font('Helvetica')
           .text(item.quantity.toString(), ML + 248, y + 9, { width: 60, align: 'center', lineBreak: false })
           .text(`Rs.${item.price.toFixed(2)}`, ML + 318, y + 9, { width: 90, align: 'right', lineBreak: false });

        doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
           .text(`Rs.${total.toFixed(2)}`, ML + 418, y + 9, { width: PW - 418, align: 'right', lineBreak: false });

        y += rowH;
      });

      // Table border
      doc.strokeColor(BORDER).lineWidth(1)
         .rect(ML, tableBodyTop - 26, PW, y - tableBodyTop + 26)
         .stroke();

      // ── TOTALS ─────────────────────────────────────────────
      y += 18;

      const totW  = 220;
      const totL  = MR - totW;
      const lblW  = 120;
      const valW  = totW - lblW;

      // Subtotal row
      doc.fillColor(MEDIUM).fontSize(10).font('Helvetica')
         .text('Subtotal:', totL, y, { width: lblW, lineBreak: false });
      doc.fillColor(DARK).fontSize(10).font('Helvetica')
         .text(`Rs.${order.subtotal.toFixed(2)}`, totL + lblW, y, { width: valW, align: 'right', lineBreak: false });

      y += 18;

      // Tax row
      const taxPct = order.subtotal > 0
        ? ((order.tax / order.subtotal) * 100).toFixed(0)
        : 0;

      doc.fillColor(MEDIUM).fontSize(10).font('Helvetica')
         .text(`Tax (${taxPct}%):`, totL, y, { width: lblW, lineBreak: false });
      doc.fillColor(DARK).fontSize(10).font('Helvetica')
         .text(`Rs.${order.tax.toFixed(2)}`, totL + lblW, y, { width: valW, align: 'right', lineBreak: false });

      y += 14;

      // Divider
      doc.strokeColor(BORDER).lineWidth(1)
         .moveTo(totL, y).lineTo(MR, y).stroke();

      y += 8;

      // Grand total row
      doc.rect(totL - 10, y, totW + 10, 34).fill(PRIMARY);
      doc.fillColor(WHITE).fontSize(13).font('Helvetica-Bold')
         .text('TOTAL', totL, y + 10, { width: lblW, lineBreak: false });
      doc.fillColor(WHITE).fontSize(13).font('Helvetica-Bold')
         .text(`Rs.${order.totalAmount.toFixed(2)}`, totL + lblW, y + 10, {
           width: valW, align: 'right', lineBreak: false,
         });

      y += 34;

      // ── NOTES ──────────────────────────────────────────────
      if (order.notes) {
        y += 22;
        doc.fillColor(LIGHT).fontSize(8).font('Helvetica-Bold')
           .text('NOTES', ML, y);
        y += 12;
        doc.fillColor(MEDIUM).fontSize(9).font('Helvetica')
           .text(order.notes, ML, y, { width: PW });
      }

      // ── FOOTER ─────────────────────────────────────────────
      const footY = doc.page.height - 60;

      doc.strokeColor(BORDER).lineWidth(1)
         .moveTo(ML, footY).lineTo(MR, footY).stroke();

      doc.fillColor(MEDIUM).fontSize(9).font('Helvetica-Bold')
         .text('Thank you for shopping with BuildX Store!', ML, footY + 10, {
           width: PW, align: 'center',
         });

      doc.fillColor(LIGHT).fontSize(8).font('Helvetica')
         .text('This is a computer-generated invoice and does not require a signature.', ML, footY + 26, {
           width: PW, align: 'center',
         });

      // ── FINALISE ───────────────────────────────────────────
      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
};
