import { copy } from "@/lib/copy";
import type { AppError } from "@/lib/auth-error";
import { Layout } from "@/views/components/layout";
import {
  Card,
  Input,
  Button,
  FormFooter,
  TextLink,
  ErrorAlerts,
} from "@/views/components/ui";
import { routes } from "@/routes/routes";

type RegisterProps = {
  errors?: AppError[];
  email?: string;
};

export function RegisterPage({ errors, email }: RegisterProps) {
  return (
    <Layout title={copy.routes.register.title}>
      <Card>
        <div class="max-w-full flex flex-col gap-4 m-0">
          <ErrorAlerts errors={errors} />
          <form
            method="post"
            action={routes.auth.register}
            class="flex flex-col gap-y-4"
          >
            <input type="hidden" name="action" value="register" />
            <Input
              type="text"
              name="username"
              required
              placeholder={copy.input_username}
            />
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
      <RegisterEmailDevInfo />
    </Layout>
  );
}

function RegisterEmailDevInfo() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const emails = [
    "delivered+user1@resend.dev",
    "delivered+user2@resend.dev",
    "delivered+user3@resend.dev",
  ];

  return (
    <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
      <div className="flex flex-col">
        <span>Use one of the following addresses:</span>
        {emails.map((e) => {
          return (
            <div key={e} className="flex flex-row justify-between w-full">
              <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
                {e}
              </pre>
            </div>
          );
        })}
        <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
          https://resend.com/docs/dashboard/emails/send-test-emails
        </pre>
      </div>
    </pre>
  );
}
