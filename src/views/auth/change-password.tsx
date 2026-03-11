import { useCopy } from "@/lib/copy";
import { ChangePasswordProps, actions } from "@/routes/auth/change-password";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Label, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

export function ChangePasswordPage(props: ChangePasswordProps) {
    return (
        <Layout meta={props.copy.routes.auth.changePassword} copy={props.copy}>
            <Card>
                <Header>{props.state.hasCredential ? props.copy.password_change : props.copy.password_set}</Header>
                <Section>
                    {props.state.hasCredential ? (
                        <ChangePasswordForm result={props.result} />
                    ) : (
                        <SetPasswordForm result={props.result} />
                    )}
                </Section>
                <Section>
                    <ButtonLink href={routes.auth.dashboard}>{props.copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}

function ChangePasswordForm({ result }: { result: ChangePasswordProps["result"] }) {
    const copy = useCopy();
    return (
        <Form
            method="post"
            action={routes.auth.changePassword}
            result={result}
            formAction={actions.change_password.name}
            success={copy.dashboard_password_changed}
        >
            <Label for="current">{copy.password_current}</Label>
            <Input
                type="password"
                name="current"
                id="current"
                placeholder={copy.password_current_placeholder}
                required
                autocomplete="current-password"
            />
            <Label for="new_password">{copy.password_new}</Label>
            <Input
                type="password"
                name="new_password"
                id="new_password"
                placeholder={copy.password_new_placeholder}
                required
                autocomplete="new-password"
            />
            <Label for="new_password_repeat">{copy.password_repeat_new}</Label>
            <Input
                type="password"
                name="new_password_repeat"
                id="new_password_repeat"
                placeholder={copy.password_repeat_new_placeholder}
                required
                autocomplete="new-password"
            />
            <Button type="submit">{copy.password_change}</Button>
        </Form>
    );
}

function SetPasswordForm({ result }: { result: ChangePasswordProps["result"] }) {
    const copy = useCopy();
    return (
        <Form
            method="post"
            action={routes.auth.changePassword}
            result={result}
            formAction={actions.set_password.name}
            success={copy.dashboard_password_changed}
        >
            <Label unmuted>{copy.password_setup_prompt}</Label>
            <Label for="new_password">{copy.password_new}</Label>
            <Input
                type="password"
                name="new_password"
                id="new_password"
                placeholder={copy.password_new_placeholder}
                required
                autocomplete="new-password"
            />
            <Label for="new_password_repeat">{copy.password_repeat_new}</Label>
            <Input
                type="password"
                name="new_password_repeat"
                id="new_password_repeat"
                placeholder={copy.password_repeat_new_placeholder}
                autocomplete="new-password"
            />
            <Button type="submit">{copy.password_set}</Button>
        </Form>
    );
}
