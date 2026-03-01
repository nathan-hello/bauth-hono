import { copy } from "@/lib/copy";
import { EmailLayout } from "@/views/email/layout";

import {jsx} from "hono/jsx"

export function EmailVerification({ email, verificationLink, url }: { email: string; verificationLink: string; url: string }) {
  const fullLink = url + verificationLink;
  return (
    <EmailLayout url={url}>
      <p style={{ fontSize: "15px", margin: "0 0 16px" }}>{copy.email_verify_body} <strong>{email}</strong>:</p>
      <a href={fullLink} style={{ color: "#2563eb", fontSize: "14px" }}>{fullLink}</a>
    </EmailLayout>
  );
}
