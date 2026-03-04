import { copy } from "@/lib/copy";
import type { AppError } from "@/lib/auth-error";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts, FormAlert, Form, Label } from "@/views/components/ui";
import { routes } from "@/routes/routes";

export type TwoFactorState = {
    errors?: AppError[];
    verificationType?: "totp" | "email";
    resentEmail?: boolean;
};

type TwoFactorProps = {
    state?: TwoFactorState;
};

export function TwoFactorPage({ state }: TwoFactorProps) {
    const verificationType = state?.verificationType || "totp";

    return (
        <Layout title={copy.routes["2fa"].title}>
            <Card>
                <Label center for="verify-form">
                    {verificationType === "totp" ? copy.twofa_prompt_totp : copy.twofa_prompt_email}
                </Label>

                <ErrorAlerts errors={state?.errors} />

                {state?.resentEmail && <FormAlert color="success">{copy.twofa_resent_email}</FormAlert>}

                {verificationType === "email" && <EmailVerificationForm />}
                {verificationType === "totp" && <TotpVerificationForm />}
            </Card>
        </Layout>
    );
}

function EmailVerificationForm() {
    return (
        <>
            <Form id="verify-form" method="post" action={routes.auth.twoFactor}>
                <input type="hidden" name="action" value="verify" />
                <input type="hidden" name="type" value="email" />

                <Input
                    autofocus
                    name="code"
                    minlength={6}
                    maxlength={6}
                    required
                    placeholder={copy.input_code}
                    autocomplete="one-time-code"
                />
                <Button type="submit">{copy.button_continue}</Button>
            </Form>

            <form method="post" action={routes.auth.twoFactor}>
                <input type="hidden" name="action" value="resend-email" />
                <Button variant="ghost" type="submit">
                    {copy.code_resend}
                </Button>
            </form>

            <VerificationTypeSwitcher currentType={"email"} />

            <TextLink href="/auth/login">
                {copy.code_return} {copy.login.toLowerCase()}
            </TextLink>
        </>
    );
}

function TotpVerificationForm() {
    return (
        <>
            <Form id="twofa-totp-form" method="post" action={routes.auth.twoFactor}>
                <input type="hidden" name="action" value="verify-totp" />
                <Input
                    autofocus
                    name="code"
                    minlength={6}
                    maxlength={6}
                    required
                    placeholder={copy.input_code}
                    autocomplete="one-time-code"
                />
                <Button type="submit">{copy.button_continue}</Button>
            </Form>

            <VerificationTypeSwitcher currentType={"totp"} />

            <FormFooter>
                <TextLink href="/auth/login">
                    {copy.code_return} {copy.login.toLowerCase()}
                </TextLink>
            </FormFooter>
        </>
    );
}

function VerificationTypeSwitcher({ currentType = "totp" }: { currentType: "totp" | "email" }) {
    if (currentType === "email") {
        return (
            <form method="post" action={routes.auth.twoFactor}>
                <input type="hidden" name="action" value="switch" />
                <input type="hidden" name="to" value="totp" />
                <Button variant="ghost" type="submit">
                    {copy.twofa_switch_to_totp}
                </Button>
            </form>
        );
    }
    if (currentType === "totp") {
        return (
            <form method="post" action={routes.auth.twoFactor}>
                <input type="hidden" name="action" value="switch" />
                <input type="hidden" name="to" value="email" />
                <Button variant="ghost" type="submit">
                    {copy.twofa_switch_to_email}
                </Button>
            </form>
        );
    }
    return null;
}
