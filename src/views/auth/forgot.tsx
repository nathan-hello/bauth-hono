import { copy } from "@/lib/copy";
import type { AppError } from "@/lib/auth-error";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts, Form, Label, ButtonLink } from "@/views/components/ui";
import { routes } from "@/routes/routes";

export type ForgotStep = "start" | "code" | "update" | "try-again";

type ForgotProps = {
    errors?: AppError[];
    email?: string;
    code?: string;
    step: ForgotStep;
};

export function ForgotPage({ errors, email, code, step }: ForgotProps) {
    return (
        <Layout title={copy.routes.forgot.title}>
            <Card>
                <Form method="post" action={routes.auth.forgot}>
                    <ErrorAlerts errors={errors} />

                    {step === "start" && (
                        <>
                            <input type="hidden" name="step" value="start" />
                            <Label center unmuted>
                                {copy.forgot_email_prompt}
                            </Label>
                            <Input autofocus type="email" name="email" required placeholder={copy.input_email} />
                        </>
                    )}

                    {step === "code" && (
                        <>
                            <input type="hidden" name="step" value="code" />
                            <Label center unmuted>
                                {copy.forgot_code_prompt}
                            </Label>
                            <br />
                            <input type="hidden" name="email" value={email ?? ""} />
                            <Input
                                autofocus
                                name="code"
                                minlength={6}
                                maxlength={6}
                                required
                                placeholder={copy.input_code}
                                autocomplete="one-time-code"
                            />
                            <form method="post" action={routes.auth.forgot}>
                                <input type="hidden" name="step" value="start" />
                                <input type="hidden" name="email" value={email ?? ""} />
                                <input type="hidden" name="resend" value="true" />
                                <Button variant="ghost" type="submit">
                                    {copy.code_resend}
                                </Button>
                            </form>
                        </>
                    )}

                    {step === "try-again" && <input type="hidden" name="step" value="try-again" />}

                    {step === "update" && (
                        <>
                            <input type="hidden" name="step" value="update" />
                            <input type="hidden" name="email" value={email ?? ""} />
                            <input type="hidden" name="code" value={code ?? ""} />
                            <Input
                                autofocus
                                type="password"
                                name="password"
                                placeholder={copy.input_password}
                                required
                                autocomplete="new-password"
                            />
                            <Input
                                type="password"
                                name="repeat"
                                required
                                placeholder={copy.input_repeat}
                                autocomplete="new-password"
                            />
                        </>
                    )}

                    <Button type="submit">{copy.button_continue}</Button>
                    <FormFooter>
                        <TextLink href="/auth/login">{copy.go_back}</TextLink>
                    </FormFooter>
                </Form>
            </Card>
        </Layout>
    );
}
