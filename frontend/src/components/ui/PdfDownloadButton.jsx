import { useState } from "react";
import { TbDownload } from "react-icons/tb";
import { downloadElementAsPdf } from "../../lib/pdfExport";

export function PdfDownloadButton({ targetRef, filename, label = "Download as PDF", className = "pdf-download-button" }) {
  const [generating, setGenerating] = useState(false);

  async function handleClick() {
    if (!targetRef.current || generating) return;
    setGenerating(true);
    try {
      await downloadElementAsPdf(targetRef.current, filename);
    } catch (error) {
      console.error(error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      type="button"
      data-pdf-ignore="true"
      className={className}
      onClick={handleClick}
      disabled={generating}
    >
      <TbDownload size={14} strokeWidth={2} />
      {generating ? "Generating PDF..." : label}
    </button>
  );
}