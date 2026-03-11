import { useCopy, type Copy } from "@/lib/copy";
import { Layout } from "@/views/components/layout";
import { Card, Input, Button, FormFooter, TextLink, ErrorAlerts, Form, Label, ButtonLink } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { BackupCodeProps, actions } from "@/routes/auth/backup-code";

export function TwoFactorBackupPage(props: BackupCodeProps) {
    return (
        <Layout meta={props.copy.routes.auth.twoFactorBackup} copy={props.copy}>
            <Card>
                <Label center for="verify-form">
                    {props.copy.twofa_prompt_backup}
                </Label>

                <ErrorAlerts
                    errors={props.result && !props.result.ok && props.result?.meta.action === "top-of-page" ? props.result.error : undefined}
                />

                <BackupCodeVerificationForm  {...props}/>
            </Card>
        </Layout>
    );
}

function BackupCodeVerificationForm(props: BackupCodeProps) {
    const copy = useCopy();
    return (
        <>
            <Form
                id="verify-form"
                method="post"
                action={routes.auth.twoFactorBackup}
                result={props.result}
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
