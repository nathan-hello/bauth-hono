import { ForgotProps, actions } from "@/routes/auth/forgot";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, Form, Label, ErrorAlerts } from "@/views/components/ui";
import { routes } from "@/routes/routes";

export function ForgotPage({ state, result, copy }: ForgotProps) {
    return (
        <Layout meta={copy.routes.auth.forgot} copy={copy}>
            <Card>
                {state.step === "start" && <StartForm result={result} copy={copy} />}
                {state.step === "email-code" && <EmailCodeForm result={result} copy={copy} state={state} />}
                {state.step === "email-update" && <EmailUpdateForm result={result} copy={copy} state={state} />}
            </Card>
        </Layout>
    );
}

function StartForm({
    result,
    copy,
}: {
    result: ForgotProps["result"];
    copy: ForgotProps["copy"];
}) {
    return (
        <form method="post" action={routes.auth.forgot} class="flex gap-4 pt-4 flex-col">
            <Label center unmuted>
                {copy.forgot_email_prompt}
            </Label>
            <ErrorAlerts errors={getErrors(result, [actions.start_email.name])} />
            <Input autofocus name="identifier" required placeholder={copy.email} autocomplete="username" />
            <Button type="submit" name="action" value={actions.start_email.name}>
                {copy.continue}
            </Button>
            <FormFooter>
                <TextLink href="/auth/login">{copy.go_back}</TextLink>
            </FormFooter>
        </form>
    );
}

function EmailCodeForm({
    result,
    copy,
    state,
}: {
    result: ForgotProps["result"];
    copy: ForgotProps["copy"];
    state: Extract<ForgotProps["state"], { step: "email-code" }>;
}) {
    return (
        <>
            <Form method="post" action={routes.auth.forgot} formAction={actions.email_code.name} result={result}>
            <input type="hidden" name="email" value={state.email} />
            <Label center unmuted>
                {copy.forgot_code_prompt}
            </Label>
            <Input
                autofocus
                name="code"
                minlength={6}
                maxlength={6}
                required
                placeholder={copy.code}
                autocomplete="one-time-code"
            />
            <Button type="submit">{copy.continue}</Button>
            <FormFooter>
                <TextLink href="/auth/login">{copy.go_back}</TextLink>
            </FormFooter>
        </Form>

        <Form method="post" action={routes.auth.forgot} formAction={actions.email_resend.name} kv={{ email: state.email }}>
            <Button variant="ghost" type="submit">
                {copy.code_resend}
            </Button>
        </Form>
    </>
    );
}

function EmailUpdateForm({
    result,
    copy,
    state,
}: {
    result: ForgotProps["result"];
    copy: ForgotProps["copy"];
    state: Extract<ForgotProps["state"], { step: "email-update" }>;
}) {
    return (
        <Form method="post" action={routes.auth.forgot} formAction={actions.email_update.name} result={result}>
            <input type="hidden" name="email" value={state.email} />
            <input type="hidden" name="code" value={state.code} />
            <PasswordFields copy={copy} />
            <Button type="submit">{copy.continue}</Button>
            <FormFooter>
                <TextLink href="/auth/login">{copy.go_back}</TextLink>
            </FormFooter>
        </Form>
    );
}

function PasswordFields({ copy }: Pick<ForgotProps, "copy">) {
    return (
        <>
            <Input
                autofocus
                type="password"
                name="password"
                placeholder={copy.password}
                required
                autocomplete="new-password"
            />
            <Input
                type="password"
                name="repeat"
                required
                placeholder={copy.repeat_password}
                autocomplete="new-password"
            />
        </>
    );
}

function getErrors(result: ForgotProps["result"], actionsForStep: string[]) {
    if (!result || result.ok || !actionsForStep.includes(result.meta.action ?? "")) {
        return undefined;
    }

    return result.error;
}
