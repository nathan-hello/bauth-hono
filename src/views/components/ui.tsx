import type { Child, JSX, PropsWithChildren } from "hono/jsx";
import { copy } from "@/lib/copy";
import type { AuthError } from "@/lib/auth-error";
import { CircleCheckmark, Exclamation } from "@/views/components/svg";

export function Input(props: Record<string, any>) {
  const { class: cls, ...rest } = props;
  return (
    <input
      {...rest}
      class={`w-full h-10 px-4 bg-surface-raised border border-border text-fg text-sm outline-none focus:border-fg-muted ${cls ?? ""}`}
    />
  );
}

type ButtonVariant = "primary" | "ghost" | "danger";

const buttonBase =
  "h-10 cursor-pointer font-medium text-sm flex gap-3 items-center justify-center px-4";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-surface border-0 disabled:bg-primary/50",
  ghost: "bg-transparent text-fg border border-border",
  danger: "bg-red-800 text-fg border-red-600 disabled:bg-red-500/50",
};

export function Button(
  props: Record<string, any> & { variant?: ButtonVariant },
) {
  const { variant = "primary", class: cls, ...rest } = props;
  return (
    <button
      {...rest}
      class={`${buttonBase} ${buttonVariants[variant]} ${cls ?? ""}`}
    />
  );
}

export function ButtonLink(
  props: Record<string, any> & { variant?: ButtonVariant },
) {
  const { variant = "ghost", class: cls, ...rest } = props;
  return (
    <a
      {...rest}
      class={`${buttonBase} no-underline ${buttonVariants[variant]} ${cls ?? ""}`}
    />
  );
}

export function TextLink(props: Record<string, any>) {
  const { class: cls, ...rest } = props;
  return (
    <a
      {...rest}
      class={`underline underline-offset-2 font-semibold bg-transparent border-0 cursor-pointer text-fg p-0 ${cls ?? ""}`}
    />
  );
}

export function Card(props: { children: Child; class?: string }) {
  return (
    <div
      class={`w-full max-w-3xl flex flex-col gap-6 p-4 bg-surface opacity-95 ${props.class ?? ""}`}
    >
      {props.children}
    </div>
  );
}

export function FormFooter(props: { children: Child }) {
  return (
    <div class="flex gap-4 text-xs items-center justify-center">
      {props.children}
    </div>
  );
}

export function Label(props: { for?: string; children: Child }) {
  return (
    <label for={props.for} class="flex gap-3 flex-col text-xs text-fg-muted">
      {props.children}
    </label>
  );
}

export function Form(props: PropsWithChildren<JSX.IntrinsicElements["form"]>) {
  const { children, class: _className, ...rest } = props;

  return (
    <form class="flex flex-col gap-2 pt-2" {...rest}>
      {children}
    </form>
  );
}

export function FormAlert({
  children,
  color,
}: {
  children: Child;
  color: "danger" | "success" | "warning";
}) {
  let bg: string;
  let fg: string;
  let Svg: Child;
  switch (color) {
    case "danger":
      bg = "bg-error-bg";
      fg = "text-error-fg";
      Svg = Exclamation();
      break;
    case "success":
      bg = "bg-success-bg";
      fg = "text-success-fg";
      Svg = CircleCheckmark();
      break;
    case "warning":
      bg = "bg-warning";
      fg = "text-warning";
      Svg = null;
      break;
  }

  return (
    <div
      class={`h-10 flex items-center ${bg} ${fg} text-left text-sm gap-2`}
    >
      {Svg}
      <span>{children}</span>
    </div>
  );
}

export function ErrorAlerts({ errors }: { errors?: AuthError[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div class="px-6 py-4 flex flex-col gap-2">
      {errors.map((error) => (
        <FormAlert color="danger">
          {error.type ? copy.error[error.type] : copy.error.generic_error}
        </FormAlert>
      ))}
    </div>
  );
}

export function Badge({
  children,
  color,
}: {
  children: Child;
  color: "green" | "yellow" | "blue" | "gray";
}) {
  const styles: Record<string, string> = {
    green: "bg-success/15 text-success",
    yellow: "bg-warning/15 text-warning",
    blue: "bg-info/15 text-info",
    gray: "bg-surface-overlay text-fg-muted",
  };
  return (
    <span
      class={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-medium ${styles[color]}`}
    >
      {children}
    </span>
  );
}

export function Section({ children }: { children: Child }) {
  return <section class="px-6 py-5">{children}</section>;
}

export function SectionHeading({
  children,
  right,
}: {
  children: Child;
  right?: Child;
}) {
  return (
    <div class="flex items-center justify-between mb-4 justify-content-center">
      <h2 class="text-xs font-semibold uppercase tracking-[0.15em] text-fg-faint">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Header({ children }: { children: Child }) {
  return (
    <header class="px-6 pt-6 pb-5 border-b border-border">
      <p class="uppercase tracking-[0.3em] mb-1">{children}</p>
    </header>
  );
}
