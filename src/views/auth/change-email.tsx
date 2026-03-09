import { copy } from "@/lib/copy";
import { type ChangeEmailActionData, type ChangeEmailLoaderData, actions } from "@/routes/auth/change-email";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    loaderData: ChangeEmailLoaderData;
    actionData?: ChangeEmailActionData;
};

export function ChangeEmailPage({ actionData }: Props) {
    return (
        <Layout meta={copy.routes.auth.changeEmail}>
            <Card>
                <Header>{copy.routes.auth.changeEmail.title}</Header>
                <Section>
                    <Form
                        method="post"
                        action={routes.auth.changeEmail}
                        result={actionData?.result}
                        formAction={actions.change_email.name}
                        success={copy.email_verification_sent}
                    >
                        <Input
                            type="email"
                            name="new_email"
                            autocomplete="email"
                            placeholder={copy.email}
                            required
                        />
                        <Button type="submit">{copy.change_email}</Button>
                    </Form>
                    <br />
                    <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}
