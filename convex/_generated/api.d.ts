/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authAuditTriggers from "../authAuditTriggers.js";
import type * as authSchema from "../authSchema.js";
import type * as cascades from "../cascades.js";
import type * as crons from "../crons.js";
import type * as domain_audit_privacy from "../domain/audit/privacy.js";
import type * as domain_organizations_operational from "../domain/organizations/operational.js";
import type * as domain_organizations_personalOrganization from "../domain/organizations/personalOrganization.js";
import type * as domain_organizations_roles from "../domain/organizations/roles.js";
import type * as domain_organizations_slug from "../domain/organizations/slug.js";
import type * as email from "../email.js";
import type * as emailSmtp from "../emailSmtp.js";
import type * as generated_auth from "../generated/auth.js";
import type * as generated_server from "../generated/server.js";
import type * as http from "../http.js";
import type * as jobs_email_smtpDelivery from "../jobs/email/smtpDelivery.js";
import type * as jobs_email_transactional from "../jobs/email/transactional.js";
import type * as jobs_organizations_cascadeDeletion from "../jobs/organizations/cascadeDeletion.js";
import type * as jobs_organizations_memberLeaveCleanup from "../jobs/organizations/memberLeaveCleanup.js";
import type * as jobs_users_cascadeDeletion from "../jobs/users/cascadeDeletion.js";
import type * as lib_authEnv from "../lib/authEnv.js";
import type * as lib_env from "../lib/env.js";
import type * as organizations from "../organizations.js";
import type * as platform_admin_access from "../platform/admin/access.js";
import type * as platform_audit_triggers from "../platform/audit/triggers.js";
import type * as platform_auth_accessControl from "../platform/auth/accessControl.js";
import type * as platform_auth_accountDeletionPlugin from "../platform/auth/accountDeletionPlugin.js";
import type * as platform_auth_authRuntime from "../platform/auth/authRuntime.js";
import type * as platform_auth_betterAuthOptions from "../platform/auth/betterAuthOptions.js";
import type * as platform_auth_passwordPolicy from "../platform/auth/passwordPolicy.js";
import type * as platform_auth_roles from "../platform/auth/roles.js";
import type * as platform_auth_security from "../platform/auth/security.js";
import type * as platform_db_domainTriggers from "../platform/db/domainTriggers.js";
import type * as platform_db_internalMutation from "../platform/db/internalMutation.js";
import type * as platform_email_config from "../platform/email/config.js";
import type * as platform_email_invitationEmail from "../platform/email/invitationEmail.js";
import type * as platform_rls_authContext from "../platform/rls/authContext.js";
import type * as platform_rls_organizationTableRules from "../platform/rls/organizationTableRules.js";
import type * as platform_rls_policies from "../platform/rls/policies.js";
import type * as platform_rls_rlsHelpers from "../platform/rls/rlsHelpers.js";
import type * as platform_rls_wrappers from "../platform/rls/wrappers.js";
import type * as platform_setup_bootstrap from "../platform/setup/bootstrap.js";
import type * as platform_setup_validators from "../platform/setup/validators.js";
import type * as setup from "../setup.js";
import type * as utils_apiReturnValidators from "../utils/apiReturnValidators.js";
import type * as utils_constants from "../utils/constants.js";
import type * as utils_documentValidators from "../utils/documentValidators.js";
import type * as utils_inputConstraints from "../utils/inputConstraints.js";
import type * as utils_inputValidation from "../utils/inputValidation.js";
import type * as utils_json from "../utils/json.js";
import type * as utils_pagination from "../utils/pagination.js";
import type * as utils_queryTime from "../utils/queryTime.js";
import type * as utils_requiredAdmin from "../utils/requiredAdmin.js";
import type * as utils_validators from "../utils/validators.js";
import type * as utils_visiblePagination from "../utils/visiblePagination.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authAuditTriggers: typeof authAuditTriggers;
  authSchema: typeof authSchema;
  cascades: typeof cascades;
  crons: typeof crons;
  "domain/audit/privacy": typeof domain_audit_privacy;
  "domain/organizations/operational": typeof domain_organizations_operational;
  "domain/organizations/personalOrganization": typeof domain_organizations_personalOrganization;
  "domain/organizations/roles": typeof domain_organizations_roles;
  "domain/organizations/slug": typeof domain_organizations_slug;
  email: typeof email;
  emailSmtp: typeof emailSmtp;
  "generated/auth": typeof generated_auth;
  "generated/server": typeof generated_server;
  http: typeof http;
  "jobs/email/smtpDelivery": typeof jobs_email_smtpDelivery;
  "jobs/email/transactional": typeof jobs_email_transactional;
  "jobs/organizations/cascadeDeletion": typeof jobs_organizations_cascadeDeletion;
  "jobs/organizations/memberLeaveCleanup": typeof jobs_organizations_memberLeaveCleanup;
  "jobs/users/cascadeDeletion": typeof jobs_users_cascadeDeletion;
  "lib/authEnv": typeof lib_authEnv;
  "lib/env": typeof lib_env;
  organizations: typeof organizations;
  "platform/admin/access": typeof platform_admin_access;
  "platform/audit/triggers": typeof platform_audit_triggers;
  "platform/auth/accessControl": typeof platform_auth_accessControl;
  "platform/auth/accountDeletionPlugin": typeof platform_auth_accountDeletionPlugin;
  "platform/auth/authRuntime": typeof platform_auth_authRuntime;
  "platform/auth/betterAuthOptions": typeof platform_auth_betterAuthOptions;
  "platform/auth/passwordPolicy": typeof platform_auth_passwordPolicy;
  "platform/auth/roles": typeof platform_auth_roles;
  "platform/auth/security": typeof platform_auth_security;
  "platform/db/domainTriggers": typeof platform_db_domainTriggers;
  "platform/db/internalMutation": typeof platform_db_internalMutation;
  "platform/email/config": typeof platform_email_config;
  "platform/email/invitationEmail": typeof platform_email_invitationEmail;
  "platform/rls/authContext": typeof platform_rls_authContext;
  "platform/rls/organizationTableRules": typeof platform_rls_organizationTableRules;
  "platform/rls/policies": typeof platform_rls_policies;
  "platform/rls/rlsHelpers": typeof platform_rls_rlsHelpers;
  "platform/rls/wrappers": typeof platform_rls_wrappers;
  "platform/setup/bootstrap": typeof platform_setup_bootstrap;
  "platform/setup/validators": typeof platform_setup_validators;
  setup: typeof setup;
  "utils/apiReturnValidators": typeof utils_apiReturnValidators;
  "utils/constants": typeof utils_constants;
  "utils/documentValidators": typeof utils_documentValidators;
  "utils/inputConstraints": typeof utils_inputConstraints;
  "utils/inputValidation": typeof utils_inputValidation;
  "utils/json": typeof utils_json;
  "utils/pagination": typeof utils_pagination;
  "utils/queryTime": typeof utils_queryTime;
  "utils/requiredAdmin": typeof utils_requiredAdmin;
  "utils/validators": typeof utils_validators;
  "utils/visiblePagination": typeof utils_visiblePagination;
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
};
