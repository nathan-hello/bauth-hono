import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/types";
import { actionName } from "@/routes/auth/register";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, Form } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { OauthButtons } from "@/views/components/oauth";

type RegisterProps = {
    result?: ActionResult<keyof typeof actionName>;
    email?: string;
};

export function RegisterPage({ result, email }: RegisterProps) {
    return (
        <Layout title={copy.routes.register.title}>
            <Card>
                <div class="max-w-full flex flex-col gap-4 m-0">
                    <Form method="post" action={routes.auth.register} formAction={actionName.register} result={result}>
                        <Input type="text" name="username" required placeholder={copy.input_username} />
                        <Input type="text" name="email" value={email ?? ""} required placeholder={copy.input_email} />
                        <Input
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
                        <Button type="submit">{copy.button_continue}</Button>
                        <FormFooter>
                            <TextLink href={routes.auth.login}>{copy.login_prompt}</TextLink>
                        </FormFooter>
                    </Form>
                    <OauthButtons formAction={routes.auth.register} />
                </div>
            </Card>
            <RegisterEmailDevInfo />
        </Layout>
    );
}

function RegisterEmailDevInfo() {
    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    const emails = ["delivered+user1@resend.dev", "delivered+user2@resend.dev", "delivered+user3@resend.dev"];

    return (
        <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
            <div className="flex flex-col">
                <span>Use one of the following addresses:</span>
                {emails.map((e) => {
                    return (
                        <div key={e} className="flex flex-row justify-between w-full">
                            <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
                                {e}
                            </pre>
                        </div>
                    );
                })}
                <pre className="mt-2 p-2 bg-surface-raised border border-border overflow-auto max-h-64 text-[10px] leading-relaxed">
                    https://resend.com/docs/dashboard/emails/send-test-emails
                </pre>
            </div>
        </pre>
    );
}
