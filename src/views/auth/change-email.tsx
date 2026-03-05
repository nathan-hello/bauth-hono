import { copy } from "@/lib/copy";
import type { AppError } from "@/lib/auth-error";
import { Layout } from "@/views/components/layout";
import {
    Input,
    Button,
    ButtonLink,
    Card,
    ErrorAlerts,
    Form,
    FormAlert,
    Header,
    Label,
    Section,
    Badge,
} from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    currentEmail: string;
    emailVerified: boolean;
    success?: boolean;
    verificationSent?: boolean;
    errors?: AppError[];
};

export function ChangeEmailPage({ currentEmail, emailVerified, success, verificationSent, errors }: Props) {
    return (
        <Layout title={copy.dashboard_email_change}>
            <Card>
                <Header>{copy.dashboard_email_change}</Header>
                <Section>
                    {success ? (
                        <FormAlert color="success">{copy.dashboard_email_verification_sent}</FormAlert>
                    ) : (
                        <Form method="post" action={routes.auth.changeEmail}>
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
                    )}
                    <br/>
                    <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}
