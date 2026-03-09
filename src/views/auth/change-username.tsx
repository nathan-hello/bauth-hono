import { copy } from "@/lib/copy";
import { type ChangeUsernameActionData, type ChangeUsernameLoaderData, actions } from "@/routes/auth/change-username";
import { Layout } from "@/views/components/layout";
import { Input, Button, ButtonLink, Card, Form, Header, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    loaderData: ChangeUsernameLoaderData;
    actionData?: ChangeUsernameActionData;
};

export function ChangeUsernamePage({ loaderData, actionData }: Props) {
    return (
        <Layout meta={copy.routes.auth.changeUsername}>
            <Card>
                <Header>{copy.routes.auth.changeUsername.title}</Header>
                <Section>
                    <Form
                        method="post"
                        action={routes.auth.changeUsername}
                        result={actionData?.result}
                        formAction={actions.change_username.name}
                        success={copy.dashboard_username_changed}
                    >
                        <Input type="text" name="username" value={loaderData.username} required placeholder={copy.username} />
                        <Button type="submit">{copy.change_username}</Button>
                    </Form>
                    <br />
                    <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}
