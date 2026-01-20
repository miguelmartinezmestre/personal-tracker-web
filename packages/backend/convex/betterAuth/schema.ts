import { defineSchema } from "convex/server";
import { tables } from "./generatedSchema";

const schema = defineSchema({
  ...tables,

  member: tables.member.index("by_organization_and_user", ["organizationId", "userId"]),
});

export default schema;