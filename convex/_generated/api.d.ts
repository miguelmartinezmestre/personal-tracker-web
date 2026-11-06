/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as cascades from "../cascades.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as email from "../email.js";
import type * as emailSmtp from "../emailSmtp.js";
import type * as features_achievements_definitions from "../features/achievements/definitions.js";
import type * as features_achievements_metrics from "../features/achievements/metrics.js";
import type * as features_achievements_triggers from "../features/achievements/triggers.js";
import type * as features_achievements_validators from "../features/achievements/validators.js";
import type * as features_audit_domainChanges from "../features/audit/domainChanges.js";
import type * as features_audit_log from "../features/audit/log.js";
import type * as features_audit_privacy from "../features/audit/privacy.js";
import type * as features_audit_triggers from "../features/audit/triggers.js";
import type * as features_audit_validators from "../features/audit/validators.js";
import type * as features_auth_accountDeletion from "../features/auth/accountDeletion.js";
import type * as features_auth_accountDeletionPlugin from "../features/auth/accountDeletionPlugin.js";
import type * as features_auth_authRecords from "../features/auth/authRecords.js";
import type * as features_auth_authSchema from "../features/auth/authSchema.js";
import type * as features_auth_options from "../features/auth/options.js";
import type * as features_auth_passwordPolicy from "../features/auth/passwordPolicy.js";
import type * as features_auth_redirects from "../features/auth/redirects.js";
import type * as features_auth_roles from "../features/auth/roles.js";
import type * as features_auth_sessionRecovery from "../features/auth/sessionRecovery.js";
import type * as features_auth_sessions from "../features/auth/sessions.js";
import type * as features_auth_users from "../features/auth/users.js";
import type * as features_auth_validators from "../features/auth/validators.js";
import type * as features_authorization_achievementTableRules from "../features/authorization/achievementTableRules.js";
import type * as features_authorization_authContext from "../features/authorization/authContext.js";
import type * as features_authorization_notificationTableRules from "../features/authorization/notificationTableRules.js";
import type * as features_authorization_objectiveTableRules from "../features/authorization/objectiveTableRules.js";
import type * as features_authorization_organizationTableRules from "../features/authorization/organizationTableRules.js";
import type * as features_authorization_policies from "../features/authorization/policies.js";
import type * as features_authorization_rlsHelpers from "../features/authorization/rlsHelpers.js";
import type * as features_authorization_wrappers from "../features/authorization/wrappers.js";
import type * as features_cascades_organizationDeletion from "../features/cascades/organizationDeletion.js";
import type * as features_cascades_userDeletion from "../features/cascades/userDeletion.js";
import type * as features_cascades_validators from "../features/cascades/validators.js";
import type * as features_categories_constants from "../features/categories/constants.js";
import type * as features_categories_rules from "../features/categories/rules.js";
import type * as features_categories_validators from "../features/categories/validators.js";
import type * as features_dashboard_constants from "../features/dashboard/constants.js";
import type * as features_dashboard_stats from "../features/dashboard/stats.js";
import type * as features_dashboard_validators from "../features/dashboard/validators.js";
import type * as features_email_smtpConfig from "../features/email/smtpConfig.js";
import type * as features_email_templates from "../features/email/templates.js";
import type * as features_notifications_constants from "../features/notifications/constants.js";
import type * as features_notifications_delivery from "../features/notifications/delivery.js";
import type * as features_notifications_inbox from "../features/notifications/inbox.js";
import type * as features_notifications_notices from "../features/notifications/notices.js";
import type * as features_notifications_validators from "../features/notifications/validators.js";
import type * as features_objectives_access from "../features/objectives/access.js";
import type * as features_objectives_constants from "../features/objectives/constants.js";
import type * as features_objectives_deletion from "../features/objectives/deletion.js";
import type * as features_objectives_grants from "../features/objectives/grants.js";
import type * as features_objectives_listing from "../features/objectives/listing.js";
import type * as features_objectives_progress from "../features/objectives/progress.js";
import type * as features_objectives_records from "../features/objectives/records.js";
import type * as features_objectives_rules from "../features/objectives/rules.js";
import type * as features_objectives_stats from "../features/objectives/stats.js";
import type * as features_objectives_validators from "../features/objectives/validators.js";
import type * as features_organizations_personalOrganization from "../features/organizations/personalOrganization.js";
import type * as features_organizations_roles from "../features/organizations/roles.js";
import type * as features_organizations_slug from "../features/organizations/slug.js";
import type * as features_organizations_summaries from "../features/organizations/summaries.js";
import type * as features_organizations_validators from "../features/organizations/validators.js";
import type * as features_setup_rules from "../features/setup/rules.js";
import type * as features_setup_secret from "../features/setup/secret.js";
import type * as features_setup_validators from "../features/setup/validators.js";
import type * as generated_auth from "../generated/auth.js";
import type * as generated_server from "../generated/server.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as objectiveAccess from "../objectiveAccess.js";
import type * as objectives from "../objectives.js";
import type * as organizations from "../organizations.js";
import type * as platformCategories from "../platformCategories.js";
import type * as progress from "../progress.js";
import type * as sessions from "../sessions.js";
import type * as setup from "../setup.js";
import type * as shared_ctx from "../shared/ctx.js";
import type * as shared_env from "../shared/env.js";
import type * as shared_errorCodes from "../shared/errorCodes.js";
import type * as shared_pagination from "../shared/pagination.js";
import type * as shared_paginationLimits from "../shared/paginationLimits.js";
import type * as trash from "../trash.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  admin: typeof admin;
  auth: typeof auth;
  cascades: typeof cascades;
  categories: typeof categories;
  crons: typeof crons;
  dashboard: typeof dashboard;
  email: typeof email;
  emailSmtp: typeof emailSmtp;
  "features/achievements/definitions": typeof features_achievements_definitions;
  "features/achievements/metrics": typeof features_achievements_metrics;
  "features/achievements/triggers": typeof features_achievements_triggers;
  "features/achievements/validators": typeof features_achievements_validators;
  "features/audit/domainChanges": typeof features_audit_domainChanges;
  "features/audit/log": typeof features_audit_log;
  "features/audit/privacy": typeof features_audit_privacy;
  "features/audit/triggers": typeof features_audit_triggers;
  "features/audit/validators": typeof features_audit_validators;
  "features/auth/accountDeletion": typeof features_auth_accountDeletion;
  "features/auth/accountDeletionPlugin": typeof features_auth_accountDeletionPlugin;
  "features/auth/authRecords": typeof features_auth_authRecords;
  "features/auth/authSchema": typeof features_auth_authSchema;
  "features/auth/options": typeof features_auth_options;
  "features/auth/passwordPolicy": typeof features_auth_passwordPolicy;
  "features/auth/redirects": typeof features_auth_redirects;
  "features/auth/roles": typeof features_auth_roles;
  "features/auth/sessionRecovery": typeof features_auth_sessionRecovery;
  "features/auth/sessions": typeof features_auth_sessions;
  "features/auth/users": typeof features_auth_users;
  "features/auth/validators": typeof features_auth_validators;
  "features/authorization/achievementTableRules": typeof features_authorization_achievementTableRules;
  "features/authorization/authContext": typeof features_authorization_authContext;
  "features/authorization/notificationTableRules": typeof features_authorization_notificationTableRules;
  "features/authorization/objectiveTableRules": typeof features_authorization_objectiveTableRules;
  "features/authorization/organizationTableRules": typeof features_authorization_organizationTableRules;
  "features/authorization/policies": typeof features_authorization_policies;
  "features/authorization/rlsHelpers": typeof features_authorization_rlsHelpers;
  "features/authorization/wrappers": typeof features_authorization_wrappers;
  "features/cascades/organizationDeletion": typeof features_cascades_organizationDeletion;
  "features/cascades/userDeletion": typeof features_cascades_userDeletion;
  "features/cascades/validators": typeof features_cascades_validators;
  "features/categories/constants": typeof features_categories_constants;
  "features/categories/rules": typeof features_categories_rules;
  "features/categories/validators": typeof features_categories_validators;
  "features/dashboard/constants": typeof features_dashboard_constants;
  "features/dashboard/stats": typeof features_dashboard_stats;
  "features/dashboard/validators": typeof features_dashboard_validators;
  "features/email/smtpConfig": typeof features_email_smtpConfig;
  "features/email/templates": typeof features_email_templates;
  "features/notifications/constants": typeof features_notifications_constants;
  "features/notifications/delivery": typeof features_notifications_delivery;
  "features/notifications/inbox": typeof features_notifications_inbox;
  "features/notifications/notices": typeof features_notifications_notices;
  "features/notifications/validators": typeof features_notifications_validators;
  "features/objectives/access": typeof features_objectives_access;
  "features/objectives/constants": typeof features_objectives_constants;
  "features/objectives/deletion": typeof features_objectives_deletion;
  "features/objectives/grants": typeof features_objectives_grants;
  "features/objectives/listing": typeof features_objectives_listing;
  "features/objectives/progress": typeof features_objectives_progress;
  "features/objectives/records": typeof features_objectives_records;
  "features/objectives/rules": typeof features_objectives_rules;
  "features/objectives/stats": typeof features_objectives_stats;
  "features/objectives/validators": typeof features_objectives_validators;
  "features/organizations/personalOrganization": typeof features_organizations_personalOrganization;
  "features/organizations/roles": typeof features_organizations_roles;
  "features/organizations/slug": typeof features_organizations_slug;
  "features/organizations/summaries": typeof features_organizations_summaries;
  "features/organizations/validators": typeof features_organizations_validators;
  "features/setup/rules": typeof features_setup_rules;
  "features/setup/secret": typeof features_setup_secret;
  "features/setup/validators": typeof features_setup_validators;
  "generated/auth": typeof generated_auth;
  "generated/server": typeof generated_server;
  http: typeof http;
  notifications: typeof notifications;
  objectiveAccess: typeof objectiveAccess;
  objectives: typeof objectives;
  organizations: typeof organizations;
  platformCategories: typeof platformCategories;
  progress: typeof progress;
  sessions: typeof sessions;
  setup: typeof setup;
  "shared/ctx": typeof shared_ctx;
  "shared/env": typeof shared_env;
  "shared/errorCodes": typeof shared_errorCodes;
  "shared/pagination": typeof shared_pagination;
  "shared/paginationLimits": typeof shared_paginationLimits;
  trash: typeof trash;
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
  objectiveStats: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"objectiveStats">;
  objectiveRanking: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"objectiveRanking">;
};
