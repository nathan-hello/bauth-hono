import { routes } from "@/routes/routes";
import { actions, type AdminProps, type AdminFilters, type Search } from "@/routes/auth/admin";
import { Layout } from "@/views/components/layout";
import {
    Badge,
    Button,
    ButtonLink,
    Card,
    Details,
    ErrorAlerts,
    Form,
    FormAlert,
    Header,
    Input,
    Label,
    Section,
} from "@/views/components/ui";
import { FullUser } from "@/lib/types";

const textareaClass =
    "w-full min-h-24 px-4 py-3 bg-surface-raised border border-border text-fg outline-none focus:border-fg-muted resize-y";

export function AdminPage(props: AdminProps) {
    const summary = getSummary(props.search);

    return (
        <Layout meta={props.copy.routes.auth.admin} copy={props.copy}>
            <Card class="max-w-[min(96vw,120rem)] gap-0 overflow-hidden">
                <Header>{props.copy.routes.auth.admin.title}</Header>
                <Section>
                    <Badge color="gray">{summary}</Badge>
                    <Form method="get" action={routes.auth.admin}>
                        <Input
                            type="search"
                            name="q"
                            value={props.search.filters.q}
                            placeholder="Search name, email, username, role, or id"
                        />
                        <select
                            name="limit"
                            class="h-12 px-8 bg-surface-raised border border-border text-fg focus:border-fg-muted"
                        >
                            {[25, 50, 100].map((limit) => (
                                <option value={limit} selected={props.search.filters.limit === limit}>
                                    {limit} per page
                                </option>
                            ))}
                        </select>
                        <Button type="submit">Search</Button>
                        <ButtonLink href={routes.auth.admin}>Clear</ButtonLink>
                    </Form>
                </Section>

                {props.result && !props.result.ok && <ErrorAlerts errors={props.result.error} />}

                <Section>
                    {props.search.users.length === 0 ? (
                        <Label center>No users match this query.</Label>
                    ) : (
                        props.search.users.map((user) => (
                            <UserRow key={user.id} user={user} props={props} open={props?.state?.userId === user.id} />
                        ))
                    )}
                </Section>

                <Pagination props={props} />
            </Card>
        </Layout>
    );
}

function UserRow({ props, open, user }: { props: AdminProps; open?: boolean; user: FullUser }) {
    const actionPath = getAdminHref(props.search.filters);

    return (
        <Details name="admin-users" open={open} title={<UserSummary user={user} />}>
            <div class="grid gap-4 lg:grid-cols-2">
                <Panel title="Overview">
                    <div class="grid gap-3 sm:grid-cols-2">
                        <StatusRow label="Name" value={user.name} breakWords />
                        <StatusRow label="Role" value={user.role ?? "user"} breakWords />
                        <StatusRow label="Email" value={user.email} breakWords />
                        <StatusRow label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
                        <StatusRow label="Username" value={user.username ?? "-"} breakWords />
                        <StatusRow label="Display username" value={user.displayUsername ?? "-"} breakWords />
                        <StatusRow label="2FA enabled" value={user.twoFactorEnabled ? "Yes" : "No"} />
                        <StatusRow label="Image" value={user.image ?? "-"} breakWords />
                        <StatusRow label="Created" value={formatDateTime(user.createdAt)} />
                        <StatusRow label="Updated" value={formatDateTime(user.updatedAt)} />
                        <StatusRow label="User ID" value={user.id} />
                    </div>
                </Panel>

                <Panel title="Profile">
                    <Form
                        method="post"
                        action={actionPath}
                        formAction={actions.update_profile.name}
                        kv={{ userId: user.id }}
                    >
                        <Field label="Name">
                            <Input type="text" name="name" value={user.name} required />
                        </Field>
                        <Field label="Email">
                            <Input type="email" name="email" value={user.email} required />
                        </Field>
                        <Field label="Image URL">
                            <Input
                                type="url"
                                name="image"
                                value={user.image ?? ""}
                                placeholder="https://example.com/avatar.png"
                            />
                        </Field>
                        <InlineResult
                            props={props}
                            action={actions.update_profile.name}
                            userId={user.id}
                            success="Profile updated."
                        />
                        <Button type="submit">Save profile</Button>
                    </Form>
                </Panel>

                <Panel title="Handles">
                    <Form
                        method="post"
                        action={actionPath}
                        formAction={actions.update_handles.name}
                        kv={{ userId: user.id }}
                    >
                        <Field label="Username">
                            <Input type="text" name="username" value={user.username ?? ""} required />
                        </Field>
                        <Field label="Display username">
                            <Input
                                type="text"
                                name="display_username"
                                value={user.displayUsername ?? ""}
                                placeholder="Optional public handle"
                            />
                        </Field>
                        <InlineResult
                            props={props}
                            action={actions.update_handles.name}
                            userId={user.id}
                            success="Handles updated."
                        />
                        <Button type="submit">Save handles</Button>
                    </Form>
                </Panel>

                <Panel title="Access">
                    <Form
                        method="post"
                        action={actionPath}
                        formAction={actions.update_role.name}
                        kv={{ userId: user.id }}
                    >
                        <Field label="Role">
                            <Input type="text" name="role" value={user.role ?? "user"} required />
                        </Field>
                        <Label>
                            Supports comma-separated roles. Valid roles here are `admin`, `moderator`, and `user`.
                        </Label>
                        <InlineResult
                            props={props}
                            action={actions.update_role.name}
                            userId={user.id}
                            success="Role updated."
                        />
                        <Button type="submit">Save role</Button>
                    </Form>

                    <br />
                    <div class="grid gap-3 sm:grid-cols-2">
                        <StatusRow label="Banned" value={user.banned ? "Yes" : "No"} />
                        <StatusRow label="2FA enabled" value={user.twoFactorEnabled ? "Yes" : "No"} />
                        <StatusRow label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
                        <StatusRow
                            label="Ban expires"
                            value={user.banExpires ? formatDateTime(user.banExpires) : "Never"}
                        />
                    </div>
                </Panel>

                <Panel title={user.banned ? "Ban Management" : "Ban User"}>
                    {user.banned ? (
                        <div>
                            <Form
                                method="post"
                                action={actionPath}
                                formAction={actions.update_ban.name}
                                kv={{ userId: user.id }}
                            >
                                <Field label="Ban reason">
                                    <textarea name="ban_reason" class={textareaClass} placeholder="Reason for the ban">
                                        {user.banReason ?? ""}
                                    </textarea>
                                </Field>
                                <Field label="Ban expires at">
                                    <Input
                                        type="datetime-local"
                                        name="ban_expires_at"
                                        value={formatDateTimeLocal(user.banExpires)}
                                    />
                                </Field>
                                <InlineResult
                                    props={props}
                                    action={actions.update_ban.name}
                                    userId={user.id}
                                    success="Ban updated."
                                />
                                <Button type="submit">Save ban</Button>
                            </Form>

                            <Form
                                method="post"
                                action={actionPath}
                                formAction={actions.unban_user.name}
                                kv={{ userId: user.id }}
                            >
                                <InlineResult
                                    props={props}
                                    action={actions.unban_user.name}
                                    userId={user.id}
                                    success="User unbanned."
                                />
                                <Button type="submit">Unban user</Button>
                            </Form>
                        </div>
                    ) : (
                        <Form
                            method="post"
                            action={actionPath}
                            formAction={actions.ban_user.name}
                            kv={{ userId: user.id }}
                        >
                            <Field label="Ban reason">
                                <textarea name="ban_reason" class={textareaClass} placeholder="Reason for the ban" />
                            </Field>
                            <Field label="Ban expires at">
                                <Input
                                    type="datetime-local"
                                    name="ban_expires_at"
                                    min={formatDateTimeLocal(new Date())}
                                />
                            </Field>
                            <Button type="submit" variant="danger">
                                Ban user
                            </Button>
                            <InlineResult
                                props={props}
                                action={actions.ban_user.name}
                                userId={user.id}
                                success="User banned."
                            />
                        </Form>
                    )}
                </Panel>
            </div>
        </Details>
    );
}

function UserSummary({ user }: { user: FullUser }) {
    return (
        <div class="flex w-full flex-col gap-3 pr-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-start gap-4 min-w-0">
                <div class="h-12 w-12 rounded-full border border-border bg-surface-raised flex items-center justify-center font-semibold shrink-0">
                    {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div class="min-w-0">
                    <p class="font-semibold text-fg wrap-break-word">{user.name}</p>
                    <p class="text-fg-muted break-all">{user.email}</p>
                    <p class="text-sm text-fg-faint break-all">
                        @{user.username ?? "-"}
                        {user.displayUsername ? ` / ${user.displayUsername}` : ""}
                    </p>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 md:justify-end">
                <Badge color={user.role === "admin" ? "blue" : user.role === "moderator" ? "yellow" : "gray"}>
                    {user.role ?? "user"}
                </Badge>
                <Badge color={user.emailVerified ? "green" : "yellow"}>
                    {user.emailVerified ? "verified" : "unverified"}
                </Badge>
                <Badge color={user.twoFactorEnabled ? "blue" : "gray"}>
                    {user.twoFactorEnabled ? "2FA" : "no 2FA"}
                </Badge>
                <Badge color={user.banned ? "red" : "gray"}>{user.banned ? "banned" : "active"}</Badge>
                <span class="text-xs text-fg-faint whitespace-nowrap">{formatDateTime(user.createdAt)}</span>
            </div>
        </div>
    );
}

function Pagination({ props }: { props: AdminProps }) {
    if (!props.search.hasNextPage && props.search.filters.page === 1) {
        return null;
    }

    const previousHref = getAdminHref({ ...props.search.filters, page: props.search.filters.page - 1 });
    const nextHref = getAdminHref({ ...props.search.filters, page: props.search.filters.page + 1 });

    return (
        <section class="px-6 py-5 border-t border-border bg-surface-raised/60 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-fg-muted">Page {props.search.filters.page}</p>
            <div class="flex gap-3">
                {props.search.filters.page > 1 ? (
                    <a
                        href={previousHref}
                        class="h-12 px-4 border border-border text-fg no-underline flex items-center justify-center"
                    >
                        Previous
                    </a>
                ) : (
                    <span class="h-12 px-4 border border-border text-fg-faint flex items-center justify-center">
                        Previous
                    </span>
                )}
                {props.search.hasNextPage ? (
                    <a
                        href={nextHref}
                        class="h-12 px-4 border border-border text-fg no-underline flex items-center justify-center"
                    >
                        Next
                    </a>
                ) : (
                    <span class="h-12 px-4 border border-border text-fg-faint flex items-center justify-center">
                        Next
                    </span>
                )}
            </div>
        </section>
    );
}

function Panel({ children, class: className, title }: { children: any; class?: string; title: string }) {
    return (
        <section class={`rounded border border-border bg-surface-raised/60 p-4 ${className ?? ""}`}>
            <p class="mb-4 uppercase text-fg-faint">{title}</p>
            {children}
        </section>
    );
}

function Field({ label, children }: { label: string; children: any }) {
    return (
        <label class="flex flex-col gap-2 text-fg-muted">
            <span class="uppercase text-fg-faint">{label}</span>
            {children}
        </label>
    );
}

function StatusRow({ label, value, breakWords }: { label: string; value: string; breakWords?: boolean }) {
    return (
        <div>
            <p class="uppercase text-fg-faint text-sm">{label}</p>
            <p class={`text-fg ${breakWords ? "wrap-break-word" : ""}`}>{value}</p>
        </div>
    );
}

function InlineResult({
    action,
    props,
    success,
    userId,
}: {
    action: string;
    props: AdminProps;
    success: string;
    userId: string;
}) {
    const result = props?.result;
    if (!result || result.meta.action !== action || props?.state?.userId !== userId) {
        return null;
    }

    if (!result.ok) {
        return <ErrorAlerts errors={result.error} />;
    }

    return <FormAlert color="success">{success}</FormAlert>;
}

function getSummary(loaderData: Search) {
    if (loaderData.users.length === 0) {
        return "0 users";
    }

    const start = (loaderData.filters.page - 1) * loaderData.filters.limit + 1;
    const end = start + loaderData.users.length - 1;
    return `Showing ${start}-${end}`;
}

function getAdminHref(filters: AdminFilters) {
    const params = new URLSearchParams();
    if (filters.q) {
        params.set("q", filters.q);
    }
    if (filters.page > 1) {
        params.set("page", filters.page.toString());
    }
    if (filters.limit !== 25) {
        params.set("limit", filters.limit.toString());
    }

    const query = params.toString();
    return query ? `${routes.auth.admin}?${query}` : routes.auth.admin;
}

function formatDateTime(value: Date) {
    return new Date(value).toLocaleString();
}

function formatDateTimeLocal(value: Date | null) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
