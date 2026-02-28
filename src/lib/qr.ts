import QR from "qrcode";

export async function generateQrSvg(data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    QR.toString(
      data,
      {
        type: "svg",
        color: { dark: "#111", light: "#eee" },
        width: 200,
        errorCorrectionLevel: "M",
      },
      (error, svg) => {
        if (error) reject(error);
        else resolve(svg);
      },
    );
  });
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
