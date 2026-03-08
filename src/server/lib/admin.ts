import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
    ...defaultStatements,
    project: ["chat", "emote", "direct-message", "moderate", "administrate"],
} as const;

const ac = createAccessControl(statement);

const roles = {
    admin: ac.newRole({
        project: ["chat", "direct-message", "moderate", "administrate"],
        ...adminAc.statements,
    }),
    moderator: ac.newRole({
        user: ["ban", "get", "list", "update"],
        project: ["moderate"],
        session: ["list", "revoke", "delete"],
    }),
    user: ac.newRole({
        user: ["list"],
        project: ["chat", "emote"],
    }),
};

export { ac, roles };
