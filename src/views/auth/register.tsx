import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { actions } from "@/routes/auth/register";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, Form } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { OauthButtons } from "@/views/components/oauth";
import { RegisterEmailDevInfo } from "@/views/debug/email";

type RegisterProps = {
    result?: ActionResult<typeof actions>;
    email?: string;
};

export function RegisterPage({ result, email }: RegisterProps) {
    return (
        <Layout meta={copy.routes.auth.register}>
            <Card>
                <Form method="post" action={routes.auth.register} formAction={actions.register.name} result={result}>
                    <Input type="text" name="username" required placeholder={copy.input_username} />
                    <Input type="text" name="email" value={email ?? ""} required placeholder={copy.input_email} />
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
                        <TextLink href={routes.auth.login}>{copy.login_prompt}</TextLink>
                    </FormFooter>
                </Form>
                <OauthButtons formAction={routes.auth.register} />
            </Card>
            <RegisterEmailDevInfo />
        </Layout>
    );
}
