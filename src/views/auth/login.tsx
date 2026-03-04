import { copy } from "@/lib/copy";
import type { AppError } from "@/lib/auth-error";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts, Form } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { OauthButtons } from "@/views/components/oauth";

type LoginProps = {
    errors?: AppError[];
    email?: string;
};

export function LoginPage({ errors, email }: LoginProps) {
    return (
        <Layout title={copy.routes.login.title}>
            <Card>
                <Form method="post" action={routes.auth.login}>
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
                        <TextLink href="/auth/register">{copy.register_prompt}</TextLink>
                        <TextLink href="/auth/forgot">{copy.change_prompt}</TextLink>
                    </FormFooter>
                </Form>
                <OauthButtons formAction={routes.auth.login} />
            </Card>
        </Layout>
    );
}
