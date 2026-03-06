import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { actions } from "@/routes/auth/change-email";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    currentEmail: string;
    emailVerified: boolean;
    result?: ActionResult<typeof actions>;
    verificationSent?: boolean;
};

export function ChangeEmailPage({ result }: Props) {
    return (
        <Layout title={copy.dashboard_email_change}>
            <Card>
                <Header>{copy.dashboard_email_change}</Header>
                <Section>
                    <Form
                        method="post"
                        action={routes.auth.changeEmail}
                        result={result}
                        formAction={actions.change_email.name}
                        success={copy.dashboard_email_verification_sent}
                    >
                        <Input
                            type="email"
                            name="new_email"
                            autocomplete="email"
                            placeholder={copy.input_email}
                            required
                        />
                        <Button type="submit">{copy.dashboard_email_change}</Button>
                    </Form>
                    <br />
                    <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}
