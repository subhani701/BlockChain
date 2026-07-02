import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/** Renders a QR code (PNG data URL) for an arbitrary string value. */
export function QrCode({
  value,
  size = 208,
  className
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size, errorCorrectionLevel: "M" })
      .then((u) => alive && setUrl(u))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (error) {
    return (
      <div className="text-xs text-destructive">QR too large to encode ({error})</div>
    );
  }
  if (!url) return null;
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt="Product verification QR"
      className={cn("rounded-md border bg-white p-2", className)}
    />
  );
}
