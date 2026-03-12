import { LoginProps, actions } from "@/routes/auth/login";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, Form } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { OauthButtons } from "@/views/components/oauth";

export function LoginPage({ state, result, copy }: LoginProps) {
    return (
        <Layout meta={copy.routes.auth.login} copy={copy}>
            <Card>
                <Form method="post" action={routes.auth.login} formAction={actions.login.name} result={result}>
                    <Input
                        type="text"
                        name="email"
                        required
                        placeholder={copy.email_or_username}
                        autofocus={!result}
                        value={state?.email ?? ""}
                    />
                    <Input
                        required
                        type="password"
                        name="password"
                        placeholder={copy.password}
                        autocomplete="current-password"
                    />
                    <Button type="submit">{copy.continue}</Button>
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
