"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function TicketQr({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, { width: 200, margin: 1 });
    }
  }, [value]);

  return <canvas ref={canvasRef} />;
}
