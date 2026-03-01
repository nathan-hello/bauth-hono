import { copy } from "@/lib/copy";
import { actionName } from "@/routes/auth/delete";
import { routes } from "@/routes/routes";
import { TwoFactorState, VerificationTypeSwitcher } from "@/views/auth/2fa";
import { Layout } from "@/views/components/layout";
import {
  Button,
  ButtonLink,
  Form,
  Input,
  Label,
  Section,
} from "@/views/components/ui";

export function DeleteAccountPage({ state }: { state?: TwoFactorState }) {
  return (
    <Layout title={copy.routes.dashboard.title}>
      <div class="w-full max-w-3xl mx-auto py-6 px-4">
        <div class="bg-surface text-fg">
          <header class="px-6 pt-6 pb-5 border-b border-border">
            <p class="uppercase tracking-[0.3em] mb-1">{copy.delete_title}</p>
          </header>
          <Section>
            <p class="text-fg text-center">
              {state
                ? copy.delete_section_header
                : copy.delete_section_header_password_only}
            </p>
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
                </>
              )}
              <Button variant="danger">{copy.delete_confirm_button}</Button>
            </Form>
          </Section>
          <Section>
            <ButtonLink variant="primary">Back to safety</ButtonLink>
          </Section>
        </div>
      </div>
    </Layout>
  );
}
