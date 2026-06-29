// Captures a DOM element as a screenshot and saves it as a (possibly
// multi-page) PDF. Used for the "Download as PDF" buttons on the dashboard
// and progress pages — a point-in-time visual snapshot, as opposed to the
// CSV/GPX exports which are raw data.
//
// Any element with `data-pdf-ignore` set is excluded from the capture —
// used so the download button itself doesn't appear inside its own PDF.

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export async function downloadElementAsPdf(element, filename = "summitlog-export.pdf") {
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2, // sharper output than the native screen resolution
    useCORS: true, // allow cross-origin images (e.g. uploaded summit photos) to render
    backgroundColor: "#ffffff",
    ignoreElements: (el) => el.hasAttribute && el.hasAttribute("data-pdf-ignore"),
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Scale the full captured canvas to the PDF's page width, then slice it
  // into page-height bands (in canvas-pixel terms) so a tall page becomes
  // several PDF pages instead of one squashed or cropped image. A card or
  // chart that happens to straddle a page boundary will visually split
  // across two pages — the same trade-off any "print this webpage" tool
  // makes; avoiding it entirely would need much more layout-aware logic
  // than this warrants.
  const pageHeightPx = Math.floor((A4_HEIGHT_MM * canvas.width) / A4_WIDTH_MM);

  let renderedPx = 0;
  let pageIndex = 0;

  while (renderedPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    pageCanvas
      .getContext("2d")
      .drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const sliceImageData = pageCanvas.toDataURL("image/png");
    const sliceHeightMm = (sliceHeightPx * A4_WIDTH_MM) / canvas.width;

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(sliceImageData, "PNG", 0, 0, A4_WIDTH_MM, sliceHeightMm);

    renderedPx += sliceHeightPx;
    pageIndex += 1;
  }

  pdf.save(filename);
}