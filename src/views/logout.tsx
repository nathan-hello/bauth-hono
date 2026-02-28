import { copy } from "@/lib/copy";
import type { AuthError } from "@/lib/auth-error";
import { Layout } from "./layout";
import { Card, Button, FormFooter, TextLink, ErrorAlerts } from "./ui";
import { routes } from "@/routes/routes";

type LogoutProps = {
  errors?: AuthError[];
};

export function LogoutPage({ errors }: LogoutProps) {
  return (
    <Layout title={copy.routes.logout.title}>
      <Card>
        <form
          class="max-w-full flex flex-col gap-4 m-0"
          method="post"
          action={routes.auth.logout}
        >
          <ErrorAlerts errors={errors} />
          <Button type="submit">{copy.button_continue}</Button>
          <FormFooter>
            <span>
              {copy.code_return}{" "}
              <TextLink href="/auth/login">{copy.login.toLowerCase()}</TextLink>
            </span>
          </FormFooter>
        </form>
      </Card>
    </Layout>
  );
}
