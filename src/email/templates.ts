import { copy } from "@/lib/copy";

function layout(url: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background-color:#ffffff;margin:0;padding:0">
  <br/>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;padding:20px 0">
    <tr><td align="center">
      <a href="${url}" style="color:inherit;text-decoration:none">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
          <td style="vertical-align:middle"><img src="${url}/favicon.png" width="32" height="32" alt=""/></td>
          <td style="vertical-align:middle;padding-left:8px"><span style="font-size:18px;font-weight:600">${url}</span></td>
        </tr></table>
      </a>
    </td></tr>
    <tr><td><br/><hr style="border:none;border-top:1px solid #e5e5e5"/><br/></td></tr>
    <tr><td align="center" style="padding:16px 0">${content}</td></tr>
    <tr><td><br/><hr style="border:none;border-top:1px solid #e5e5e5"/></td></tr>
    <tr><td>
      <p style="color:#666;font-size:13px;text-align:center;line-height:1.5">
        ${copy.email_footer_prefix}
        <a href="${url}/auth/forgot" style="color:#2563eb">${copy.email_footer_reset}</a>
        ${copy.email_footer_middle}
        <a href="${url}/auth/dashboard" style="color:#2563eb">${copy.email_footer_dashboard}</a>
        ${copy.email_footer_suffix}
      </p>
    </td></tr>
  </table>
  </td></tr></table>
</body>
</html>`;
}

export function emailOtp(email: string, otp: string, url: string): string {
  return layout(
    url,
    `<p style="font-size:15px;margin:0">${copy.email_otp_body} <strong>${email}</strong>:</p>
     <p style="font-size:32px;font-weight:bold;letter-spacing:0.15em;margin:16px 0">${otp}</p>
     <p style="font-size:14px;color:#666;margin:0">${copy.email_otp_expiry}</p>`,
  );
}

export function email2fa(email: string, otp: string, url: string): string {
  return layout(
    url,
    `<p style="font-size:15px;margin:0">${copy.email_2fa_body} <strong>${email}</strong>:</p>
     <p style="font-size:32px;font-weight:bold;letter-spacing:0.15em;margin:16px 0">${otp}</p>
     <p style="font-size:14px;color:#666;margin:0">${copy.email_2fa_expiry}</p>`,
  );
}

export function emailVerification(email: string, verificationLink: string, url: string): string {
  const fullLink = url + verificationLink;
  return layout(
    url,
    `<p style="font-size:15px;margin:0 0 16px">${copy.email_verify_body} <strong>${email}</strong>:</p>
     <a href="${fullLink}" style="color:#2563eb;font-size:14px">${fullLink}</a>`,
  );
}
