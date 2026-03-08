import { copy } from "@/lib/copy";
import { actions } from "@/routes/auth/admin";
import { Layout } from "@/views/components/layout";
import { Button, Card, Header, Badge, Form, Input } from "@/views/components/ui";
import { routes } from "@/routes/routes";
import { auth } from "@/server/auth";
import { UserWithRole } from "better-auth/plugins";

type AdminProps = {
    users?: (typeof auth.$Infer.Session.user & UserWithRole)[];
    error?: string;
};

export function AdminPage({ users, error }: AdminProps) {
    return (
        <Layout meta={copy.routes.auth.admin}>
            <Card>
                <Header>{copy.routes.auth.admin.title}</Header>
                {error && <p class="text-red-500 mb-4">{error}</p>}
                {users && <UserTable users={users} />}
            </Card>
        </Layout>
    );
}

function UserTable({ users }: { users: AdminProps["users"] }) {
    if (!users) {
        return null;
    }
    return (
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead>
                    <tr class="border-b border-border">
                        <th class="py-2 px-3">Email</th>
                        <th class="py-2 px-3">Username</th>
                        <th class="py-2 px-3">Created</th>
                        <th class="py-2 px-3">Status</th>
                        <th class="py-2 px-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} class="border-b border-border">
                            <td class="py-2 px-3">{user.email}</td>
                            <td class="py-2 px-3">
                                <div class="flex flex-row w-full">
                                    <span>{user.username || "-"}</span>
                                    <Form
                                        method="post"
                                        action={routes.auth.admin}
                                        formAction={actions.change_username.name}
                                        kv={{ userId: user.id }}
                                    >
                                        <Input type="text" name="new_username" required />
                                        <Button type="submit">Change username</Button>
                                    </Form>
                                </div>
                            </td>
                            <td class="py-2 px-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td class="py-2 px-3">
                                <div class="flex gap-1">
                                    {user.banned && <Badge color="blue">Banned</Badge>}
                                    {user.emailVerified && <Badge color="green">Verified</Badge>}
                                </div>
                            </td>
                            <td class="py-2 px-3">
                                {user.banned ? (
                                    <Form
                                        method="post"
                                        action={routes.auth.admin}
                                        formAction={actions.unban_user.name}
                                        kv={{
                                            userId: user.id,
                                        }}
                                    >
                                        <Button type="submit" variant="ghost">
                                            Unban
                                        </Button>
                                    </Form>
                                ) : (
                                    <Form
                                        method="post"
                                        action={routes.auth.admin}
                                        formAction={actions.ban_user.name}
                                        kv={{
                                            userId: user.id,
                                        }}
                                    >
                                        <Button type="submit" variant="danger">
                                            Ban
                                        </Button>
                                    </Form>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
