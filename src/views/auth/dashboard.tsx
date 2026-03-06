import { copy } from "@/lib/copy";
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
} from "@/views/components/ui";
import { raw } from "hono/html";
import { routes } from "@/routes/routes";
import { generateQrSvg } from "@/lib/qr";
import { BAuthSession, type ActionResult } from "@/lib/types";
import { actions } from "@/routes/auth/dashboard";
import { auth } from "@/server/auth";

export type DashboardActionData = {
    result?: ActionResult<typeof actions>;
    totp?: TotpState;
};

export type LinkedAccount = {
    id: string;
    email: string;
    providerId: string;
    accountId: string;
    scopes?: string[];
};

export type DashboardLoaderData = BAuthSession & {
    sessions: BAuthSession["session"][];
    accounts: LinkedAccount[];
};

export type TotpState = {
    intermediateEnable?: boolean;
    totpURI?: string;
    backupCodes?: string[];
    userEnabled: boolean;
    verified?: boolean;
};

type DashboardProps = {
    actionData?: DashboardActionData;
    loaderData: DashboardLoaderData;
};

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

export function DashboardPage({ actionData, loaderData }: DashboardProps) {
    const hasCredential = loaderData.accounts.some((a) => a.providerId === "credential");
    const linkedProviderIds = new Set(loaderData.accounts.map((a) => a.providerId));
    const oauthProviders = getOauthProviders();

    return (
        <Layout title={copy.routes.dashboard.title}>
            <Card>
                <Header>{copy.dashboard_title}</Header>
                <Section>
                    <Badge color={loaderData.user.emailVerified ? "blue" : "gray"}>
                        {loaderData.user.emailVerified
                            ? copy.dashboard_email_verified_badge
                            : copy.dashboard_email_unverified_badge}
                    </Badge>
                    <Label unmuted>{loaderData.user.email}</Label>
                    {!loaderData.user.emailVerified && (
                        <Form
                            method="post"
                            action={routes.auth.dashboard}
                            formAction={actions.email_resend_verification.name}
                            result={actionData?.result}
                        >
                            <Button
                                disabled={
                                    actionData?.result?.action === actions.email_resend_verification.name &&
                                    actionData.result.success
                                }
                                type="submit"
                            >
                                {copy.dashboard_email_resend_verification}
                            </Button>
                        </Form>
                    )}
                </Section>
                <Divider>
                    <Section>
                        <SectionHeading>{copy.dashboard_linked_accounts_heading}</SectionHeading>
                        <AccountRow name="accounts" label={copy.dashboard_linked_accounts_credential}>
                            <br />
                            <ButtonLink variant="primary" href={routes.auth.changeEmail}>
                                {copy.dashboard_email_change}
                            </ButtonLink>
                            <br />
                            <ButtonLink variant="primary" href={routes.auth.changePassword}>
                                {hasCredential ? copy.dashboard_password_change : copy.dashboard_password_set}
                            </ButtonLink>
                            <br />
                        </AccountRow>
                        {loaderData.accounts
                            .filter((a) => a.providerId !== "credential")
                            .map((account) => (
                                <AccountRow
                                    name="accounts"
                                    badge={copy.dashboard_linked_accounts_linked}
                                    badgeColor="blue"
                                    label={capitalize(account.providerId)}
                                >
                                    <p>{account.email}</p>
                                    <UnlinkAccountForm providerId={account.providerId} />
                                </AccountRow>
                            ))}
                        {oauthProviders
                            .filter((p) => !linkedProviderIds.has(p.id))
                            .map((provider) => (
                                <AccountRow
                                    name="accounts"
                                    badge={copy.dashboard_linked_accounts_unlinked}
                                    badgeColor="yellow"
                                    label={capitalize(provider.id)}
                                >
                                    <LinkAccountForm provider={provider.id} />
                                </AccountRow>
                            ))}
                    </Section>

                    {hasCredential && (
                        <TwoFactorSection
                            state={actionData?.totp}
                            userEnabled={loaderData.user.twoFactorEnabled}
                            result={actionData?.result}
                        />
                    )}
                    <SessionsSection sessions={loaderData.sessions} current={loaderData.session} />

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

function UnlinkAccountForm({ providerId }: { providerId: string }) {
    return (
        <Form
            method="post"
            action={routes.auth.dashboard}
            formAction={actions.unlink_account.name}
            kv={{ providerId: providerId }}
        >
            <Button variant="ghost" type="submit">
                {copy.dashboard_linked_accounts_unlink}
            </Button>
        </Form>
    );
}

function LinkAccountForm({ provider }: { provider: string }) {
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

function TwoFactorSection({
    userEnabled,
    state,
    result,
}: {
    userEnabled?: boolean | null;
    state?: TotpState;
    result?: ActionResult<typeof actions>;
}) {
    if (userEnabled) {
        return <TwoFactorEnabled state={state} result={result} />;
    }
    if (state?.intermediateEnable) {
        return <TwoFactorSetup state={state} result={result} />;
    }
    return <TwoFactorDisabled result={result} />;
}

function TwoFactorDisabled({ result }: { result?: ActionResult<typeof actions> }) {
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
                    placeholder={copy.input_password}
                    required
                    autocomplete="current-password"
                />
                <Button type="submit">{copy.dashboard_2fa_enable}</Button>
            </Form>
        </Section>
    );
}

function TwoFactorSetup({ state, result }: { state: TotpState; result?: ActionResult<typeof actions> }) {
    if (!state.totpURI || !state.backupCodes || state.backupCodes.length === 0) {
        throw new AppError("totp_uri_not_found");
    }

    return (
        <Section>
            <SectionHeading>{copy.dashboard_2fa_heading}</SectionHeading>
            <FormAlert color="warning">{copy.dashboard_2fa_setup_prompt}</FormAlert>
            <Section>
                <TwoFactorTotpViewer secret={state.totpURI} />
                <VerifyTotpForm
                    result={result}
                    totpURI={state.totpURI}
                    backupCodes={state.backupCodes}
                    intermediateEnable
                />
            </Section>
            <BackupCodes
                title={copy.dashboard_backup_codes_title}
                description={copy.dashboard_backup_codes_save}
                codes={state.backupCodes}
            />
        </Section>
    );
}

async function TwoFactorTotpViewer({ secret }: { secret: string }) {
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

function TwoFactorEnabled({ state, result }: { state?: TotpState; result?: ActionResult<typeof actions> }) {
    if (state?.totpURI) {
        return (
            <Section>
                <TwoFactorTotpViewer secret={state.totpURI} />
                <VerifyTotpForm result={result} alreadyVerified totpURI={state.totpURI} />
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
    const openAction = result && !result.success ? result.action : undefined;

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
                        placeholder={copy.input_password}
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
                        placeholder={copy.input_password}
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
                        placeholder={copy.input_password}
                        required
                        autocomplete="current-password"
                    />
                    <Button type="submit">{copy.dashboard_2fa_disable}</Button>
                </Form>
            </Details>
        </Section>
    );
}

function VerifyTotpForm({
    result,
    alreadyVerified,
    totpURI,
    backupCodes,
    intermediateEnable,
}: {
    result?: ActionResult<typeof actions>;
    alreadyVerified?: boolean;
    totpURI?: string;
    backupCodes?: string[];
    intermediateEnable?: boolean;
}) {
    return (
        <Form
            method="post"
            action={routes.auth.dashboard}
            result={result}
            formAction={actions.two_factor_totp_verify.name}
            success={copy.dashboard_2fa_success}
            kv={{
                totp_uri: totpURI,
                backup_codes: JSON.stringify(backupCodes),
                "already-verified": alreadyVerified,
                intermediate_enable: intermediateEnable,
            }}
        >
            <Label for="totp_code">
                {alreadyVerified ? copy.dashboard_2fa_optional_verify : copy.dashboard_2fa_verify_prompt}
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
    sessions: BAuthSession["session"][];
    current: BAuthSession["session"];
}) {
    return (
        <Section>
            <SectionHeading>{copy.dashboard_sessions_heading}</SectionHeading>
            {sessions.map((session) => (
                <Form
                    method="post"
                    action={routes.auth.dashboard}
                    formAction={actions.revoke_session.name}
                    kv={{ session: session.token }}
                >
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            {session.id === current.id && <Badge color="blue">{copy.dashboard_session_current}</Badge>}
                            <p>{session.ipAddress}</p>
                        </div>
                        <Label>{new Date(session.updatedAt).toLocaleString()}</Label>
                    </div>
                    <Button variant="ghost" type="submit">
                        {copy.dashboard_session_revoke}
                    </Button>
                </Form>
            ))}
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
