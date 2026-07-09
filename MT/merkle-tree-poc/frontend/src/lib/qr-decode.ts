/**
 * frontend/src/lib/qr-decode.ts
 * -----------------------------------------------------------------------------
 * Decode a QR code from an uploaded image file (no camera involved).
 *
 * We draw the image to an off-screen canvas, pull its raw RGBA pixels, and hand
 * them to jsQR. Returns the decoded text (for us: the verification bundle JSON),
 * which the caller then verifies OFFLINE in the browser.
 * -----------------------------------------------------------------------------
 */
import jsQR from "jsqr";

/** Decode the first QR code found in an image file. Throws if none is found. */
export async function decodeQrFromFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG or JPG).");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not read the image (canvas unavailable).");

    ctx.drawImage(bitmap, 0, 0);
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    // "attemptBoth" also tries inverted colours (dark-mode / inverted QRs).
    const result = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
    if (!result?.data) {
      throw new Error(
        "No QR code found in that image. Try a clearer or larger picture."
      );
    }
    return result.data;
  } finally {
    bitmap.close?.();
  }
}
