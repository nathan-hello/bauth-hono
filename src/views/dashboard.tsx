import { copy } from "../lib/copy";
import type { AuthError } from "../lib/auth-error";
import { Layout } from "./layout";
import { Input, Button, Badge, FormAlert, ErrorAlerts } from "./ui";
import type { Child } from "hono/jsx";

export type DashboardActionData = {
  errors?: AuthError[];
  change_password?: { success: boolean };
  email_verify?: { sent: boolean };
  totp?: TotpState;
};

type Session = {
  id: string;
  ipAddress: string;
  lastLoggedIn: Date;
};

export type DashboardLoaderData = {
  email: { email: string; verified: boolean };
  sessions: { entries: Session[]; current: Session };
  totp: { userEnabled: boolean };
};

type TotpState = {
  intermediateEnable?: boolean;
  totpURI?: string;
  qrSvg?: string;
  backupCodes?: string[];
  userEnabled: boolean;
  verified?: boolean;
  errors?: AuthError[];
};

type DashboardProps = {
  actionData?: DashboardActionData;
  loaderData: DashboardLoaderData;
};

export function DashboardPage({ actionData, loaderData }: DashboardProps) {
  return (
    <Layout title={copy.routes.dashboard.title}>
      <div class="w-full max-w-3xl mx-auto select-text py-6 px-4">
        <div class="bg-surface text-fg">
          <header class="px-6 pt-6 pb-5 border-b border-border">
            <p class="uppercase tracking-[0.3em] mb-1">{copy.dashboard_title}</p>
          </header>

          <div class="px-6 py-4 flex flex-col gap-2">
            <ErrorAlerts errors={actionData?.errors} />
            {actionData?.change_password?.success && (
              <FormAlert color="success" message={copy.dashboard_password_changed} />
            )}
          </div>

          <div class="divide-y divide-border">
            <EmailSection
              email={loaderData.email}
              verificationSent={actionData?.email_verify?.sent}
            />
            <PasswordSection />
            <TwoFactorSection state={{ ...loaderData.totp, ...actionData?.totp }} />
            <SessionsSection
              sessions={loaderData.sessions.entries}
              current={loaderData.sessions.current}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SectionHeading({ children, right }: { children: Child; right?: Child }) {
  return (
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xs font-semibold uppercase tracking-[0.15em] text-fg-faint">
        {children}
      </h2>
      {right}
    </div>
  );
}

function EmailSection({
  email,
  verificationSent,
}: {
  email: { email: string; verified: boolean };
  verificationSent?: boolean;
}) {
  return (
    <section class="px-6 py-5">
      <SectionHeading
        right={
          <Badge color={email.verified ? "green" : "yellow"}>
            {email.verified
              ? copy.dashboard_email_verified_badge
              : copy.dashboard_email_unverified_badge}
          </Badge>
        }
      >
        {copy.dashboard_email_heading}
      </SectionHeading>

      <p class="text-sm mb-5">{email.email}</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!email.verified && (
          <form method="post" action="/auth/dashboard" class="flex flex-col gap-2">
            <input type="hidden" name="action" value="email_resend_verification" />
            <label class="text-xs text-fg-muted">
              {verificationSent
                ? copy.dashboard_email_verification_sent
                : copy.dashboard_email_unverified_prompt}
            </label>
            <Button disabled={verificationSent} type="submit">
              {copy.dashboard_email_resend_verification}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

function PasswordSection() {
  return (
    <section class="px-6 py-5">
      <SectionHeading>{copy.dashboard_password_heading}</SectionHeading>
      <form method="post" action="/auth/dashboard" class="flex flex-col gap-2 max-w-sm">
        <input type="hidden" name="action" value="change_password" />

        <label for="current" class="text-xs text-fg-muted">
          {copy.dashboard_password_current_label}
        </label>
        <Input
          type="password"
          name="current"
          id="current"
          placeholder={copy.dashboard_password_current_placeholder}
          required
          autocomplete="current-password"
        />

        <label for="new_password" class="text-xs text-fg-muted">
          {copy.dashboard_password_new_label}
        </label>
        <Input
          type="password"
          name="new_password"
          id="new_password"
          placeholder={copy.dashboard_password_new_placeholder}
          required
          autocomplete="new-password"
        />

        <label for="new_password_repeat" class="text-xs text-fg-muted">
          {copy.dashboard_password_repeat_label}
        </label>
        <Input
          type="password"
          name="new_password_repeat"
          id="new_password_repeat"
          placeholder={copy.dashboard_password_repeat_placeholder}
          required
          autocomplete="new-password"
        />

        <Button type="submit">{copy.dashboard_password_change}</Button>
      </form>
    </section>
  );
}

const summaryClass =
  "cursor-pointer list-none text-sm font-medium py-2 px-3 border border-border text-fg [&::-webkit-details-marker]:hidden";

function TwoFactorSection({ state }: { state?: TotpState }) {
  if (state?.userEnabled) {
    return <TwoFactorEnabled state={state} />;
  }

  if (state?.intermediateEnable) {
    return <TwoFactorSetup state={state} />;
  }

  return <TwoFactorDisabled />;
}

function TwoFactorDisabled() {
  return (
    <section class="px-6 py-5">
      <SectionHeading>{copy.dashboard_2fa_heading}</SectionHeading>
      <p class="text-sm text-fg-muted mb-4">{copy.dashboard_2fa_description}</p>
      <form method="post" action="/auth/dashboard" class="flex flex-col gap-2 max-w-sm">
        <input type="hidden" name="action" value="2fa_enable" />
        <Input
          type="password"
          name="password"
          placeholder={copy.input_password}
          required
          autocomplete="current-password"
        />
        <Button type="submit">{copy.dashboard_2fa_enable}</Button>
      </form>
    </section>
  );
}

function TwoFactorSetup({ state }: { state: TotpState }) {
  return (
    <section class="px-6 py-5">
      <SectionHeading
        right={
          <Badge color="green">{copy.dashboard_2fa_enabled_badge}</Badge>
        }
      >
        {copy.dashboard_2fa_heading}
      </SectionHeading>
      <p class="text-sm text-warning mb-4">{copy.dashboard_2fa_setup_prompt}</p>

      {state.totpURI && (
        <div class="mb-5">
          {state.qrSvg && (
            <div class="inline-flex px-8 py-2 w-fit h-full bg-surface-raised mb-4">
              <div class="w-64 h-80 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: state.qrSvg }} />
            </div>
          )}
          <div class="mb-4">
            <a
              href={state.totpURI}
              class="h-10 cursor-pointer font-medium text-sm flex gap-3 items-center justify-center px-4 bg-primary text-surface border-0 no-underline max-w-sm"
            >
              {copy.totp_open_app}
            </a>
          </div>
          <VerifyTotpForm
            errors={state.errors}
            totpURI={state.totpURI}
            backupCodes={state.backupCodes}
            intermediateEnable
          />
        </div>
      )}

      {state.backupCodes && state.backupCodes.length > 0 && (
        <BackupCodesDisplay codes={state.backupCodes} />
      )}
    </section>
  );
}

function TwoFactorEnabled({ state }: { state: TotpState }) {
  return (
    <section class="px-6 py-5">
      <SectionHeading
        right={
          <Badge color="green">{copy.dashboard_2fa_enabled_badge}</Badge>
        }
      >
        {copy.dashboard_2fa_heading}
      </SectionHeading>
      <p class="text-sm text-success mb-4">{copy.dashboard_2fa_active}</p>

      <div class="flex flex-col gap-2 mt-5 pt-5 border-t border-border-muted max-w-sm">
        {state.totpURI ? (
          <div class="mb-5">
            {state.qrSvg && (
              <div class="inline-flex px-8 py-2 w-fit h-full bg-surface-raised mb-4">
                <div class="w-64 h-80 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: state.qrSvg }} />
              </div>
            )}
            {state.verified ? (
              <p class="text-sm text-success">{copy.dashboard_2fa_success}</p>
            ) : (
              <VerifyTotpForm errors={state.errors} optionalCopy totpURI={state.totpURI} />
            )}
          </div>
        ) : (
          <details name="2fa-action">
            <summary class={summaryClass}>{copy.dashboard_2fa_show_qr}</summary>
            <form method="post" action="/auth/dashboard" class="flex flex-col gap-2 pt-2">
              <input type="hidden" name="action" value="get_totp_uri" />
              <Input
                type="password"
                name="password"
                placeholder={copy.input_password}
                required
                autocomplete="current-password"
              />
              <Button type="submit">{copy.dashboard_2fa_show_qr}</Button>
            </form>
          </details>
        )}

        {state.backupCodes && state.backupCodes.length > 0 ? (
          <BackupCodesDisplay codes={state.backupCodes} />
        ) : (
          <details name="2fa-action">
            <summary class={summaryClass}>{copy.dashboard_2fa_new_backup_codes}</summary>
            <form method="post" action="/auth/dashboard" class="flex flex-col gap-2 pt-2">
              <input type="hidden" name="action" value="get_backup_codes" />
              <Input
                type="password"
                name="password"
                placeholder={copy.input_password}
                required
                autocomplete="current-password"
              />
              <Button type="submit">{copy.dashboard_2fa_new_backup_codes}</Button>
            </form>
          </details>
        )}

        <details name="2fa-action">
          <summary class={summaryClass}>{copy.dashboard_2fa_disable}</summary>
          <form method="post" action="/auth/dashboard" class="flex flex-col gap-2 pt-2">
            <input type="hidden" name="action" value="2fa_disable" />
            <Input
              type="password"
              name="password"
              placeholder={copy.input_password}
              required
              autocomplete="current-password"
            />
            <Button type="submit">{copy.dashboard_2fa_disable}</Button>
          </form>
        </details>
      </div>
    </section>
  );
}

function VerifyTotpForm({
  errors,
  optionalCopy,
  totpURI,
  backupCodes,
  intermediateEnable,
}: {
  errors?: AuthError[];
  optionalCopy?: boolean;
  totpURI?: string;
  backupCodes?: string[];
  intermediateEnable?: boolean;
}) {
  return (
    <form method="post" action="/auth/dashboard" class="flex flex-col gap-2 max-w-sm">
      <input type="hidden" name="action" value="2fa_totp_verify" />
      {totpURI && <input type="hidden" name="totp_uri" value={totpURI} />}
      {backupCodes && (
        <input type="hidden" name="backup_codes" value={JSON.stringify(backupCodes)} />
      )}
      {intermediateEnable && <input type="hidden" name="intermediate_enable" value="true" />}

      <label for="totp_code" class="text-xs text-fg-muted">
        {optionalCopy ? copy.dashboard_2fa_optional_verify : copy.dashboard_2fa_verify_prompt}
      </label>
      <ErrorAlerts errors={errors} />
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
    </form>
  );
}

function BackupCodesDisplay({ codes }: { codes: string[] }) {
  return (
    <div class="bg-surface-raised p-4 mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-semibold text-fg-faint uppercase tracking-[0.1em]">
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

function SessionsSection({ sessions, current }: { sessions: Session[]; current: Session }) {
  return (
    <section class="px-6 py-5">
      <SectionHeading>{copy.dashboard_sessions_heading}</SectionHeading>

      {sessions.length > 0 ? (
        <>
          <div class="divide-y divide-border-muted">
            {sessions.map((session) => (
              <div class="flex items-center justify-between py-2.5 first:pt-0 gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm truncate">{session.ipAddress}</p>
                    {session.id === current.id && (
                      <Badge color="blue">{copy.dashboard_session_current}</Badge>
                    )}
                  </div>
                  <p class="text-xs text-fg-muted mt-0.5">
                    {new Date(session.lastLoggedIn).toLocaleString()}
                  </p>
                </div>
                <form method="post" action="/auth/dashboard">
                  <input type="hidden" name="action" value="revoke_session" />
                  <input type="hidden" name="session" value={session.id} />
                  <Button variant="ghost" type="submit" class="text-xs px-3">
                    {copy.dashboard_session_revoke}
                  </Button>
                </form>
              </div>
            ))}
          </div>
          {sessions.length > 1 && (
            <form method="post" action="/auth/dashboard" class="mt-3">
              <input type="hidden" name="action" value="revoke_session" />
              <input type="hidden" name="session" value="all" />
              <Button variant="ghost" type="submit">
                {copy.dashboard_session_revoke_all}
              </Button>
            </form>
          )}
        </>
      ) : (
        <p class="text-sm text-fg-muted">{copy.dashboard_sessions_empty}</p>
      )}
    </section>
  );
}
