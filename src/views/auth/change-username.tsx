import { ChangeUsernameProps, actions } from "@/routes/auth/change-username";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

export function ChangeUsernamePage(props: ChangeUsernameProps) {
    return (
        <Layout meta={props.copy.routes.auth.changeUsername} copy={props.copy}>
            <Card>
                <Header>{props.copy.routes.auth.changeUsername.title}</Header>
                <Section>
                    <Form
                        method="post"
                        action={routes.auth.changeUsername}
                        result={props.result}
                        formAction={actions.change_username.name}
                        success={props.copy.dashboard_username_changed}
                    >
                        <Input type="text" name="username" value={props.username} required placeholder={props.copy.username} />
                        <Button type="submit">{props.copy.change_username}</Button>
                    </Form>
                    <br />
                    <ButtonLink href={routes.auth.dashboard}>{props.copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}
