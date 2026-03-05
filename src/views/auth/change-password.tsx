import { copy } from "@/lib/copy";
import type { AppError } from "@/lib/auth-error";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, ErrorAlerts, Form, FormAlert, Header, Label, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    hasCredential: boolean;
    success?: boolean;
    errors?: AppError[];
};

export function ChangePasswordPage({ hasCredential, success, errors }: Props) {
    return (
        <Layout title={copy.dashboard_password_heading}>
            <Card>
                <Header>{hasCredential ? copy.dashboard_password_change : copy.dashboard_password_set}</Header>
                <Section>
                    <ErrorAlerts errors={errors} />
                    {success && <FormAlert color="success">{copy.dashboard_password_changed}</FormAlert>}
                    {hasCredential ? <ChangePasswordForm /> : <SetPasswordForm />}
                </Section>
                <Section>
                    <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}

function ChangePasswordForm() {
    return (
        <Form method="post" action={routes.auth.changePassword}>
            <input type="hidden" name="action" value="change_password" />
            <Label for="current">{copy.dashboard_password_current_label}</Label>
            <Input
                type="password"
                name="current"
                id="current"
                placeholder={copy.dashboard_password_current_placeholder}
                required
                autocomplete="current-password"
            />
            <Label for="new_password">{copy.dashboard_password_new_label}</Label>
            <Input
                type="password"
                name="new_password"
                id="new_password"
                placeholder={copy.dashboard_password_new_placeholder}
                required
                autocomplete="new-password"
            />
            <Label for="new_password_repeat">{copy.dashboard_password_repeat_label}</Label>
            <Input
                type="password"
                name="new_password_repeat"
                id="new_password_repeat"
                placeholder={copy.dashboard_password_repeat_new_placeholder}
                required
                autocomplete="new-password"
            />
            <Button type="submit">{copy.dashboard_password_change}</Button>
        </Form>
    );
}

function SetPasswordForm() {
    return (
        <Form method="post" action={routes.auth.changePassword}>
            <input type="hidden" name="action" value="set_password" />
            <Label unmuted>{copy.dashboard_password_set_description}</Label>
            <Label for="new_password">{copy.dashboard_password_new_label}</Label>
            <Input
                type="password"
                name="new_password"
                id="new_password"
                placeholder={copy.dashboard_password_new_placeholder}
                required
                autocomplete="new-password"
            />
            <Label for="new_password_repeat">{copy.dashboard_password_repeat_label}</Label>
            <Input
                type="password"
                name="new_password_repeat"
                id="new_password_repeat"
                placeholder={copy.dashboard_password_repeat_new_placeholder}
                autocomplete="new-password"
            />
            <Button type="submit">{copy.dashboard_password_set}</Button>
        </Form>
    );
}
