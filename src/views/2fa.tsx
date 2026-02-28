import { copy } from "../lib/copy";
import type { AuthError } from "../lib/auth-error";
import { Layout } from "./layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts, FormAlert } from "./ui";

export type TwoFactorState = {
  errors?: AuthError[];
  verificationType?: "totp" | "email";
  resentEmail?: boolean;
};

type TwoFactorProps = {
  state?: TwoFactorState;
};

export function TwoFactorPage({ state }: TwoFactorProps) {
  const verificationType = state?.verificationType || "totp";

  return (
    <Layout title={copy.routes["2fa"].title}>
      <Card>
        <div class="max-w-full flex flex-col gap-4 m-0">
          <ErrorAlerts errors={state?.errors} />

          {state?.resentEmail && (
            <FormAlert color="success" message={copy.twofa_resent_email} />
          )}

          {verificationType === "email" && <EmailVerificationForm />}
          {verificationType === "totp" && <TotpVerificationForm />}

          <VerificationTypeSwitcher currentType={verificationType} />
        </div>
      </Card>
    </Layout>
  );
}

function EmailVerificationForm() {
  return (
    <>
      <form method="post" action="/auth/2fa" class="flex flex-col gap-y-4">
        <input type="hidden" name="action" value="verify-email" />
        <Input
          autofocus
          name="code"
          minlength={6}
          maxlength={6}
          required
          placeholder={copy.input_code}
          autocomplete="one-time-code"
        />
        <Button type="submit">{copy.button_continue}</Button>
      </form>

      <FormFooter>
        <form method="post" action="/auth/2fa">
          <input type="hidden" name="action" value="resend-email" />
          <button type="submit" class="underline underline-offset-2 font-semibold bg-transparent border-0 cursor-pointer text-fg p-0 text-xs">
            {copy.code_resend}
          </button>
        </form>
        <TextLink href="/auth/login">
          {copy.code_return} {copy.login.toLowerCase()}
        </TextLink>
      </FormFooter>
    </>
  );
}

function TotpVerificationForm() {
  return (
    <>
      <form method="post" action="/auth/2fa" class="flex flex-col gap-y-4">
        <input type="hidden" name="action" value="verify-totp" />
        <Input
          autofocus
          name="code"
          minlength={6}
          maxlength={6}
          required
          placeholder={copy.input_code}
          autocomplete="one-time-code"
        />
        <Button type="submit">{copy.button_continue}</Button>
      </form>

      <FormFooter>
        <TextLink href="/auth/login">
          {copy.code_return} {copy.login.toLowerCase()}
        </TextLink>
      </FormFooter>
    </>
  );
}

function VerificationTypeSwitcher({ currentType }: { currentType: "totp" | "email" }) {
  return (
    <div class="mt-4">
      {currentType === "email" && (
        <form method="post" action="/auth/2fa">
          <input type="hidden" name="action" value="switch-totp" />
          <button type="submit" class="underline underline-offset-2 font-semibold bg-transparent border-0 cursor-pointer text-fg p-0 text-sm">
            {copy.twofa_switch_totp}
          </button>
        </form>
      )}
      {currentType === "totp" && (
        <form method="post" action="/auth/2fa">
          <input type="hidden" name="action" value="switch-email" />
          <button type="submit" class="underline underline-offset-2 font-semibold bg-transparent border-0 cursor-pointer text-fg p-0 text-sm">
            {copy.twofa_switch_email}
          </button>
        </form>
      )}
    </div>
  );
}
