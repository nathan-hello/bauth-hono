import { copy } from "@/lib/copy";
import { routes } from "@/routes/routes";
import { Layout } from "@/views/components/layout";
import { ButtonLink, Card, Label, Section, SectionHeading } from "@/views/components/ui";

export function ErrorPage({ status, message }: { status: number; message: string }) {
    return (
        <Layout meta={copy.routes.auth.error}>
            <Card>
                <Section>
                    <SectionHeading>{status}</SectionHeading>
                    <Label unmuted>{message}</Label>
                </Section>
                <ButtonLink href={routes.auth.dashboard}>{copy.go_dashboard}</ButtonLink>
                <ButtonLink variant="primary" href={routes.index}>
                    {copy.go_home}
                </ButtonLink>
            </Card>
        </Layout>
    );
}
