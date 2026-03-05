import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { actionName } from "@/routes/auth/change-password";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Label, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    hasCredential: boolean;
    result?: ActionResult<keyof typeof actionName>;
};

export function ChangePasswordPage({ hasCredential, result }: Props) {
    return (
        <Layout title={copy.dashboard_password_heading}>
            <Card>
                <Header>{hasCredential ? copy.dashboard_password_change : copy.dashboard_password_set}</Header>
                <Section>
                    {hasCredential ? <ChangePasswordForm result={result} /> : <SetPasswordForm result={result} />}
                </Section>
                <Section>
                    <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}

function ChangePasswordForm({ result }: { result?: ActionResult<keyof typeof actionName> }) {
    return (
        <Form
            method="post"
            action={routes.auth.changePassword}
            result={result}
            formAction={actionName.change_password}
            success={copy.dashboard_password_changed}
        >
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

function SetPasswordForm({ result }: { result?: ActionResult<keyof typeof actionName> }) {
    return (
        <Form
            method="post"
            action={routes.auth.changePassword}
            result={result}
            formAction={actionName.set_password}
            success={copy.dashboard_password_changed}
        >
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
