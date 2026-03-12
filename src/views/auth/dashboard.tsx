import { useCopy } from "@/lib/copy";
import { AppError } from "@/lib/auth-error";
import { Layout } from "@/views/components/layout";
import {
    Input,
    Button,
    Badge,
    FormAlert,
    Form,
    Label,
    SectionHeading,
    Section,
    ButtonLink,
    Header,
    Card,
    Divider,
    Details,
    AccountRow,
    BackupCodes,
    TabGroup,
    ErrorAlerts,
} from "@/views/components/ui";
import { raw } from "hono/html";
import { routes } from "@/routes/routes";
import { generateQrSvg } from "@/lib/qr";
import { actions, DashboardProps } from "@/routes/auth/dashboard";
import { auth } from "@/server/auth";

export function DashboardPage({ state, result, copy, user, session, accounts, sessions }: DashboardProps) {
    const hasCredential = accounts.some((a) => a.providerId === "credential");
    const linkedProviderIds = new Set(accounts.map((a) => a.providerId));
    const oauthProviders = getOauthProviders();

    return (
        <Layout meta={copy.routes.auth.dashboard} copy={copy}>
            <Card>
                <Header>{copy.routes.auth.dashboard.title}</Header>
                <Divider>
                    <ErrorAlerts
                        errors={
                            result && !result.ok && (!result.meta.action || result.meta.action === "top-of-page")
                                ? result.error
                                : undefined
                        }
                    />
                    <Section>
                        <UsernameSection username={user.username} />
                        <br />
                        <SectionHeading>{copy.dashboard_linked_accounts_heading}</SectionHeading>
                        <AccountRow
                            open={state?.openDetails === "credential"}
                            name="accounts"
                            label={copy.dashboard_linked_accounts_credential}
                        >
                            <EmailAndPasswordRow
                                hasCredential={hasCredential}
                                emailVerified={user.emailVerified}
                                result={result}
                            />
                        </AccountRow>
                        {accounts
                            .filter((a) => a.providerId !== "credential")
                            .map((account) => (
                                <AccountRow
                                    open={state?.openDetails === account.providerId}
                                    name="accounts"
                                    badge={copy.dashboard_linked_accounts_is_linked}
                                    badgeColor="blue"
                                    label={capitalize(account.providerId)}
                                >
                                    <Label center unmuted>
                                        {account.email}
                                    </Label>
                                    <UnlinkAccountForm providerId={account.providerId} />
                                </AccountRow>
                            ))}
                        {oauthProviders
                            .filter((p) => !linkedProviderIds.has(p.id))
                            .map((provider) => (
                                <AccountRow
                                    open={state?.openDetails === provider.id}
                                    name="accounts"
                                    badge={copy.dashboard_linked_accounts_not_linked}
                                    badgeColor="yellow"
                                    label={capitalize(provider.id)}
                                >
                                    <LinkAccountForm provider={provider.id} />
                                </AccountRow>
                            ))}
                    </Section>

                    {hasCredential && <TwoFactorSection state={state} result={result} />}
                    <SessionsSection sessions={sessions} current={session} />

                    <Section>
                        <SectionHeading>{copy.dashboard_delete_account_heading}</SectionHeading>
                        <ButtonLink href={routes.auth.delete} variant="danger">
                            {copy.dashboard_delete_account_button}
                        </ButtonLink>
                    </Section>
                </Divider>
            </Card>
        </Layout>
    );
}

function EmailAndPasswordRow({
    hasCredential,
    result,
    emailVerified,
}: {
    emailVerified: boolean;
    hasCredential: boolean;
    result: DashboardProps["result"];
}) {
    const copy = useCopy();
    if (hasCredential) {
        return (
            <Section gap>
                <VerifyEmailForm emailVerified={emailVerified} result={result} />
                <ButtonLink variant="primary" href={routes.auth.changeEmail}>
                    {copy.change_email}
                </ButtonLink>
                <ButtonLink variant="primary" href={routes.auth.changePassword}>
                    {hasCredential ? copy.password_change : copy.password_set}
                </ButtonLink>
            </Section>
        );
    }

    return (
        <ButtonLink variant="primary" href={routes.auth.setup}>
            {copy.dashboard_setup}
        </ButtonLink>
    );
}

function VerifyEmailForm({ result, emailVerified }: { emailVerified: boolean; result: DashboardProps["result"] }) {
    const copy = useCopy();
    if (emailVerified) {
        return (
            <Label center unmuted>
                {copy.email_verified}
            </Label>
        );
    }
    return (
        <Form
            method="post"
            action={routes.auth.dashboard}
            formAction={actions.email_resend_verification.name}
            result={result}
        >
            <Button
                disabled={result?.meta.action === actions.email_resend_verification.name && result.ok}
                type="submit"
            >
                {copy.resend_email_verification}
            </Button>
        </Form>
    );
}

function UsernameSection({ username }: { username: string | null | undefined }) {
    const copy = useCopy();
    return (
        <>
            <Label center unmuted>
                @{username ?? copy.username_not_set}
            </Label>
            <br />
            <ButtonLink variant="primary" href={routes.auth.changeUsername}>
                {copy.change_username}
            </ButtonLink>
        </>
    );
}

function UnlinkAccountForm({ providerId }: { providerId: string }) {
    const copy = useCopy();
    return (
        <Form
            method="post"
            action={routes.auth.dashboard}
            formAction={actions.unlink_account.name}
            kv={{ providerId: providerId }}
        >
            <Button type="submit">{copy.dashboard_linked_accounts_unlink}</Button>
        </Form>
    );
}

function LinkAccountForm({ provider }: { provider: string }) {
    const copy = useCopy();
    return (
        <Form
            method="post"
            action={routes.auth.dashboard}
            formAction={actions.link_account.name}
            kv={{ provider: provider }}
        >
            <Button type="submit">{copy.dashboard_linked_accounts_link}</Button>
        </Form>
    );
}

function TwoFactorSection({ state, result }: { result: DashboardProps["result"]; state: DashboardProps["state"] }) {
    if (state?.userEnabled) {
        return <TwoFactorEnabled state={state} result={result} />;
    }
    if (state?.intermediateEnable) {
        return <TwoFactorSetup state={state} result={result} />;
    }
    return <TwoFactorDisabled result={result} />;
}

function TwoFactorDisabled({ result }: { result: DashboardProps["result"] }) {
    const copy = useCopy();
    return (
        <Section>
            <SectionHeading>{copy.dashboard_2fa_heading}</SectionHeading>
            <p>{copy.dashboard_2fa_description}</p>
            <Form
                method="post"
                action={routes.auth.dashboard}
                result={result}
                formAction={actions.two_factor_enable.name}
            >
                <Input
                    type="password"
                    name="password"
                    placeholder={copy.password}
                    required
                    autocomplete="current-password"
                />
                <Button type="submit">{copy.dashboard_2fa_enable}</Button>
            </Form>
        </Section>
    );
}

function TwoFactorSetup({ state, result }: { result: DashboardProps["result"]; state: DashboardProps["state"] }) {
    const copy = useCopy();
    if (!state.totpURI || !state.backupCodes || state.backupCodes.length === 0) {
        throw new AppError("totp_uri_not_found");
    }

    return (
        <Section gap>
            <SectionHeading>{copy.dashboard_2fa_heading}</SectionHeading>
            <FormAlert color="warning">{copy.dashboard_2fa_setup_prompt}</FormAlert>
            <TwoFactorTotpViewer secret={state.totpURI} />
            <VerifyTotpForm result={result} state={state} />
            <BackupCodes
                title={copy.dashboard_backup_codes_title}
                description={copy.dashboard_backup_codes_save}
                codes={state.backupCodes}
            />
            <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
        </Section>
    );
}

async function TwoFactorTotpViewer({ secret }: { secret: string }) {
    const copy = useCopy();
    function parseOtpauthUri(uri: string) {
        const u = new URL(uri);
        const params: Record<string, string> = {};
        if (u.protocol !== "otpauth:") {
            params.secret = "Error: could not parse secret. (Invalid protocol)";
        }
        u.searchParams.forEach((v, k) => {
            params[k] = v;
        });
        if (!("secret" in params)) {
            params.secret = "Error: could not parse secret. (Invalid params)";
        }
        const digits = params.digits ? Number(params.digits) : 6;
        const period = params.period ? Number(params.period) : 30;
        const algorithm = "SHA1";
        return { digits, period, algorithm, secret: params.secret };
    }
    const manual = parseOtpauthUri(secret);
    return (
        <TabGroup
            name="totp"
            tabs={[
                {
                    id: "link",
                    label: copy.totp_tab_link,
                    children: <Button>{copy.dashboard_2fa_open_totp_link}</Button>,
                },
                {
                    id: "qr",
                    label: copy.totp_tab_qr,
                    children: <div class="[&_svg]:bg-white [&_svg]:p-2">{raw(generateQrSvg(secret))}</div>,
                },
                {
                    id: "manual",
                    label: copy.totp_tab_manual,
                    children: (
                        <div class="flex flex-col text-fg text-lg gap-2 break-all [&_pre]:whitespace-pre-wrap">
                            <div>
                                <strong>{copy.totp_manual_secret}</strong> <br /> <pre>{manual.secret}</pre>
                            </div>
                            <div>
                                <strong>{copy.totp_manual_alg}</strong> <br /> <pre>{manual.algorithm}</pre>
                            </div>
                            <div>
                                <strong>{copy.totp_manual_period}</strong> <br />{" "}
                                <pre>
                                    {manual.period} {copy.totp_manual_period_seconds}
                                </pre>
                            </div>
                            <div>
                                <strong>{copy.totp_manual_digits}</strong> <br /> <pre>{manual.digits}</pre>
                            </div>
                        </div>
                    ),
                },
            ]}
        />
    );
}

function TwoFactorEnabled({ state, result }: { result: DashboardProps["result"]; state: DashboardProps["state"] }) {
    const copy = useCopy();
    if (state?.totpURI) {
        return (
            <Section>
                <TwoFactorTotpViewer secret={state.totpURI} />
                <VerifyTotpForm result={result} state={state} />
                <br />
                <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
            </Section>
        );
    }

    if (state?.backupCodes && state.backupCodes.length > 0) {
        return (
            <Section>
                <BackupCodes
                    title={copy.dashboard_backup_codes_title}
                    description={copy.dashboard_backup_codes_save}
                    codes={state.backupCodes}
                />
                <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
            </Section>
        );
    }
    const openAction = result && !result.ok ? result.meta.action : undefined;

    return (
        <Section>
            <SectionHeading>{copy.dashboard_2fa_heading}</SectionHeading>
            <FormAlert color="success">{copy.dashboard_2fa_active}</FormAlert>
            <br />
            <Details
                title={copy.dashboard_2fa_show_qr}
                name="2fa-action"
                open={openAction === actions.get_totp_uri.name}
            >
                <Form
                    method="post"
                    action={routes.auth.dashboard}
                    result={result}
                    formAction={actions.get_totp_uri.name}
                >
                    <Input
                        type="password"
                        name="password"
                        placeholder={copy.password}
                        required
                        autocomplete="current-password"
                    />
                    <Button type="submit">{copy.dashboard_2fa_show_qr}</Button>
                </Form>
            </Details>
            <Details
                title={copy.dashboard_2fa_new_backup_codes}
                name="2fa-action"
                open={openAction === actions.get_backup_codes.name}
            >
                <Form
                    method="post"
                    action={routes.auth.dashboard}
                    result={result}
                    formAction={actions.get_backup_codes.name}
                >
                    <Input
                        type="password"
                        name="password"
                        placeholder={copy.password}
                        required
                        autocomplete="current-password"
                    />
                    <Button type="submit">{copy.dashboard_2fa_new_backup_codes}</Button>
                </Form>
            </Details>
            <Details
                title={copy.dashboard_2fa_disable}
                name="2fa-action"
                open={openAction === actions.two_factor_disable.name}
            >
                <Form
                    method="post"
                    action={routes.auth.dashboard}
                    result={result}
                    formAction={actions.two_factor_disable.name}
                >
                    <Input
                        type="password"
                        name="password"
                        placeholder={copy.password}
                        required
                        autocomplete="current-password"
                    />
                    <Button type="submit">{copy.dashboard_2fa_disable}</Button>
                </Form>
            </Details>
        </Section>
    );
}

function VerifyTotpForm({ result, state }: { result: DashboardProps["result"]; state: DashboardProps["state"] }) {
    const copy = useCopy();
    return (
        <Form
            method="post"
            action={routes.auth.dashboard}
            result={result}
            formAction={actions.two_factor_totp_verify.name}
            success={copy.dashboard_2fa_success}
            kv={{
                totp_uri: state.totpURI,
                backup_codes: JSON.stringify(state.backupCodes),
            }}
        >
            <Label for="totp_code">
                {state.userEnabled ? copy.dashboard_2fa_optional_verify : copy.dashboard_2fa_verify_prompt}
            </Label>
            <Input
                type="text"
                name="totp_code"
                id="totp_code"
                placeholder={copy.dashboard_2fa_code_placeholder}
                minlength={6}
                maxlength={6}
                required
                autocomplete="one-time-code"
            />
            <Button type="submit">{copy.dashboard_2fa_verify_button}</Button>
        </Form>
    );
}

function SessionsSection({
    sessions,
    current,
}: {
    sessions: DashboardProps["sessions"];
    current: DashboardProps["session"];
}) {
    const copy = useCopy();
    return (
        <Section>
            <SectionHeading>{copy.dashboard_sessions_heading}</SectionHeading>
            {sessions.map((session) => {
                // Redirect to routes.auth.logout instead of revoking session because
                // revoking session does not remove the session_token from the browser
                // but logging out does.
                if (session.id === current.id) {
                    return (
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <Badge color="blue">{copy.dashboard_session_current}</Badge>
                                <p>{session.ipAddress}</p>
                            </div>
                            <br />
                            <ButtonLink variant="primary" href={routes.auth.logout}>
                                {copy.sign_out}
                            </ButtonLink>
                        </div>
                    );
                }
                return (
                    <Form
                        method="post"
                        action={routes.auth.dashboard}
                        formAction={actions.revoke_session.name}
                        kv={{ session: session.token }}
                    >
                        <div class="flex-1 min-w-0">
                            <p>{session.ipAddress}</p>
                            <Label>{new Date(session.updatedAt).toLocaleString()}</Label>
                        </div>
                        <Button variant="ghost" type="submit">
                            {copy.dashboard_session_revoke}
                        </Button>
                    </Form>
                );
            })}
            {sessions.length > 1 && (
                <Form
                    method="post"
                    action={routes.auth.dashboard}
                    formAction={actions.revoke_session.name}
                    kv={{ session: "all" }}
                >
                    <Button variant="ghost" type="submit">
                        {copy.dashboard_session_revoke_other_sessions}
                    </Button>
                </Form>
            )}
        </Section>
    );
}

function getOauthProviders() {
    const providers = Object.entries(auth.options.socialProviders)
        .map(([k, v]) => {
            if (v.enabled) {
                return { id: k, label: capitalize(k) };
            }
        })
        .filter((e) => e !== undefined);

    return providers;
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
