import { copy } from "@/lib/copy";
import type { AuthError } from "@/lib/auth-error";
import { Layout } from "@/views/layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts } from "@/views/ui";
import { routes } from "@/routes/routes";

type RegisterProps = {
  errors?: AuthError[];
  email?: string;
};

export function RegisterPage({ errors, email }: RegisterProps) {
  return (
    <Layout title={copy.routes.register.title}>
      <Card>
        <div class="max-w-full flex flex-col gap-4 m-0">
          <ErrorAlerts errors={errors} />
          <form method="post" action={routes.auth.register} class="flex flex-col gap-y-4">
            <input type="hidden" name="action" value="register" />
            <Input type="text" name="username" required placeholder={copy.input_username} />
            <Input
              type="text"
              name="email"
              value={email ?? ""}
              required
              placeholder={copy.input_email}
            />
            <Input
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
            <Button type="submit">{copy.button_continue}</Button>
            <FormFooter>
              <span>
                {copy.login_prompt}{" "}
                <TextLink href="/auth/login">{copy.login}</TextLink>
              </span>
            </FormFooter>
          </form>
        </div>
      </Card>
    </Layout>
  );
}
