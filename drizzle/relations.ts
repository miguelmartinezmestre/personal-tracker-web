import { relations } from "drizzle-orm/relations";
import { user, auditLog, objective, notification, progressUpdate, session, team, teamMember } from "./schema";

export const auditLogRelations = relations(auditLog, ({one}) => ({
	user: one(user, {
		fields: [auditLog.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	auditLogs: many(auditLog),
	notifications: many(notification),
	objectives: many(objective),
	sessions: many(session),
	teamMembers: many(teamMember),
}));

export const notificationRelations = relations(notification, ({one}) => ({
	objective: one(objective, {
		fields: [notification.objectiveId],
		references: [objective.id]
	}),
	user: one(user, {
		fields: [notification.userId],
		references: [user.id]
	}),
}));

export const objectiveRelations = relations(objective, ({one, many}) => ({
	notifications: many(notification),
	user: one(user, {
		fields: [objective.userId],
		references: [user.id]
	}),
	progressUpdates: many(progressUpdate),
}));

export const progressUpdateRelations = relations(progressUpdate, ({one}) => ({
	objective: one(objective, {
		fields: [progressUpdate.objectiveId],
		references: [objective.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const teamMemberRelations = relations(teamMember, ({one}) => ({
	team: one(team, {
		fields: [teamMember.teamId],
		references: [team.id]
	}),
	user: one(user, {
		fields: [teamMember.userId],
		references: [user.id]
	}),
}));

export const teamRelations = relations(team, ({many}) => ({
	teamMembers: many(teamMember),
}));