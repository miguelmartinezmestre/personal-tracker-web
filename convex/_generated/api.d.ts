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
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as authAuditTriggers from "../authAuditTriggers.js";
import type * as authSchema from "../authSchema.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as domain_achievements_calculations from "../domain/achievements/calculations.js";
import type * as domain_achievements_contributors from "../domain/achievements/contributors.js";
import type * as domain_achievements_definitions from "../domain/achievements/definitions.js";
import type * as domain_audit_privacy from "../domain/audit/privacy.js";
import type * as domain_categories from "../domain/categories.js";
import type * as domain_categories_validators from "../domain/categories/validators.js";
import type * as domain_notifications_deadlineRules from "../domain/notifications/deadlineRules.js";
import type * as domain_notifications_delivery from "../domain/notifications/delivery.js";
import type * as domain_notifications_preferences from "../domain/notifications/preferences.js";
import type * as domain_objectives_categoryResolution from "../domain/objectives/categoryResolution.js";
import type * as domain_objectives_filters from "../domain/objectives/filters.js";
import type * as domain_objectives_list from "../domain/objectives/list.js";
import type * as domain_objectives_metrics from "../domain/objectives/metrics.js";
import type * as domain_objectives_progress from "../domain/objectives/progress.js";
import type * as domain_objectives_workflowSync from "../domain/objectives/workflowSync.js";
import type * as domain_organizations_personalOrganization from "../domain/organizations/personalOrganization.js";
import type * as email from "../email.js";
import type * as emailSmtp from "../emailSmtp.js";
import type * as generated_auth from "../generated/auth.js";
import type * as generated_server from "../generated/server.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as jobs_achievements_checks from "../jobs/achievements/checks.js";
import type * as jobs_audit_pruneAuditLogs from "../jobs/audit/pruneAuditLogs.js";
import type * as jobs_email_smtpDelivery from "../jobs/email/smtpDelivery.js";
import type * as jobs_email_transactional from "../jobs/email/transactional.js";
import type * as jobs_notifications_deadlineNotifications from "../jobs/notifications/deadlineNotifications.js";
import type * as jobs_notifications_markAllRead from "../jobs/notifications/markAllRead.js";
import type * as jobs_objectives_deleteObjective from "../jobs/objectives/deleteObjective.js";
import type * as jobs_objectives_lifecycleCompletion from "../jobs/objectives/lifecycleCompletion.js";
import type * as jobs_objectives_lifecycleWorkflow from "../jobs/objectives/lifecycleWorkflow.js";
import type * as jobs_objectives_syncObjectiveFromProgress from "../jobs/objectives/syncObjectiveFromProgress.js";
import type * as lib_authEnv from "../lib/authEnv.js";
import type * as lib_env from "../lib/env.js";
import type * as notificationPreferences from "../notificationPreferences.js";
import type * as notifications from "../notifications.js";
import type * as objectives from "../objectives.js";
import type * as organizations from "../organizations.js";
import type * as platform_audit_triggers from "../platform/audit/triggers.js";
import type * as platform_email_config from "../platform/email/config.js";
import type * as platform_email_invitationEmail from "../platform/email/invitationEmail.js";
import type * as platform_rls_authContext from "../platform/rls/authContext.js";
import type * as platform_rls_policies from "../platform/rls/policies.js";
import type * as platform_rls_wrappers from "../platform/rls/wrappers.js";
import type * as platform_setup_bootstrap from "../platform/setup/bootstrap.js";
import type * as platform_setup_validators from "../platform/setup/validators.js";
import type * as sessions from "../sessions.js";
import type * as setup from "../setup.js";
import type * as tests_test_helpers from "../tests/test_helpers.js";
import type * as update_progress from "../update_progress.js";
import type * as utils_constants from "../utils/constants.js";
import type * as utils_pagination from "../utils/pagination.js";
import type * as utils_reminderSchedule from "../utils/reminderSchedule.js";
import type * as utils_requiredAdmin from "../utils/requiredAdmin.js";
import type * as utils_validators from "../utils/validators.js";
import type * as workflow from "../workflow.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  admin: typeof admin;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  authAuditTriggers: typeof authAuditTriggers;
  authSchema: typeof authSchema;
  categories: typeof categories;
  crons: typeof crons;
  dashboard: typeof dashboard;
  "domain/achievements/calculations": typeof domain_achievements_calculations;
  "domain/achievements/contributors": typeof domain_achievements_contributors;
  "domain/achievements/definitions": typeof domain_achievements_definitions;
  "domain/audit/privacy": typeof domain_audit_privacy;
  "domain/categories": typeof domain_categories;
  "domain/categories/validators": typeof domain_categories_validators;
  "domain/notifications/deadlineRules": typeof domain_notifications_deadlineRules;
  "domain/notifications/delivery": typeof domain_notifications_delivery;
  "domain/notifications/preferences": typeof domain_notifications_preferences;
  "domain/objectives/categoryResolution": typeof domain_objectives_categoryResolution;
  "domain/objectives/filters": typeof domain_objectives_filters;
  "domain/objectives/list": typeof domain_objectives_list;
  "domain/objectives/metrics": typeof domain_objectives_metrics;
  "domain/objectives/progress": typeof domain_objectives_progress;
  "domain/objectives/workflowSync": typeof domain_objectives_workflowSync;
  "domain/organizations/personalOrganization": typeof domain_organizations_personalOrganization;
  email: typeof email;
  emailSmtp: typeof emailSmtp;
  "generated/auth": typeof generated_auth;
  "generated/server": typeof generated_server;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "jobs/achievements/checks": typeof jobs_achievements_checks;
  "jobs/audit/pruneAuditLogs": typeof jobs_audit_pruneAuditLogs;
  "jobs/email/smtpDelivery": typeof jobs_email_smtpDelivery;
  "jobs/email/transactional": typeof jobs_email_transactional;
  "jobs/notifications/deadlineNotifications": typeof jobs_notifications_deadlineNotifications;
  "jobs/notifications/markAllRead": typeof jobs_notifications_markAllRead;
  "jobs/objectives/deleteObjective": typeof jobs_objectives_deleteObjective;
  "jobs/objectives/lifecycleCompletion": typeof jobs_objectives_lifecycleCompletion;
  "jobs/objectives/lifecycleWorkflow": typeof jobs_objectives_lifecycleWorkflow;
  "jobs/objectives/syncObjectiveFromProgress": typeof jobs_objectives_syncObjectiveFromProgress;
  "lib/authEnv": typeof lib_authEnv;
  "lib/env": typeof lib_env;
  notificationPreferences: typeof notificationPreferences;
  notifications: typeof notifications;
  objectives: typeof objectives;
  organizations: typeof organizations;
  "platform/audit/triggers": typeof platform_audit_triggers;
  "platform/email/config": typeof platform_email_config;
  "platform/email/invitationEmail": typeof platform_email_invitationEmail;
  "platform/rls/authContext": typeof platform_rls_authContext;
  "platform/rls/policies": typeof platform_rls_policies;
  "platform/rls/wrappers": typeof platform_rls_wrappers;
  "platform/setup/bootstrap": typeof platform_setup_bootstrap;
  "platform/setup/validators": typeof platform_setup_validators;
  sessions: typeof sessions;
  setup: typeof setup;
  "tests/test_helpers": typeof tests_test_helpers;
  update_progress: typeof update_progress;
  "utils/constants": typeof utils_constants;
  "utils/pagination": typeof utils_pagination;
  "utils/reminderSchedule": typeof utils_reminderSchedule;
  "utils/requiredAdmin": typeof utils_requiredAdmin;
  "utils/validators": typeof utils_validators;
  workflow: typeof workflow;
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
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
