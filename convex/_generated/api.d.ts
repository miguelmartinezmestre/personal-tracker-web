/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountDeletionPlugin from "../accountDeletionPlugin.js";
import type * as auditPrivacy from "../auditPrivacy.js";
import type * as auth from "../auth.js";
import type * as authAuditTriggers from "../authAuditTriggers.js";
import type * as authOptions from "../authOptions.js";
import type * as authSchema from "../authSchema.js";
import type * as cascades from "../cascades.js";
import type * as categories from "../categories.js";
import type * as constants from "../constants.js";
import type * as dashboard from "../dashboard.js";
import type * as email from "../email.js";
import type * as emailSmtp from "../emailSmtp.js";
import type * as env from "../env.js";
import type * as generated_auth from "../generated/auth.js";
import type * as generated_server from "../generated/server.js";
import type * as http from "../http.js";
import type * as objectiveRecords from "../objectiveRecords.js";
import type * as objectiveStats from "../objectiveStats.js";
import type * as objectives from "../objectives.js";
import type * as organizations from "../organizations.js";
import type * as pagination from "../pagination.js";
import type * as personalOrganization from "../personalOrganization.js";
import type * as rls_authContext from "../rls/authContext.js";
import type * as rls_organizationTableRules from "../rls/organizationTableRules.js";
import type * as rls_policies from "../rls/policies.js";
import type * as rls_rlsHelpers from "../rls/rlsHelpers.js";
import type * as rls_wrappers from "../rls/wrappers.js";
import type * as setup from "../setup.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountDeletionPlugin: typeof accountDeletionPlugin;
  auditPrivacy: typeof auditPrivacy;
  auth: typeof auth;
  authAuditTriggers: typeof authAuditTriggers;
  authOptions: typeof authOptions;
  authSchema: typeof authSchema;
  cascades: typeof cascades;
  categories: typeof categories;
  constants: typeof constants;
  dashboard: typeof dashboard;
  email: typeof email;
  emailSmtp: typeof emailSmtp;
  env: typeof env;
  "generated/auth": typeof generated_auth;
  "generated/server": typeof generated_server;
  http: typeof http;
  objectiveRecords: typeof objectiveRecords;
  objectiveStats: typeof objectiveStats;
  objectives: typeof objectives;
  organizations: typeof organizations;
  pagination: typeof pagination;
  personalOrganization: typeof personalOrganization;
  "rls/authContext": typeof rls_authContext;
  "rls/organizationTableRules": typeof rls_organizationTableRules;
  "rls/policies": typeof rls_policies;
  "rls/rlsHelpers": typeof rls_rlsHelpers;
  "rls/wrappers": typeof rls_wrappers;
  setup: typeof setup;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  objectiveStats: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"objectiveStats">;
};
