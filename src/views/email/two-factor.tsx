import { copy } from "@/lib/copy";
import { EmailLayout } from "@/views/email/layout";

export function EmailOtp({ email, otp, url }: { email: string; otp: string; url: string }) {
  return (
    <EmailLayout url={url}>
      <p style={{ fontSize: "15px", margin: 0 }}>{copy.email_otp_body} <strong>{email}</strong>:</p>
      <p style={{ fontSize: "32px", fontWeight: "bold", letterSpacing: "0.15em", margin: "16px 0" }}>{otp}</p>
      <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>{copy.email_otp_expiry}</p>
    </EmailLayout>
  );
}

export function Email2fa({ email, otp, url }: { email: string; otp: string; url: string }) {
  return (
    <EmailLayout url={url}>
      <p style={{ fontSize: "15px", margin: 0 }}>{copy.email_2fa_body} <strong>{email}</strong>:</p>
      <p style={{ fontSize: "32px", fontWeight: "bold", letterSpacing: "0.15em", margin: "16px 0" }}>{otp}</p>
      <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>{copy.email_2fa_expiry}</p>
    </EmailLayout>
  );
}
