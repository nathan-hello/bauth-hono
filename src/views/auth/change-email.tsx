import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    currentEmail: string;
    emailVerified: boolean;
    result?: ActionResult;
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
                        formAction="change_email"
                        success={copy.dashboard_email_verification_sent}
                    >
                        <input type="hidden" name="action" value="change_email" />
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
