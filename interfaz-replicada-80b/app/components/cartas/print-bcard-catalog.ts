import QRCode from "qrcode";
import { CARTAS, CLASES, claveDeCarta, type Idioma } from "@/lib/cartas";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export async function printBcardCatalog(idioma: Idioma) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const records: string[] = [];
  for (const card of CARTAS) {
    const key = claveDeCarta(card);
    const qr = await QRCode.toDataURL(key, { margin: 1, width: 128 });
    const image = card.archivo ? new URL(`/cartas/${encodeURIComponent(card.archivo)}`, window.location.origin).href : "";
    records.push(`<article><img class="art" src="${image}" alt=""><div><h2>${escapeHtml(card.nombre)}</h2><p>${escapeHtml(CLASES[card.clase][idioma])} · ${escapeHtml(card.serie ?? "")}</p><p>ID: ${escapeHtml(card.id ?? key)}</p><p class="key">${escapeHtml(key)}</p></div><img class="qr" src="${qr}" alt="QR ${escapeHtml(key)}"></article>`);
  }
  printWindow.document.write(`<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><title>Transer · Cardex</title><style>body{font-family:Arial,sans-serif;margin:18px;color:#111}h1{font-size:22px}article{display:grid;grid-template-columns:100px 1fr 80px;gap:12px;align-items:center;break-inside:avoid;border:1px solid #aaa;padding:8px;margin:8px 0}.art{width:100px;aspect-ratio:4/3;object-fit:contain}.qr{width:80px}.key{font:10px monospace;overflow-wrap:anywhere}h2{font-size:14px;margin:0}p{font-size:11px;margin:3px 0}@media print{body{margin:10mm}}</style></head><body><h1>Transer · B.Card Cardex</h1>${records.join("")}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 500);
}
