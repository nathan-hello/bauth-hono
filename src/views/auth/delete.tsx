import { copy } from "@/lib/copy";
import { actionName } from "@/routes/auth/delete";
import { routes } from "@/routes/routes";
import { TwoFactorState } from "@/views/auth/2fa";
import { Layout } from "@/views/components/layout";
import { Button, ButtonLink, Card, Form, Header, Input, Label, Section } from "@/views/components/ui";

export function DeleteAccountPage({
    hasCredential,
    state,
}: {
    hasCredential: boolean;
    state?: TwoFactorState;
}) {
    const headerCopy = hasCredential
        ? state
            ? copy.delete_section_header
            : copy.delete_section_header_password_only
        : state
          ? copy.delete_section_header_2fa_only
          : copy.delete_section_header_confirm;

    return (
        <Layout title={copy.routes.dashboard.title}>
            <TwoFactorSwitchHiddenForm currentType={state?.verificationType} />
            <Card>
                <Header>{copy.delete_title}</Header>
                <Section>
                    <Label center unmuted>
                        {headerCopy}
                    </Label>
                    <Form method="post" action={routes.auth.delete}>
                        <input type="hidden" name="action" value={actionName.delete_account} />

                        {hasCredential && (
                            <>
                                <Label for="password">{copy.input_password}</Label>
                                <Input
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder={copy.dashboard_password_current_placeholder}
                                    required
                                    autocomplete="current-password"
                                />
                            </>
                        )}

                        {state && (
                            <>
                                <Label for="otp">
                                    {state.verificationType === "email"
                                        ? copy.delete_section_2fa_email
                                        : copy.delete_section_2fa_totp}
                                </Label>
                                <input type="hidden" name="otp-type" value={state.verificationType} />
                                <Input
                                    id="otp"
                                    name="otp"
                                    minlength={6}
                                    maxlength={6}
                                    required
                                    placeholder={copy.input_code}
                                    autocomplete="one-time-code"
                                />

                                <TwoFactorSwitch currentType={state?.verificationType} />
                            </>
                        )}

                        <Button type="submit" variant="danger">
                            {copy.delete_confirm_button}
                        </Button>

                        <br />
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

export function DeleteSuccessPage() {
    return (
        <Layout title={copy.routes.dashboard.title}>
            <Card>
                <Header>{copy.delete_title}</Header>
                <Section>
                    <Label center unmuted>
                        {copy.delete_success_header}
                    </Label>
                </Section>
                <Section>
                    <ButtonLink href={routes.index}>{copy.go_home}</ButtonLink>
                </Section>
            </Card>
        </Layout>
    );
}

function TwoFactorSwitchHiddenForm({ currentType }: { currentType: "totp" | "email" | undefined }) {
    if (currentType === undefined) {
        return null;
    }
    return (
        <Form id={actionName.switch_otp} method="post" action={routes.auth.delete}>
            <input type="hidden" name="action" value={actionName.switch_otp} />
            <input type="hidden" name="to" value={currentType === "email" ? "totp" : "email"} />
        </Form>
    );
}

function TwoFactorSwitch({ currentType = "totp" }: { currentType: "totp" | "email" | undefined }) {
    if (!currentType) {
        return null;
    }
    return (
        <Button form={actionName.switch_otp} variant="ghost" type="submit">
            {currentType === "email" ? copy.twofa_switch_to_totp : copy.twofa_switch_to_email}
        </Button>
    );
}
