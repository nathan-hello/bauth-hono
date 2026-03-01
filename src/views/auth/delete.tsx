import { copy } from "@/lib/copy";
import { actionName } from "@/routes/auth/delete";
import { routes } from "@/routes/routes";
import { TwoFactorState, VerificationTypeSwitcher } from "@/views/auth/2fa";
import { Layout } from "@/views/components/layout";
import {
  Button,
  ButtonLink,
  Card,
  Form,
  Header,
  Input,
  Label,
  Section,
  SectionHeading,
} from "@/views/components/ui";

export function DeleteAccountPage({ state }: { state?: TwoFactorState }) {
  return (
    <Layout title={copy.routes.dashboard.title}>
      <Card>
        <Header>{copy.delete_title}</Header>
        <Section>
          <Label center unmuted>
            {state
              ? copy.delete_section_header
              : copy.delete_section_header_password_only}
          </Label>
          <Form method="post" action={routes.auth.dashboard}>
            <input
              type="hidden"
              name="action"
              value={actionName.delete_account}
            />
            <Label for="current">{copy.input_password}</Label>
            <Input
              type="password"
              name="password"
              id="password"
              placeholder={copy.dashboard_password_current_placeholder}
              required
              autocomplete="current-password"
            />

            {state && (
              <>
                <Label for={state.verificationType}>
                  {state.verificationType === "email"
                    ? copy.delete_section_2fa_email
                    : copy.delete_section_2fa_totp}
                </Label>
                <Input
                  name={state.verificationType}
                  minlength={6}
                  maxlength={6}
                  required
                  placeholder={copy.input_code}
                  autocomplete="one-time-code"
                />
                <VerificationTypeSwitcher
                  currentType={state.verificationType}
                />
                <br/>
              </>
            )}
            <Button variant="danger">{copy.delete_confirm_button}</Button>
          </Form>
        </Section>
        <Section>
          <ButtonLink variant="primary">Back to safety</ButtonLink>
        </Section>
      </Card>
    </Layout>
  );
}
