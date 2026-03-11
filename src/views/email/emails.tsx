import { defaultCopy as copy } from "@/lib/copy";
import { EmailLayout } from "@/views/email/layout";

export function EmailOtp({ email, otp, url }: { email: string; otp: string; url: string }) {
    return (
        <EmailLayout url={url}>
            <p style={{ fontSize: "1rem", margin: 0 }}>
                {copy.email_otp_body} <strong>{email}</strong>:
            </p>
            <p style={{ fontSize: "2rem", fontWeight: "bold", letterSpacing: "0.15em", margin: "16px 0" }}>{otp}</p>
            <p style={{ fontSize: "1rem", color: "#666", margin: 0 }}>{copy.email_otp_expiry}</p>
        </EmailLayout>
    );
}

export function Email2fa({ email, otp, url }: { email: string; otp: string; url: string }) {
    return (
        <EmailLayout url={url}>
            <p style={{ fontSize: "1rem", margin: 0 }}>
                {copy.email_2fa_body} <strong>{email}</strong>:
            </p>
            <p style={{ fontSize: "2rem", fontWeight: "bold", letterSpacing: "0.15em", margin: "16px 0" }}>{otp}</p>
            <p style={{ fontSize: "1rem", color: "#666", margin: 0 }}>{copy.email_2fa_expiry}</p>
        </EmailLayout>
    );
}
export function EmailVerification({
    email,
    verificationLink,
    url,
}: {
    email: string;
    verificationLink: string;
    url: string;
}) {
    const fullLink = verificationLink;
    return (
        <EmailLayout url={url}>
            <p style={{ fontSize: "15px", margin: "0 0 16px" }}>
                {copy.email_verify_body} <strong>{email}</strong>:
            </p>
            <a href={fullLink} style={{ color: "#2563eb", fontSize: "14px" }}>
                {fullLink}
            </a>
        </EmailLayout>
    );
}

export function EmailChangeVerification({
    oldEmail,
    newEmail,
    verificationLink,
    url,
}: {
    oldEmail: string;
    newEmail: string;
    verificationLink: string;
    url: string;
}) {
    const fullLink = verificationLink;
    return (
        <EmailLayout url={url}>
            <p style={{ fontSize: "15px", margin: "0 0 16px" }}>{copy.email_change_body}</p>
            <p>
                {copy.email_change_from} <strong>{oldEmail}</strong> {copy.email_change_to} <strong>{newEmail}</strong>
            </p>

            <a href={fullLink} style={{ color: "#2563eb", fontSize: "14px" }}>
                {fullLink}
            </a>
        </EmailLayout>
    );
}
