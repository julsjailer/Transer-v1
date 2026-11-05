import { jsPDF } from "jspdf";
import QRCode from "qrcode";

import { CARTAS, CLASES, claveDeCarta, type Idioma } from "@/lib/cartas";

function loadCardImage(path: string) {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(
        1,
        512 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(null);
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => resolve(null);
    image.src = new URL(
      `/cartas/${encodeURIComponent(path)}`,
      window.location.origin,
    ).href;
  });
}

export async function printBcardCatalog(idioma: Idioma) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const cardHeight = 66;
  const pageCapacity = 4;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Transer · B.Card Cardex", 10, 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(
    `${CARTAS.length} ${idioma === "es" ? "cartas" : "cards"}`,
    pageWidth - 10,
    13,
    { align: "right" },
  );

  for (const [index, card] of CARTAS.entries()) {
    if (index > 0 && index % pageCapacity === 0) pdf.addPage();

    const slot = index % pageCapacity;
    const top = 19 + slot * 69;
    const key = claveDeCarta(card);
    const [qr, image] = await Promise.all([
      QRCode.toDataURL(key, { margin: 1, width: 256 }),
      card.archivo ? loadCardImage(card.archivo) : Promise.resolve(null),
    ]);

    pdf.setDrawColor(125, 125, 125);
    pdf.roundedRect(10, top, pageWidth - 20, cardHeight, 2, 2);
    if (image)
      pdf.addImage(image, "JPEG", 14, top + 6, 42, 42, undefined, "FAST");
    pdf.addImage(
      qr,
      "PNG",
      pageWidth - 43,
      top + 18,
      27,
      27,
      undefined,
      "FAST",
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(card.nombre, 62, top + 13, { maxWidth: pageWidth - 112 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(
      `${CLASES[card.clase][idioma]} · ${card.serie ?? ""}`,
      62,
      top + 22,
    );
    pdf.text(`ID: ${card.id ?? key}`, 62, top + 30);
    pdf.setFont("courier", "normal");
    pdf.setFontSize(7);
    pdf.text(key, 62, top + 38, { maxWidth: pageWidth - 112 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const descriptionLines = pdf
      .splitTextToSize(card.efecto[idioma].replace(/\s+/g, " "), pageWidth - 28)
      .slice(0, 2);
    pdf.text(descriptionLines, 14, top + 54);
  }

  pdf.save("transer-bcard-catalogo.pdf");
}
