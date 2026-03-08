import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { actions } from "@/routes/auth/login";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, Form } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { OauthButtons } from "@/views/components/oauth";

type LoginProps = {
    result?: ActionResult<typeof actions>;
    email?: string;
};

export function LoginPage({ result, email }: LoginProps) {
    return (
        <Layout meta={copy.routes.auth.login}>
            <Card>
                <Form method="post" action={routes.auth.login} formAction={actions.login.name} result={result}>
                    <Input
                        type="text"
                        name="email"
                        required
                        placeholder={copy.email_or_username}
                        autofocus={!result}
                        value={email ?? ""}
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
