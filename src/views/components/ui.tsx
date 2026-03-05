import type { Child, JSX, PropsWithChildren } from "hono/jsx";
import type { AppError } from "@/lib/auth-error";
import type { ActionResult } from "@/lib/types";
import { ChevronDown, ChevronRight, CircleCheckmark, Exclamation } from "@/views/components/svg";

export function Input(props: Record<string, any>) {
    const { class: cls, ...rest } = props;
    return (
        <input
            {...rest}
            class={`w-full h-12 px-4 bg-surface-raised border border-border text-fg outline-none focus:border-fg-muted ${cls ?? ""}`}
        />
    );
}

type ButtonVariant = "primary" | "ghost" | "danger";

const buttonBase = "h-12 w-full cursor-pointer flex items-center justify-center";

const buttonVariants: Record<ButtonVariant, string> = {
    primary: "bg-primary text-surface border-0 disabled:bg-primary/50",
    ghost: "bg-transparent text-fg border border-border",
    danger: "bg-red-800 text-fg border-red-600 disabled:bg-red-500/50",
};

export function Button(props: Record<string, any> & { variant?: ButtonVariant }) {
    const { variant = "primary", class: cls, ...rest } = props;
    return <button {...rest} class={`${buttonBase} ${buttonVariants[variant]} ${cls ?? ""}`} />;
}

export function ButtonLink(props: Record<string, any> & { variant?: ButtonVariant }) {
    const { variant = "ghost", class: cls, ...rest } = props;
    return <a {...rest} class={`${buttonBase} no-underline ${buttonVariants[variant]} ${cls ?? ""}`} />;
}

export function TextLink({ href, children }: { href: string; children: Child }) {
    return (
        <a href={href} class="mx-auto underline underline-offset-2 font-semibold text-fg text-base">
            {children}
        </a>
    );
}

export function Card(props: { children: Child; class?: string }) {
    return (
        <div class={`w-full max-w-3xl flex flex-col gap-6 p-4 bg-surface opacity-95 ${props.class ?? ""}`}>
            {props.children}
        </div>
    );
}

export function FormFooter(props: { children: Child }) {
    return <div class="flex gap-4 text-xs items-center justify-center">{props.children}</div>;
}

export function Label(props: { for?: string; children: Child; center?: boolean; unmuted?: boolean }) {
    return (
        <label
            for={props.for}
            class={
                "flex gap-3 py-2 flex-col" +
                " " +
                (props?.center ? "mx-auto text-center" : "") +
                " " +
                (props?.unmuted ? "text-fg" : "text-fg-muted")
            }
        >
            {props.children}
        </label>
    );
}

export function Form(
    props: PropsWithChildren<JSX.IntrinsicElements["form"]> & {
        flexRow?: true;
        result?: ActionResult;
        formAction: string;
        success?: string;
        kv?: Record<string, boolean | number | string | undefined>;
    },
) {
    const { children, class: _className, flexRow, result, formAction, success, ...rest } = props;

    const active = result && result.action === formAction;

    return (
        <form class={`flex gap-4 pt-4 ${flexRow ? "flex-row" : "flex-col"}`} {...rest}>
            <input type="hidden" name="action" value={formAction} />
            {props.kv &&
                Object.entries(props.kv).map(([k, v]) => {
                    if (v === undefined) {
                        return null;
                    }
                    return <input type="hidden" name={k} value={v.toString()} />;
                })}
            {active && !result.success && <ErrorAlerts errors={result.errors} />}
            {active && result.success && success && <FormAlert color="success">{success}</FormAlert>}
            {children}
        </form>
    );
}

export function FormAlert({ children, color }: { children: Child; color: "danger" | "success" | "warning" }) {
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
            bg = "bg-surface";
            fg = "text-warning";
            Svg = null;
            break;
    }

    return (
        <div class={`h-12 flex items-center ${bg} ${fg} text-left text-base gap-2 pl-2`}>
            {Svg}
            <span>{children}</span>
        </div>
    );
}

export function ErrorAlerts({ errors }: { errors?: AppError[] }) {
    if (!errors || errors.length === 0) return null;
    return (
        <div class="flex flex-col gap-2">
            {errors.map((error) => (
                <FormAlert color="danger">{error.copy}</FormAlert>
            ))}
        </div>
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
        <span class={`max-w-fit text-center text-sm uppercase tracking-wider px-2 py-0.5 font-medium ${styles[color]}`}>
            {children}
        </span>
    );
}

export function Section({ children }: { children: Child }) {
    return <section class="px-6 py-5 border-b border-border">{children}</section>;
}

export function SectionHeading({ children, right }: { children: Child; right?: Child }) {
    return (
        <div class="flex items-center justify-between mb-4 justify-content-center">
            <h2 class="text-base font-semibold uppercase tracking-[0.15em] text-fg-faint">{children}</h2>
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

export function Divider({ children }: { children: Child }) {
    return <div class="divide-t divide-border-2">{children}</div>;
}

export function Details({ name, title, children }: { name: string; title: Child; children: Child }) {
    return (
        <details name={name} className="group border border-border text-fg py-2 px-3">
            <summary className="flex cursor-pointer list-none items-center justify-between focus:outline-none [&::-webkit-details-marker]:hidden">
                <span>{title}</span>
                <ChevronRight group />
                <ChevronDown group />
            </summary>
            <div className="mt-2 border-t border-border pt-2">{children}</div>
        </details>
    );
}

export function AccountRow({
    name,
    badge,
    badgeColor = "green",
    label,
    children,
}: {
    name: string;
    badge?: string ;
    badgeColor?: "green" | "yellow" | "blue" | "gray" ;
    label: string;
    children: Child;
}) {
    return (
        <Details
            name={name}
            title={
                <span class="flex items-center gap-4">
                    {badge && <Badge color={badgeColor}>{badge}</Badge>}
                    <span>{label}</span>
                </span>
            }
        >
            {children}
        </Details>
    );
}

export function BackupCodes({ title, description, codes }: { title: string; description: string; codes: string[] }) {
    return (
        <div class="bg-surface-raised p-4 mb-4">
            <p class="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-2">{title}</p>
            <p class="text-xs text-fg-muted mb-3">{description}</p>
            <div class="font-mono text-xs grid grid-cols-2 gap-1 select-all">
                {codes.map((code) => (
                    <span class="p-2 bg-surface text-fg text-center">{code}</span>
                ))}
            </div>
        </div>
    );
}

export function TabGroup({ name, tabs }: { name: string; tabs: { id: string; label: string; children: Child }[] }) {
    const rules = tabs
        .map((t) => `#${name}-wrap:has(#${name}-${t.id}:checked) #${name}-c-${t.id} { display: flex; }`)
        .join("\n");
    return (
        <div id={`${name}-wrap`}>
            <style>{rules}</style>
            {tabs.map((t, i) => (
                <input type="radio" name={name} id={`${name}-${t.id}`} class="hidden" checked={i === 0} />
            ))}
            <div class="flex border-b">
                {tabs.map((t) => (
                    <label htmlFor={`${name}-${t.id}`} class="flex-1 p-2 cursor-pointer text-center">
                        {t.label}
                    </label>
                ))}
            </div>
            {tabs.map((t) => (
                <div id={`${name}-c-${t.id}`} class="hidden h-72 w-full justify-center items-center overflow-y-auto">
                    {t.children}
                </div>
            ))}
        </div>
    );
}
