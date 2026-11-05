import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  source: string | null;
  onCancel: () => void;
  onSave: (data: string) => void;
  idioma: "es" | "en";
};

export function AvatarCropDialog({ source, onCancel, onSave, idioma }: Props) {
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(0);
  const [vertical, setVertical] = useState(0);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const previewSize = 240;
  const previewScale = image ? Math.max(previewSize / image.naturalWidth, previewSize / image.naturalHeight) * zoom : 1;
  const previewWidth = image ? image.naturalWidth * previewScale : previewSize;
  const previewHeight = image ? image.naturalHeight * previewScale : previewSize;
  const previewOverflowX = previewWidth - previewSize;
  const previewOverflowY = previewHeight - previewSize;

  useEffect(() => {
    setImage(null);
    setZoom(1);
    setHorizontal(0);
    setVertical(0);
  }, [source]);

  const save = () => {
    if (!image) return;
    const size = 512;
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const overflowX = width - size;
    const overflowY = height - size;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, (size - width) / 2 - horizontal * overflowX / 2, (size - height) / 2 - vertical * overflowY / 2, width, height);
    onSave(canvas.toDataURL("image/webp", 0.82));
  };

  return (
    <Dialog open={source !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{idioma === "es" ? "Recortar retrato" : "Crop portrait"}</DialogTitle>
          <DialogDescription>{idioma === "es" ? "Ajusta el encuadre cuadrado antes de guardar." : "Adjust the square crop before saving."}</DialogDescription>
        </DialogHeader>
        {source && <>
          <div className="relative mx-auto h-60 w-60 overflow-hidden rounded-full border-4 border-[var(--marco)] bg-neutral-100">
            <img
              src={source}
              alt=""
              onLoad={(event) => setImage(event.currentTarget)}
              className="absolute max-w-none"
              style={{
                width: previewWidth,
                height: previewHeight,
                left: `calc(50% - ${previewWidth / 2}px - ${horizontal * previewOverflowX / 2}px)`,
                top: `calc(50% - ${previewHeight / 2}px - ${vertical * previewOverflowY / 2}px)`,
              }}
            />
          </div>
          <label className="flex flex-col gap-1 text-sm">
            {idioma === "es" ? "Zoom" : "Zoom"}
            <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {idioma === "es" ? "Horizontal" : "Horizontal"}
            <input type="range" min="-1" max="1" step="0.01" value={horizontal} onChange={(event) => setHorizontal(Number(event.target.value))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {idioma === "es" ? "Vertical" : "Vertical"}
            <input type="range" min="-1" max="1" step="0.01" value={vertical} onChange={(event) => setVertical(Number(event.target.value))} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-sm border px-3 py-2" onClick={onCancel}>{idioma === "es" ? "Cancelar" : "Cancel"}</button>
            <button type="button" className="rounded-sm bg-[var(--principal)] px-3 py-2 font-bold text-white disabled:opacity-50" disabled={!image} onClick={save}>{idioma === "es" ? "Guardar recorte" : "Save crop"}</button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  );
}
