import { copy } from "../lib/copy";
import { Layout } from "./layout";
import { Card, ButtonLink } from "./ui";

type HomeProps = {
  session: {
    user: { email: string };
  } | null;
};

export function HomePage({ session }: HomeProps) {
  return (
    <Layout title={copy.routes.home.title}>
      <Card>
        <div class="flex flex-col gap-2">
          <h1 class="text-lg font-semibold">{copy.routes.home.title}</h1>
          <p class="text-xs text-fg-muted">
            {session
              ? `${copy.home_signed_in_as} ${session.user.email}`
              : copy.home_not_signed_in}
          </p>
        </div>

        <nav class="flex flex-col gap-2">
          {session ? (
            <>
              <ButtonLink href="/auth/dashboard">{copy.routes.dashboard.title}</ButtonLink>
              <ButtonLink href="/auth/logout">{copy.routes.logout.title}</ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/auth/login" variant="primary">
                {copy.routes.login.title}
              </ButtonLink>
              <ButtonLink href="/auth/register">{copy.routes.register.title}</ButtonLink>
              <ButtonLink href="/auth/forgot">{copy.routes.forgot.title}</ButtonLink>
            </>
          )}
        </nav>

        {session && (
          <details class="text-xs">
            <summary class="cursor-pointer text-fg-muted">{copy.home_debug}</summary>
            <pre class="select-text mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
              {JSON.stringify(session, null, 2)}
            </pre>
          </details>
        )}
      </Card>
    </Layout>
  );
}
