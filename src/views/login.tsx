import { copy } from "../lib/copy";
import type { AuthError } from "../lib/auth-error";
import { Layout } from "./layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts } from "./ui";
import { routes } from "@/routes/routes";

type LoginProps = {
  errors?: AuthError[];
  email?: string;
};

export function LoginPage({ errors, email }: LoginProps) {
  return (
    <Layout title={copy.routes.login.title}>
      <Card>
        <form class="max-w-full flex flex-col gap-4" method="post" action={routes.auth.login}>
          <ErrorAlerts errors={errors} />
          <Input
            type="text"
            name="email"
            required
            placeholder={copy.input_email_or_username}
            autofocus={!errors}
            value={email ?? ""}
          />
          <Input
            required
            type="password"
            name="password"
            placeholder={copy.input_password}
            autocomplete="current-password"
          />
          <Button type="submit">{copy.button_continue}</Button>
          <FormFooter>
            <span>
              {copy.register_prompt}{" "}
              <TextLink href="/auth/register">{copy.register}</TextLink>
            </span>
            <TextLink href="/auth/forgot">{copy.change_prompt}</TextLink>
          </FormFooter>
        </form>
      </Card>
    </Layout>
  );
}
