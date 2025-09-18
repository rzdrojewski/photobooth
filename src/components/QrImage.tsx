"use client";

import Image from "next/image";
import * as QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QrImage({
  value,
  size = 240,
}: {
  value: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function gen() {
      try {
        const url = new URL(
          value,
          typeof window !== "undefined" ? window.location.origin : undefined,
        ).toString();
        const data = await QRCode.toDataURL(url, {
          width: size,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setSrc(data);
      } catch {
        if (!cancelled) setSrc(null);
      }
    }
    gen();
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) return null;
  return <Image src={src} width={size} height={size} alt="QR code" />;
}
