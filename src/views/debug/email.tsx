import { EmailChangeVerification, EmailVerification, EmailOtp, Email2fa } from "@/views/email/emails";

export function DebugEmailPage() {
    return (
        <div className="flex flex-col gap-y-8">
            <Email2fa email="user@example.com" otp="123456" url="http://localhost:3005" />
            <EmailOtp email="user@example.com" otp="123456" url="http://localhost:3005" />
            <EmailVerification
                email="user@example.com"
                verificationLink="/verify-email?asdf=bouiegrbouiegrbouiqbouiq4bouiqt4bouiqt4qt4boui"
                url="http://localhost:3005"
            />
            <EmailChangeVerification
                oldEmail="user@example.com"
                newEmail="new@example.com"
                verificationLink="/verify-email?asdf=bouiegrbouiegrbouiqbouiq4bouiqt4bouiqt4qt4boui"
                url="http://localhost:3005"
            />
        </div>
    );
}
