import type { Child } from "hono/jsx";
import { copy } from "@/lib/copy";

export function EmailLayout({ url, children }: { url: string; children: Child }) {
  return (
    <html>
      <body style={{ fontFamily: "sans-serif", backgroundColor: "#ffffff", margin: 0, padding: 0 }}>
        <br />
        <table width="100%" cellpadding={0} cellspacing={0}>
          <tr>
            <td align="center">
              <table width={480} cellpadding={0} cellspacing={0} style={{ maxWidth: "480px", margin: "0 auto", padding: "20px 0" }}>
                <tr>
                  <td align="center">
                    <a href={url} style={{ color: "inherit", textDecoration: "none" }}>
                      <table cellpadding={0} cellspacing={0} style={{ margin: "0 auto" }}>
                        <tr>
                          <td style={{ verticalAlign: "middle" }}>
                            <img src={`${url}/favicon.png`} width={32} height={32} alt="" />
                          </td>
                          <td style={{ verticalAlign: "middle", paddingLeft: "8px" }}>
                            <span style={{ fontSize: "18px", fontWeight: 600 }}>{url}</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <br />
                    <hr style={{ border: "none", borderTop: "1px solid #e5e5e5" }} />
                    <br />
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: "16px 0" }}>
                    {children}
                  </td>
                </tr>
                <tr>
                  <td>
                    <br />
                    <hr style={{ border: "none", borderTop: "1px solid #e5e5e5" }} />
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style={{ color: "#666", fontSize: "13px", textAlign: "center", lineHeight: 1.5 }}>
                      {copy.email_footer_prefix}{" "}
                      <a href={`${url}/auth/forgot`} style={{ color: "#2563eb" }}>{copy.email_footer_reset}</a>
                      {" "}{copy.email_footer_middle}{" "}
                      <a href={`${url}/auth/dashboard`} style={{ color: "#2563eb" }}>{copy.email_footer_dashboard}</a>
                      {" "}{copy.email_footer_suffix}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
