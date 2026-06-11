"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export interface LabelTarget {
  sku: string;
  styleName?: string;
  color?: string;
  size?: string;
}

/**
 * Printable Code128 label for a variant SKU. The mobile app's scan screen
 * reads these to jump straight to the variant. Print uses a popup window so
 * the label prints alone (not the whole page).
 */
export function BarcodeLabelModal({
  target,
  onClose,
}: {
  target: LabelTarget;
  onClose: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, target.sku, {
      format: "CODE128",
      displayValue: true,
      fontSize: 14,
      height: 64,
      margin: 8,
      background: "#ffffff",
      lineColor: "#000000",
    });
  }, [target.sku]);

  function print() {
    const svg = svgRef.current?.outerHTML;
    if (!svg) return;
    const w = window.open("", "_blank", "width=480,height=360");
    if (!w) return;
    const subtitle = [target.styleName, target.color, target.size].filter(Boolean).join(" · ");
    w.document.write(`<!doctype html><html><head><title>${target.sku}</title>
      <style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px;padding:16px}p{margin:0;font-size:12px;color:#444}</style>
      </head><body>${svg}<p>${subtitle}</p>
      <script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    w.document.close();
  }

  return (
    <Modal open onClose={onClose} title={`Label — ${target.sku}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-stone-200">
          <svg ref={svgRef} role="img" aria-label={`Barcode for ${target.sku}`} />
        </div>
        {target.styleName ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {[target.styleName, target.color, target.size].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={print}>Print label</Button>
        </div>
      </div>
    </Modal>
  );
}
