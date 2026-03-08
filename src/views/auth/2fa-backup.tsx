import { copy } from "@/lib/copy";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts, Form, Label, ButtonLink } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { actions } from "@/routes/auth/2fa-backup";
import { ActionResult } from "@/lib/types";

export type ActionReturnData = {
    result?: ActionResult<typeof actions>;
};

export function TwoFactorBackupPage({ result }: ActionReturnData) {
    return (
        <Layout meta={copy.routes.auth.twoFactorBackup}>
            <Card>
                <Label center for="verify-form">
                    {copy.twofa_prompt_backup}
                </Label>

                <ErrorAlerts errors={result?.action === "top-of-page" ? result.errors : undefined} />

                <BackupCodeVerificationForm result={result} />
            </Card>
        </Layout>
    );
}

function BackupCodeVerificationForm({ result }: { result: ActionReturnData["result"] }) {
    return (
        <>
            <Form
                id="verify-form"
                method="post"
                action={routes.auth.twoFactorBackup}
                result={result}
                formAction={actions.verify_backup_code.name}
            >
                <Input
                    autofocus
                    name="code"
                    minlength={11}
                    maxlength={11}
                    required
                    placeholder={copy.twofa_backup_placeholder}
                    autocomplete="one-time-code"
                />
                <Button type="submit">{copy.continue}</Button>
            </Form>

            <ButtonLink href={routes.auth.twoFactor}>{copy.twofa_use_authenticator}</ButtonLink>

            <FormFooter>
                <TextLink href="/auth/login">{copy.back_to_login}</TextLink>
            </FormFooter>
        </>
    );
}
