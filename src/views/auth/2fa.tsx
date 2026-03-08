import { copy } from "@/lib/copy";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts, Form, Label } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { actions } from "@/routes/auth/2fa";
import { ActionResult } from "@/lib/types";

export type ActionReturnData = {
    result?: ActionResult<typeof actions>;
    verificationType?: "totp" | "email";
};

export type TwoFactorState = {
    verificationType: "totp" | "email";
};

export function TwoFactorPage(state: ActionReturnData | null) {
    const verificationType = state?.verificationType || "totp";

    return (
        <Layout meta={copy.routes.auth.twoFactor}>
            <Card>
                <Label center for="verify-form">
                    {verificationType === "totp" ? copy.twofa_prompt_totp : copy.twofa_prompt_email}
                </Label>

                <ErrorAlerts errors={state?.result?.action === "top-of-page" ? state.result.errors : undefined} />

                {verificationType === "email" && <EmailVerificationForm result={state?.result} />}
                {verificationType === "totp" && <TotpVerificationForm result={state?.result} />}
            </Card>
        </Layout>
    );
}

function EmailVerificationForm({ result }: { result: ActionReturnData["result"] }) {
    return (
        <>
            <Form
                id="verify-form"
                method="post"
                action={routes.auth.twoFactor}
                result={result}
                formAction={actions.verify_email.name}
            >
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

            <Form method="post" action={routes.auth.twoFactor} formAction={actions.resend_email.name} result={result}>
                <Button variant="ghost" type="submit">
                    {copy.code_resend}
                </Button>
            </Form>

            <VerificationTypeSwitcher currentType={"email"} />

            <TextLink href="/auth/login">
                {copy.back_to_login}
            </TextLink>
        </>
    );
}

function TotpVerificationForm({ result }: { result: ActionReturnData["result"] }) {
    return (
        <>
            <Form method="post" action={routes.auth.twoFactor} formAction={actions.verify_totp.name} result={result}>
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
                    {copy.back_to_login}
                </TextLink>
            </FormFooter>
        </>
    );
}

function VerificationTypeSwitcher({ currentType = "totp" }: { currentType: "totp" | "email" }) {
    if (currentType === "email") {
        return (
            <form method="post" action={routes.auth.twoFactor}>
                <input type="hidden" name="action" value={actions.switch.name} />
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
                <input type="hidden" name="action" value={actions.switch.name} />
                <input type="hidden" name="to" value="email" />
                <Button variant="ghost" type="submit">
                    {copy.twofa_switch_to_email}
                </Button>
            </form>
        );
    }
    return null;
}
