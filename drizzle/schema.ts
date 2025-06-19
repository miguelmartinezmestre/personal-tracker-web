import { mysqlTable, primaryKey, int, varchar, datetime, double, mysqlEnum, unique, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const auditLog = mysqlTable("AuditLog", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	action: varchar({ length: 191 }).notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "AuditLog_id"}),
]);

export const notification = mysqlTable("Notification", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	objectiveId: int().notNull().references(() => objective.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	read: tinyint().default(0).notNull(),
	notificationType: varchar({ length: 191 }).notNull(),
	notificationDate: datetime({ mode: 'string', fsp: 3 }).notNull(),
	message: varchar({ length: 191 }).notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "Notification_id"}),
]);

export const objective = mysqlTable("Objective", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: varchar({ length: 191 }).notNull(),
	description: varchar({ length: 191 }),
	category: varchar({ length: 191 }),
	targetValue: double().notNull(),
	currentValue: double().notNull(),
	deadline: datetime({ mode: 'string', fsp: 3 }),
	status: varchar({ length: 191 }).notNull(),
	unit: varchar({ length: 191 }),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "Objective_id"}),
]);

export const progressUpdate = mysqlTable("ProgressUpdate", {
	id: int().autoincrement().notNull(),
	objectiveId: int().notNull().references(() => objective.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	updatedValue: double().notNull(),
	updateDate: datetime({ mode: 'string', fsp: 3 }).notNull(),
	comment: varchar({ length: 191 }),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "ProgressUpdate_id"}),
]);

export const session = mysqlTable("Session", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	value: varchar({ length: 191 }).notNull(),
	status: varchar({ length: 191 }).notNull(),
	userAgent: varchar({ length: 191 }).default('').notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "Session_id"}),
]);

export const team = mysqlTable("Team", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 191 }).notNull(),
	description: varchar({ length: 191 }).notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "Team_id"}),
]);

export const teamMember = mysqlTable("TeamMember", {
	id: int().autoincrement().notNull(),
	teamId: int().notNull().references(() => team.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: int().notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	role: mysqlEnum(['MANAGER','MEMBER']).notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "TeamMember_id"}),
]);

export const user = mysqlTable("User", {
	id: int().autoincrement().notNull(),
	email: varchar({ length: 191 }).notNull(),
	password: varchar({ length: 191 }).notNull(),
	username: varchar({ length: 191 }),
	resetPasswordKey: varchar({ length: 191 }),
	role: mysqlEnum(['ADMIN','USER']).default('USER').notNull(),
	createdAt: datetime({ mode: 'string', fsp: 3 }).default(sql`(CURRENT_TIMESTAMP(3))`).notNull(),
	updatedAt: datetime({ mode: 'string', fsp: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "User_id"}),
	unique("User_email_key").on(table.email),
]);
