import QR from "qrcode";

export function generateQrSvg(data: string): string {
  const qr = QR.create(data, { errorCorrectionLevel: "M" });
  const { size, data: modules } = qr.modules;
  const dark = "#111";
  const light = "#eee";
  const width = 200;
  const cellSize = width / size;

  let rects = `<rect width="${width}" height="${width}" fill="${light}"/>`;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y * size + x]) {
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${dark}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${width}" width="${width}" height="${width}">${rects}</svg>`;
}

export function parseOtpauthUri(uri: string) {
  const u = new URL(uri);

  if (u.protocol !== "otpauth:") {
    throw new Error("Invalid protocol (expected otpauth:)");
  }

  const params: Record<string, string> = {};

  u.searchParams.forEach((v, k) => {
    params[k] = v;
  });
  if (!("secret" in params)) {
    params.secret = "Error: could not parse params from secret.";
  }

  const digits = params.digits ? Number(params.digits) : 6;
  const period = params.period ? Number(params.period) : 30;
  const algorithm = "SHA1";

  return { digits, period, algorithm, secret: params.secret };
}
