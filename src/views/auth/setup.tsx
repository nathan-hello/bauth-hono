import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { actions } from "@/routes/auth/setup";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, ButtonLink, Form, Header, Section } from "@/views/components/ui";
import { routes } from "@/routes/routes";

type Props = {
    email: string;
    result?: ActionResult<typeof actions>;
};

export function SetupPage({ email, result }: Props) {
    return (
        <Layout meta={copy.routes.auth.setup}>
            <Card>
                <Header>{copy.routes.auth.setup.title}</Header>
                <Section>
                    <Form
                        method="post"
                        action={routes.auth.setup}
                        formAction={actions.setup.name}
                        result={result}
                    >
                        <Input type="email" name="email" value={email} required placeholder={copy.email} />
                        <Input
                            type="password"
                            name="new_password"
                            placeholder={copy.password}
                            required
                            autocomplete="new-password"
                        />
                        <Input
                            type="password"
                            name="repeat"
                            required
                            placeholder={copy.repeat_password}
                            autocomplete="new-password"
                        />
                        <Button type="submit">{copy.dashboard_setup}</Button>
                    </Form>
                    <br />
                    <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}
