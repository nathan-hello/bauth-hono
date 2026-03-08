import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { actions } from "@/routes/auth/change-username";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    username: string;
    result?: ActionResult<typeof actions>;
};

export function ChangeUsernamePage({ username, result }: Props) {
    return (
        <Layout meta={copy.routes.auth.changeUsername}>
            <Card>
                <Header>{copy.routes.auth.changeUsername.title}</Header>
                <Section>
                    <Form
                        method="post"
                        action={routes.auth.changeUsername}
                        result={result}
                        formAction={actions.change_username.name}
                        success={copy.dashboard_username_changed}
                    >
                        <Input type="text" name="username" value={username} required placeholder={copy.username} />
                        <Button type="submit">{copy.change_username}</Button>
                    </Form>
                    <br />
                    <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}
