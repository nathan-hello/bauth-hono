import { copy } from "@/lib/copy";
import type { AuthError } from "@/lib/auth-error";
import { Layout } from "@/views/layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts } from "@/views/ui";
import { routes } from "@/routes/routes";

export type ForgotStep = "start" | "code" | "update" | "try-again";

type ForgotProps = {
  errors?: AuthError[];
  email?: string;
  code?: string;
  step: ForgotStep;
};

export function ForgotPage({ errors, email, code, step }: ForgotProps) {
  return (
    <Layout title={copy.routes.forgot.title}>
      <Card>
        <form
          class="max-w-full flex flex-col gap-4 m-0"
          method="post"
          action={routes.auth.forgot}
        >
          <ErrorAlerts errors={errors} />

          {step === "start" && (
            <>
              <input type="hidden" name="step" value="start" />
              <p class="text-fg-primary">{copy.forgot_email_prompt}</p>
              <Input
                autofocus
                type="email"
                name="email"
                required
                placeholder={copy.input_email}
              />
            </>
          )}

          {step === "code" && (
            <>
              <input type="hidden" name="step" value="code" />
              <p class="text-fg-primary">{copy.forgot_code_prompt}</p>
              <input type="hidden" name="email" value={email ?? ""} />
              <Input
                autofocus
                name="code"
                minlength={6}
                maxlength={6}
                required
                placeholder={copy.input_code}
                autocomplete="one-time-code"
              />
            </>
          )}

          {step === "try-again" && (
            <input type="hidden" name="step" value="try-again" />
          )}

          {step === "update" && (
            <>
              <input type="hidden" name="step" value="update" />
              <input type="hidden" name="email" value={email ?? ""} />
              <input type="hidden" name="code" value={code ?? ""} />
              <Input
                autofocus
                type="password"
                name="password"
                placeholder={copy.input_password}
                required
                autocomplete="new-password"
              />
              <Input
                type="password"
                name="repeat"
                required
                placeholder={copy.input_repeat}
                autocomplete="new-password"
              />
            </>
          )}

          <Button type="submit">{copy.button_continue}</Button>
          <FormFooter>
            <span>
              {copy.code_return}{" "}
              <TextLink href="/auth/login">{copy.login.toLowerCase()}</TextLink>
            </span>
            {step === "code" && (
              <form
                method="post"
                action={routes.auth.forgot}
                style="display:inline"
              >
                <input type="hidden" name="step" value="start" />
                <input type="hidden" name="email" value={email ?? ""} />
                <input type="hidden" name="resend" value="true" />
                <button
                  type="submit"
                  class="underline underline-offset-2 font-semibold bg-transparent border-0 cursor-pointer text-fg p-0 text-xs"
                >
                  {copy.code_resend}
                </button>
              </form>
            )}
          </FormFooter>
        </form>
      </Card>
    </Layout>
  );
}
