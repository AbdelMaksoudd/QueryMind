/** Download the rendered invoice element as a PDF (libraries loaded on demand). */
export async function downloadInvoicePdf(element, filename) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const ratio = canvas.height / canvas.width;
  let imageHeight = usableWidth * ratio;

  let y = margin;
  if (imageHeight <= pageHeight - margin * 2) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, usableWidth, imageHeight);
  } else {
    // Split a long invoice across pages.
    const pageImageHeight = pageHeight - margin * 2;
    const sourcePageHeight = Math.floor(canvas.width * (pageImageHeight / usableWidth));
    let sourceY = 0;
    while (sourceY < canvas.height) {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.min(sourcePageHeight, canvas.height - sourceY);
      slice.getContext('2d').drawImage(
        canvas, 0, sourceY, canvas.width, slice.height, 0, 0, canvas.width, slice.height,
      );
      if (sourceY > 0) pdf.addPage();
      pdf.addImage(
        slice.toDataURL('image/png'), 'PNG', margin, margin,
        usableWidth, (slice.height / canvas.width) * usableWidth,
      );
      sourceY += slice.height;
    }
  }

  pdf.save(filename);
}
