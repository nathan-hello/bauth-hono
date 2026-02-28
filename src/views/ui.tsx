import type { Child } from "hono/jsx";
import { copy } from "@/lib/copy";
import type { AuthError } from "@/lib/auth-error";

export function Input(props: Record<string, any>) {
  const { class: cls, ...rest } = props;
  return (
    <input
      {...rest}
      class={`w-full h-10 px-4 bg-surface-raised border border-border text-fg text-sm outline-none focus:border-fg-muted ${cls ?? ""}`}
    />
  );
}

type ButtonVariant = "primary" | "ghost";

const buttonBase =
  "h-10 cursor-pointer font-medium text-sm flex gap-3 items-center justify-center px-4";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-surface border-0 disabled:bg-primary/50",
  ghost: "bg-transparent text-fg border border-border",
};

export function Button(props: Record<string, any> & { variant?: ButtonVariant }) {
  const { variant = "primary", class: cls, ...rest } = props;
  return (
    <button
      {...rest}
      class={`${buttonBase} ${buttonVariants[variant]} ${cls ?? ""}`}
    />
  );
}

export function ButtonLink(props: Record<string, any> & { variant?: ButtonVariant }) {
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
    <div class={`lg:w-lg xl:w-xl flex flex-col gap-6 p-4 bg-surface opacity-95 ${props.class ?? ""}`}>
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

export function FormAlert({ message, color }: { message?: string; color?: "danger" | "success" }) {
  if (!message) return null;

  const isSuccess = color === "success";
  const bg = isSuccess ? "bg-success-bg" : "bg-error-bg";
  const fg = isSuccess ? "text-success-fg" : "text-error-fg";

  return (
    <div class={`h-10 flex items-center px-4 ${bg} ${fg} text-left text-xs gap-2`}>
      {isSuccess ? (
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ) : (
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
}

export function ErrorAlerts({ errors }: { errors?: AuthError[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <>
      {errors.map((error) => (
        <FormAlert message={error.type ? (copy.error[error.type] || undefined) : undefined} />
      ))}
    </>
  );
}

export function Badge({ children, color }: { children: Child; color: "green" | "yellow" | "blue" | "gray" }) {
  const styles: Record<string, string> = {
    green: "bg-success/15 text-success",
    yellow: "bg-warning/15 text-warning",
    blue: "bg-info/15 text-info",
    gray: "bg-surface-overlay text-fg-muted",
  };
  return (
    <span class={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-medium ${styles[color]}`}>
      {children}
    </span>
  );
}
