import { copy } from "@/lib/copy";
import { AppError } from "@/lib/auth-error";
import { Layout } from "@/views/components/layout";
import {
    Input,
    Button,
    Badge,
    FormAlert,
    ErrorAlerts,
    Form,
    Label,
    SectionHeading,
    Section,
    ButtonLink,
    Header,
    Card,
    Divider,
    Details,
} from "@/views/components/ui";
import type { Child } from "hono/jsx";
import { raw } from "hono/html";
import { routes } from "@/routes/routes";
import { generateQrSvg } from "@/lib/qr";
import { BAuthSession } from "@/lib/types";
import { actionName } from "@/routes/auth/dashboard";
import { auth } from "@/server/auth";

export type DashboardActionData = {
    errors?: AppError[];
    change_password?: { success: boolean };
    email_verify?: { sent: boolean };
    totp?: TotpState;
};

export type LinkedAccount = {
    id: string;
    providerId: string;
    accountId: string;
    scopes?: string[];
};

export type DashboardLoaderData = BAuthSession & {
    sessions: BAuthSession["session"][];
    accounts: LinkedAccount[];
};

type TotpState = {
    intermediateEnable?: boolean;
    totpURI?: string;
    backupCodes?: string[];
    userEnabled: boolean;
    verified?: boolean;
    errors?: AppError[];
};

type DashboardProps = {
    actionData?: DashboardActionData;
    loaderData: DashboardLoaderData;
};

export function DashboardPage({ actionData, loaderData }: DashboardProps) {
    const hasCredential = loaderData.accounts.some((a) => a.providerId === "credential");
    return (
        <Layout title={copy.routes.dashboard.title}>
            <Card>
                <Header>{copy.dashboard_title}</Header>
                <ErrorAlerts errors={actionData?.errors} />
                <Divider>
                    <Section>
                        <SectionHeading>{copy.dashboard_email_heading}</SectionHeading>
                        {loaderData.user.emailVerified ? (
                          
                            <Badge color="blue">{copy.dashboard_email_verified_badge}</Badge>
                        ) : (
                            <Badge color="gray">{copy.dashboard_email_unverified_badge}</Badge>
                        )}
        
                        <Label unmuted>{loaderData.user.email}</Label>
                        {!loaderData.user.emailVerified && (
                            <EmailResendVerification verificationSent={actionData?.email_verify?.sent} />
                        )}
                        <Details name="change" title="Change email">
                            <EmailChange />
                        </Details>
                        <Details
                            name="change"
                            title={
                                hasCredential ? copy.dashboard_password_change : copy.dashboard_password_set_description
                            }
                        >
                            <PasswordSection
                                accounts={loaderData.accounts}
                                success={actionData?.change_password?.success}
                            />
                        </Details>
                    </Section>
                    <LinkedAccountsSection accounts={loaderData.accounts} />
                    <TwoFactorSection state={actionData?.totp} userEnabled={loaderData.user.twoFactorEnabled} />
                    <SessionsSection sessions={loaderData.sessions} current={loaderData.session} />
                    <DeleteAccount />
                </Divider>
            </Card>
        </Layout>
    );
}

function DeleteAccount() {
    return (
        <Section>
            <SectionHeading>{copy.dashboard_delete_account_heading}</SectionHeading>
            <ButtonLink href={routes.auth.delete} variant="danger">
                {copy.dashboard_delete_account_button}
            </ButtonLink>
        </Section>
    );
}

function EmailChange() {
    return (
        <Form method="post" action={routes.auth.dashboard}>
            <input type="hidden" name="action" value={actionName.email_change} />
            <Input type="email" name="new_email" autocomplete="email" placeholder={copy.input_email} required />
            <Button type="submit">{copy.dashboard_email_change}</Button>
        </Form>
    );
}

function EmailResendVerification({ verificationSent }: { verificationSent: boolean | undefined }) {
    return (
        <Form method="post" action={routes.auth.dashboard}>
            <input type="hidden" name="action" value={actionName.email_resend_verification} />
            <Label>
                {verificationSent ? copy.dashboard_email_verification_sent : copy.dashboard_email_unverified_prompt}
            </Label>
            <Button variant="ghost" disabled={verificationSent} type="submit">
                {copy.dashboard_email_resend_verification}
            </Button>
        </Form>
    );
}

function PasswordSection({ accounts, success }: { accounts: LinkedAccount[]; success?: boolean }) {
    const hasCredential = accounts.some((a) => a.providerId === "credential");

    if (hasCredential) {
        return (
            <Form method="post" action={routes.auth.dashboard}>
                {success && <FormAlert color="success">{copy.dashboard_password_changed}</FormAlert>}
                <input type="hidden" name="action" value={actionName.change_password} />
                <Label for="current">{copy.dashboard_password_current_label}</Label>
                <Input
                    type="password"
                    name="current"
                    id="current"
                    placeholder={copy.dashboard_password_current_placeholder}
                    required
                    autocomplete="current-password"
                />
                <Label for="new_password">{copy.dashboard_password_new_label}</Label>
                <Input
                    type="password"
                    name="new_password"
                    id="new_password"
                    placeholder={copy.dashboard_password_new_placeholder}
                    required
                    autocomplete="new-password"
                />
                <Label for="new_password_repeat">{copy.dashboard_password_repeat_label}</Label>
                <Input
                    type="password"
                    name="new_password_repeat"
                    id="new_password_repeat"
                    placeholder={copy.dashboard_password_repeat_placeholder}
                    required
                    autocomplete="new-password"
                />
                <Button type="submit">{copy.dashboard_password_change}</Button>
            </Form>
        );
    }

    return (
        <Form method="post" action={routes.auth.dashboard}>
            {success && <FormAlert color="success">{copy.dashboard_password_changed}</FormAlert>}
            <input type="hidden" name="action" value={actionName.set_password} />
            <Label for="new_password">{copy.dashboard_password_new_label}</Label>
            <Input
                type="password"
                name="new_password"
                id="new_password"
                placeholder={copy.dashboard_password_new_placeholder}
                required
                autocomplete="new-password"
            />
            <Label for="new_password_repeat">{copy.dashboard_password_repeat_label}</Label>
            <Input
                type="password"
                name="new_password_repeat"
                id="new_password_repeat"
                placeholder={copy.dashboard_password_repeat_placeholder}
                required
                autocomplete="new-password"
            />
            <Button type="submit">{copy.dashboard_password_set}</Button>
        </Form>
    );
}

function LinkedAccountsSection({ accounts }: { accounts: LinkedAccount[] }) {
    const linkedProviderIds = new Set(accounts.map((a) => a.providerId));
    const oauthProviders: { id: string; label: string }[] = [];
    if (auth.options.socialProviders.google.enabled) {
        oauthProviders.push({ id: "google", label: "Google" });
    }
    if (auth.options.socialProviders.apple.enabled) {
        oauthProviders.push({ id: "apple", label: "Apple" });
    }

    const hasCredentialAccount = accounts.some((a) => a.providerId === "credential");

    return (
        <Section>
            <SectionHeading>{copy.dashboard_linked_accounts_heading}</SectionHeading>
            <div class="grid grid-cols-8 items-center py-2">
                <Badge color="blue">
                    {hasCredentialAccount
                        ? copy.dashboard_linked_accounts_linked
                        : copy.dashboard_linked_accounts_unlinked}
                </Badge>
                <p class="col-span-6">{copy.dashboard_linked_accounts_credential}</p>
                <div></div>
            </div>

            {accounts
                .filter((a) => a.providerId !== "credential")
                .map((account) => (
                    <form flexRow method="post" action={routes.auth.dashboard}>
                        <input type="hidden" name="action" value={actionName.unlink_account} />
                        <input type="hidden" name="providerId" value={account.providerId} />
                        <div class="grid grid-cols-8 items-center border-y border-border py-2 last:border-b-0">
                            <Badge color="blue">{copy.dashboard_linked_accounts_linked}</Badge>
                            <p class="col-span-6">
                                {account.providerId.charAt(0).toUpperCase() + account.providerId.slice(1)}
                            </p>
                            <Button variant="ghost" type="submit">
                                {copy.dashboard_linked_accounts_unlink}
                            </Button>
                        </div>
                    </form>
                ))}
            {oauthProviders
                .filter((p) => !linkedProviderIds.has(p.id))
                .map((provider) => (
                    <form flexRow method="post" action={routes.auth.dashboard}>
                        <input type="hidden" name="action" value={actionName.link_account} />
                        <input type="hidden" name="provider" value={provider.id} />
                        <div class="grid grid-cols-8 items-center border-y border-border py-2 last:border-b-0">
                            <Badge color="yellow">{copy.dashboard_linked_accounts_unlinked}</Badge>
                            <p class="col-span-6">{provider.label.charAt(0).toUpperCase() + provider.label.slice(1)}</p>
                            <Button variant="ghost" type="submit">
                                {copy.dashboard_linked_accounts_link}
                            </Button>
                        </div>
                    </form>
                ))}
        </Section>
    );
}

function TwoFactorSection({ userEnabled, state }: { userEnabled?: boolean | null; state?: TotpState }) {
    if (userEnabled) {
        return <TwoFactorEnabled state={state} />;
    }
    if (state?.intermediateEnable) {
        return <TwoFactorSetup state={state} />;
    }
    return <TwoFactorDisabled />;
}

function TwoFactorDisabled() {
    return (
        <Section>
            <SectionHeading>{copy.dashboard_2fa_heading}</SectionHeading>
            <p>{copy.dashboard_2fa_description}</p>
            <Form method="post" action={routes.auth.dashboard}>
                <input type="hidden" name="action" value={actionName.two_factor_enable} />
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

function TwoFactorSetup({ state }: { state: TotpState }) {
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
                    errors={state.errors}
                    totpURI={state.totpURI}
                    backupCodes={state.backupCodes}
                    intermediateEnable
                />
            </Section>
            <BackupCodesDisplay codes={state.backupCodes} />
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
        <div class="[&:has(#t1:checked)_#c1]:flex [&:has(#t2:checked)_#c2]:flex [&:has(#t3:checked)_#c3]:flex">
            <input type="radio" name="tabs" id="t1" class="hidden" checked />
            <input type="radio" name="tabs" id="t2" class="hidden" />
            <input type="radio" name="tabs" id="t3" class="hidden" />
            <div class="flex border-b">
                <label htmlFor="t1" class="flex-1 p-2 cursor-pointer text-center">
                    Link
                </label>
                <label htmlFor="t2" class="flex-1 p-2 cursor-pointer text-center">
                    QR
                </label>
                <label htmlFor="t3" class="flex-1 p-2 cursor-pointer text-center">
                    Manual
                </label>
            </div>
            <TwoFactorTotpViewerDetails id="c1">
                <Button>{copy.dashboard_2fa_open_totp_link}</Button>
            </TwoFactorTotpViewerDetails>
            <TwoFactorTotpViewerDetails id="c2">
                <div class="[&_svg]:bg-white [&_svg]:p-2">{raw(generateQrSvg(secret))}</div>
            </TwoFactorTotpViewerDetails>
            <TwoFactorTotpViewerDetails id="c3">
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
            </TwoFactorTotpViewerDetails>
        </div>
    );
}

function TwoFactorTotpViewerDetails({ id, children }: { id: string; children: Child }) {
    return (
        <div id={id} class="hidden h-72 w-full justify-center items-center overflow-y-auto">
            {children}
        </div>
    );
}

function TwoFactorEnabled({ state }: { state?: TotpState }) {
    if (state?.totpURI) {
        return (
            <Section>
                <TwoFactorTotpViewer secret={state.totpURI} />
                <VerifyTotpForm
                    success={state.verified}
                    errors={state.errors}
                    alreadyVerified
                    totpURI={state.totpURI}
                />
                <br />
                <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
            </Section>
        );
    }

    if (state?.backupCodes && state.backupCodes.length > 0) {
        return (
            <Section>
                <BackupCodesDisplay codes={state.backupCodes} />
                <ButtonLink href={routes.auth.dashboard}>{copy.go_back}</ButtonLink>
            </Section>
        );
    }
    return (
        <Section>
            <SectionHeading>{copy.dashboard_2fa_heading}</SectionHeading>
            <FormAlert color="success">{copy.dashboard_2fa_active}</FormAlert>
            <Details title={copy.dashboard_2fa_show_qr} name="2fa-action">
                <Form method="post" action={routes.auth.dashboard}>
                    <input type="hidden" name="action" value={actionName.get_totp_uri} />
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
            <Details title={copy.dashboard_2fa_new_backup_codes} name="2fa-action">
                <Form method="post" action={routes.auth.dashboard}>
                    <input type="hidden" name="action" value={actionName.get_backup_codes} />
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
            <Details title={copy.dashboard_2fa_disable} name="2fa-action">
                <Form method="post" action={routes.auth.dashboard}>
                    <input type="hidden" name="action" value={actionName.two_factor_disable} />
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
    success,
    errors,
    alreadyVerified,
    totpURI,
    backupCodes,
    intermediateEnable,
}: {
    success?: boolean;
    errors?: AppError[];
    alreadyVerified?: boolean;
    totpURI?: string;
    backupCodes?: string[];
    intermediateEnable?: boolean;
}) {
    return (
        <Form method="post" action={routes.auth.dashboard}>
            <input type="hidden" name="action" value={actionName.two_factor_totp_verify} />
            {totpURI && <input type="hidden" name="totp_uri" value={totpURI} />}
            {backupCodes && <input type="hidden" name="backup_codes" value={JSON.stringify(backupCodes)} />}
            <input type="hidden" name="already-verified" value={alreadyVerified ? "true" : "false"} />
            {intermediateEnable && <input type="hidden" name="intermediate_enable" value="true" />}
            <Label for="totp_code">
                {alreadyVerified ? copy.dashboard_2fa_optional_verify : copy.dashboard_2fa_verify_prompt}
            </Label>
            <ErrorAlerts errors={errors} />
            {success && <FormAlert color="success">{copy.dashboard_2fa_success}</FormAlert>}
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

function BackupCodesDisplay({ codes }: { codes: string[] }) {
    return (
        <div class="bg-surface-raised p-4 mb-4">
            <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-fg-faint uppercase tracking-widest">
                    {copy.dashboard_backup_codes_title}
                </p>
            </div>
            <p class="text-xs text-fg-muted mb-3">{copy.dashboard_backup_codes_save}</p>
            <div class="font-mono text-xs grid grid-cols-2 gap-1 select-all">
                {codes.map((code) => (
                    <span class="p-2 bg-surface text-fg text-center">{code}</span>
                ))}
            </div>
        </div>
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
                <Form method="post" action={routes.auth.dashboard}>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            {session.id === current.id && <Badge color="blue">{copy.dashboard_session_current}</Badge>}
                            <p>{session.ipAddress}</p>
                        </div>
                        <Label>{new Date(session.updatedAt).toLocaleString()}</Label>
                    </div>
                    <input type="hidden" name="action" value={actionName.revoke_session} />
                    <input type="hidden" name="session" value={session.token} />
                    <Button variant="ghost" type="submit">
                        {copy.dashboard_session_revoke}
                    </Button>
                </Form>
            ))}
            {sessions.length > 1 && (
                <Form method="post" action={routes.auth.dashboard}>
                    <input type="hidden" name="action" value={actionName.revoke_session} />
                    <input type="hidden" name="session" value="all" />
                    <Button variant="ghost" type="submit">
                        {copy.dashboard_session_revoke_other_sessions}
                    </Button>
                </Form>
            )}
        </Section>
    );
}
