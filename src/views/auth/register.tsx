import { copy } from "@/lib/copy";
import { type RegisterActionData, type RegisterLoaderData, actions } from "@/routes/auth/register";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, Form } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { OauthButtons } from "@/views/components/oauth";
import { RegisterEmailDevInfo } from "@/views/debug/email";

type RegisterProps = {
    loaderData: RegisterLoaderData;
    actionData?: RegisterActionData;
};

export function RegisterPage({ actionData }: RegisterProps) {
    return (
        <Layout meta={copy.routes.auth.register}>
            <Card>
                <Form method="post" action={routes.auth.register} formAction={actions.register.name} result={actionData?.result}>
                    <Input type="text" name="username" required placeholder={copy.username} />
                    <Input type="text" name="email" value={actionData?.state?.email ?? ""} required placeholder={copy.email} />
                    <Input
                        type="password"
                        name="password"
                        placeholder={copy.password}
                        required
                        autocomplete="new-password"
                    />
                    <Input
                        type="password"
                        name="repeat"
                        required
                        placeholder={copy.repeat_password}
                        autocomplete="new-password"
                    />
                    <Button type="submit">{copy.continue}</Button>
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
