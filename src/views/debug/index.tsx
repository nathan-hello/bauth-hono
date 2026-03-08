import { copy } from "@/lib/copy";
import { routes } from "@/routes/routes";
import { Layout } from "@/views/components/layout";
import { Card, ButtonLink } from "@/views/components/ui";

type HomeProps = {
    session: {
        user: { email: string };
    } | null;
};

export function DebugHomePage({ session }: HomeProps) {
    return (
        <Layout meta={copy.routes.debug.home}>
            <Card>
                {session ? `${copy.home_signed_in_as} ${session.user.email}` : copy.home_not_signed_in}
                <ButtonLink href={routes.debug.email}>Email</ButtonLink>
                {session ? (
                    <>
                        <ButtonLink href={routes.auth.dashboard}>{copy.routes.auth.dashboard.title}</ButtonLink>
                        <ButtonLink href={routes.auth.logout}>{copy.routes.auth.logout.title}</ButtonLink>
                    </>
                ) : (
                    <>
                        <ButtonLink href="/auth/login" variant="primary">
                            {copy.routes.auth.login.title}
                        </ButtonLink>
                        <ButtonLink href={routes.auth.register}>{copy.routes.auth.register.title}</ButtonLink>
                        <ButtonLink href={routes.auth.forgot}>{copy.routes.auth.forgot.title}</ButtonLink>
                    </>
                )}
                <details class="text-xs">
                    <summary class="cursor-pointer text-fg-muted">{copy.home_debug}</summary>
                    <pre class="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
                        {JSON.stringify(session, null, 2)}
                    </pre>
                </details>
            </Card>
        </Layout>
    );
}
