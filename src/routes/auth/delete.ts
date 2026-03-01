import { redirects } from "@/routes/routes";
import { auth } from "@/server/auth";
import { DeleteAccountPage } from "@/views/auth/delete";
import { Context } from "hono";

export async function get(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return redirects.ToLogin;
  }
  return c.html(
    DeleteAccountPage({
      state: session.user.twoFactorEnabled
        ? { verificationType: "totp" }
        : undefined,
    }),
  );
}

export async function post(c: Context) {
  return new Response();
}

async function DeleteAccount(request: Request) {
  const result = await auth.api.deleteUser({
    headers: request.headers,
    body: {},
  });
}

const actions = {
  delete_account: DeleteAccount,
};

export const actionName: { [K in keyof typeof actions]: K } = {
  delete_account: "delete_account",
};
