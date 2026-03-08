import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { actions } from "@/routes/auth/change-password";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Label, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    hasCredential: boolean;
    result?: ActionResult<typeof actions>;
};

export function ChangePasswordPage({ hasCredential, result }: Props) {
    return (
        <Layout meta={copy.routes.auth.changePassword}>
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

function ChangePasswordForm({ result }: { result?: ActionResult<typeof actions> }) {
    return (
        <Form
            method="post"
            action={routes.auth.changePassword}
            result={result}
            formAction={actions.change_password.name}
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

function SetPasswordForm({ result }: { result?: ActionResult<typeof actions> }) {
    return (
        <Form
            method="post"
            action={routes.auth.changePassword}
            result={result}
            formAction={actions.set_password.name}
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
