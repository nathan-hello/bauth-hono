import { dotenv } from "@/server/env";
import {
    EmailChangeVerification,
    EmailVerification,
    EmailOtp,
    Email2fa,
    EmailResetPasswordOTP,
    EmailResetPasswordLink,
} from "@/views/email/emails";

export function DebugEmailPage() {
    const link = dotenv.PRODUCTION_URL + "/verify-email?asdf=bouiegrbouiegrbouiqbouiq4bouiqt4bouiqt4qt4boui";
    return (
        <div className="flex flex-col gap-y-8">
            <Email2fa email="user@example.com" otp="123456" url={dotenv.PRODUCTION_URL} />
            <EmailOtp email="user@example.com" otp="123456" url={dotenv.PRODUCTION_URL} />
            <EmailVerification email="user@example.com" verificationLink={link} url={dotenv.PRODUCTION_URL} />
            <EmailChangeVerification
                oldEmail="user@example.com"
                newEmail="new@example.com"
                verificationLink={link}
                url={dotenv.PRODUCTION_URL}
            />
            <EmailResetPasswordOTP email="user@example.com" otp="123456" url={dotenv.PRODUCTION_URL} />
            <EmailResetPasswordLink email="user@example.com" verificationLink={link} url={dotenv.PRODUCTION_URL} />
        </div>
    );
}

export function RegisterEmailDevInfo() {
    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    const emails = ["delivered+user1@resend.dev", "delivered+user2@resend.dev", "delivered+user3@resend.dev"];

    return (
        <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
            <div className="flex flex-col">
                <span>Use one of the following addresses:</span>
                {emails.map((e) => {
                    return (
                        <div key={e} className="flex flex-row justify-between w-full">
                            <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
                                {e}
                            </pre>
                        </div>
                    );
                })}
                <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
                    https://resend.com/docs/dashboard/emails/send-test-emails
                </pre>
            </div>
        </pre>
    );
}
