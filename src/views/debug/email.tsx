import { EmailChangeVerification } from "@/views/email/change-email";
import { Email2fa, EmailOtp } from "@/views/email/two-factor";
import { EmailVerification } from "@/views/email/verification";

export function DebugEmailPage() {
  return (
    <div className="flex flex-col gap-y-8">
      <Email2fa
        email="user@example.com"
        otp="123456"
        url="http://localhost:3005"
      />
      <EmailOtp
        email="user@example.com"
        otp="123456"
        url="http://localhost:3005"
      />
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
