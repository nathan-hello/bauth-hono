import { useCopy } from "@/lib/copy";
import { DeleteProps, actions } from "@/routes/auth/delete";
import { routes } from "@/routes/routes";
import { Layout } from "@/views/components/layout";
import { Button, ButtonLink, Card, Form, Header, Input, Label, Section } from "@/views/components/ui";

export function DeleteAccountPage({ state, result, hasCredential, hasTwoFactor, copy }: DeleteProps) {
    function getHeaderCopy() {
        if (hasCredential && hasTwoFactor) {
            return copy.delete_section_header_password_and_2fa;
        }
        if (hasCredential) {
            return copy.delete_section_header_password_only;
        }
        if (hasTwoFactor) {
            return copy.delete_section_header_2fa_only;
        }
        return copy.delete_section_header_oauth_no_password_or_2fa;
    }

    const headerCopy = getHeaderCopy();

    return (
        <Layout meta={copy.routes.auth.delete} copy={copy}>
            <TwoFactorSwitchHiddenForm state={state} hasTwoFactor={hasTwoFactor} />
            <Card>
                <Header>{copy.routes.auth.delete.title}</Header>
                <Section>
                    <Label center unmuted>
                        {headerCopy}
                    </Label>
                    <Form
                        method="post"
                        action={routes.auth.delete}
                        result={result}
                        formAction={actions.delete_account.name}
                    >
                        {hasCredential && (
                            <>
                                <Label hidden for="password">
                                    {copy.password}
                                </Label>
                                <Input
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder={copy.password_current_placeholder}
                                    required
                                    autocomplete="current-password"
                                />
                            </>
                        )}

                        {hasTwoFactor && (
                            <>
                                <Label for="otp">
                                    {state.verificationType === "email"
                                        ? copy.twofa_prompt_email
                                        : copy.twofa_prompt_totp}
                                </Label>
                                <input type="hidden" name="otp-type" value={state.verificationType} />
                                <Input
                                    id="otp"
                                    name="otp"
                                    minlength={6}
                                    maxlength={6}
                                    required
                                    placeholder={copy.code}
                                    autocomplete="one-time-code"
                                />

                                <TwoFactorSwitch state={state} hasTwoFactor={hasTwoFactor} />
                            </>
                        )}

                        <Button type="submit" variant="danger">
                            {copy.delete_confirm_button}
                        </Button>
                    </Form>
                </Section>
                <Section>
                    <ButtonLink href={routes.auth.dashboard} variant="primary">
                        {copy.delete_go_back}
                    </ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}

export function DeleteSuccessPage({ copy }: { copy: DeleteProps["copy"] }) {
    return (
        <Layout meta={copy.routes.auth.delete} copy={copy}>
            <Card>
                <Header>{copy.routes.auth.delete.title}</Header>
                <Section>
                    <Label center unmuted>
                        {copy.delete_success_header}
                    </Label>
                </Section>
                <Section>
                    <ButtonLink variant="primary" href={routes.index}>
                        {copy.go_home}
                    </ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}

function TwoFactorSwitchHiddenForm({ state, hasTwoFactor }: { state: DeleteProps["state"]; hasTwoFactor: boolean }) {
    if (!hasTwoFactor || !state.verificationType) {
        return null;
    }
    return (
        <Form
            id={actions.switch_otp.name}
            method="post"
            action={routes.auth.delete}
            formAction={actions.switch_otp.name}
            kv={{ to: state.verificationType }}
        />
    );
}

function TwoFactorSwitch({ state, hasTwoFactor }: { state: DeleteProps["state"]; hasTwoFactor: boolean }) {
    const copy = useCopy();
    if (!hasTwoFactor || !state.verificationType) {
        return null;
    }
    return (
        <Button form={actions.switch_otp} variant="ghost" type="submit">
            {state.verificationType === "email" ? copy.twofa_switch_to_totp : copy.twofa_switch_to_email}
        </Button>
    );
}
