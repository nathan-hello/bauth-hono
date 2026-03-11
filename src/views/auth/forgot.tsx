import { useCopy, type Copy } from "@/lib/copy";
import { type ForgotActionData, type ForgotLoaderData, actions } from "@/routes/auth/forgot";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, Form, Label } from "@/views/components/ui";
import { routes } from "@/routes/routes";

export type ForgotStep = "start" | "code" | "update" | "try-again";

type ForgotProps = {
    loaderData: ForgotLoaderData;
    actionData?: ForgotActionData;
    copy: Copy;
};

export function ForgotPage({ actionData, copy }: ForgotProps) {
    const step = actionData?.state?.step ?? "start";
    const email = actionData?.state?.email;
    const code = actionData?.state?.code;

    return (
        <Layout meta={copy.routes.auth.forgot} copy={copy}>
            <Card>
                <Form method="post" action={routes.auth.forgot} formAction={actions.forgot.name} result={actionData?.result}>
                    {step === "start" && (
                        <>
                            <input type="hidden" name="step" value="start" />
                            <Label center unmuted>
                                {copy.forgot_email_prompt}
                            </Label>
                            <Input autofocus type="email" name="email" required placeholder={copy.email} />
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
                                placeholder={copy.code}
                                autocomplete="one-time-code"
                            />
                            <Form
                                method="post"
                                action={routes.auth.forgot}
                                formAction={actions.forgot.name}
                                kv={{ step: "start", email: email ?? "", resend: "true" }}
                            >
                                <Button variant="ghost" type="submit">
                                    {copy.code_resend}
                                </Button>
                            </Form>
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
                    )}

                    <Button type="submit">{copy.continue}</Button>
                    <FormFooter>
                        <TextLink href="/auth/login">{copy.go_back}</TextLink>
                    </FormFooter>
                </Form>
            </Card>
        </Layout>
    );
}
