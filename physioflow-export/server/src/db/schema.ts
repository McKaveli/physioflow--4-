import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
};

// ─────────────────────────────────────────────────────────────────────────
// Users & auth
// ─────────────────────────────────────────────────────────────────────────

export const ROLES = ["PATIENT", "PHYSIOTHERAPIST", "CLINIC_ADMIN", "MANAGER"] as const;
export type Role = (typeof ROLES)[number];

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  // Nullable: a patient created by an admin has no password until they accept their
  // invitation and set one — see modules/patients/invitations.ts.
  passwordHash: text("password_hash"),
  role: text("role", { enum: ROLES }).notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: id(),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Clinic & staff
// ─────────────────────────────────────────────────────────────────────────

export const clinics = sqliteTable("clinics", {
  id: id(),
  orgCode: text("org_code").notNull().unique(),
  name: text("name").notNull(),
  city: text("city"),
  address: text("address"),
  phone: text("phone"),
  currency: text("currency").notNull().default("GHS"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const clinicAdmins = sqliteTable(
  "clinic_admins",
  {
    id: id(),
    clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => ({ uniqPair: unique().on(t.clinicId, t.userId) })
);

export const managers = sqliteTable(
  "managers",
  {
    id: id(),
    clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => ({ uniqPair: unique().on(t.clinicId, t.userId) })
);

export const physiotherapists = sqliteTable("physiotherapists", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  specialty: text("specialty"),
  bio: text("bio"),
  licenseNo: text("license_no"),
  yearsExperience: integer("years_experience"),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Patients
// ─────────────────────────────────────────────────────────────────────────

export const PATIENT_STATUSES = ["PENDING_ONBOARDING", "ACTIVE", "INACTIVE", "TREATMENT_COMPLETED", "DISCHARGED"] as const;

export const patients = sqliteTable("patients", {
  id: id(),
  patientCode: text("patient_code").notNull().unique(), // human-readable, e.g. "PF-000123"
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  primaryPhysioId: text("primary_physio_id").references(() => physiotherapists.id),
  status: text("status", { enum: PATIENT_STATUSES }).notNull().default("PENDING_ONBOARDING"),
  dateOnboarded: integer("date_onboarded", { mode: "timestamp" }),
  profession: text("profession"),
  dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),
  gender: text("gender"),
  condition: text("condition"),
  emergencyContact: text("emergency_contact"),
  // Clinical intake, captured by the admin at registration time (AGENT.md §4)
  presentingComplaint: text("presenting_complaint"),
  bodyArea: text("body_area"),
  dateOfInjury: integer("date_of_injury", { mode: "timestamp" }),
  referringSource: text("referring_source"),
  intakeNotes: text("intake_notes"),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────────────────

export const APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export const appointments = sqliteTable("appointments", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  physioId: text("physio_id").notNull().references(() => physiotherapists.id, { onDelete: "cascade" }),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: APPOINTMENT_STATUSES }).notNull().default("PENDING"),
  treatmentFocus: text("treatment_focus"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"), // mandatory when CANCELLED
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const APPT_REQUEST_STATUSES = ["PENDING", "APPROVED", "DECLINED", "WITHDRAWN"] as const;

export const appointmentRequests = sqliteTable("appointment_requests", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  physioId: text("physio_id").references(() => physiotherapists.id, { onDelete: "set null" }),
  requestedDate: integer("requested_date", { mode: "timestamp" }).notNull(),
  preferredTimeNote: text("preferred_time_note"),
  reason: text("reason"),
  status: text("status", { enum: APPT_REQUEST_STATUSES }).notNull().default("PENDING"),
  resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  declineReason: text("decline_reason"),
  // When approved, the created appointment id is stored here
  appointmentId: text("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  ...timestamps,
});

export const RESCHEDULE_REQUEST_STATUSES = ["PENDING", "APPROVED", "DECLINED", "WITHDRAWN"] as const;

export const rescheduleRequests = sqliteTable("reschedule_requests", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  requestedDate: integer("requested_date", { mode: "timestamp" }).notNull(),
  preferredTimeNote: text("preferred_time_note"),
  reason: text("reason"),
  status: text("status", { enum: RESCHEDULE_REQUEST_STATUSES }).notNull().default("PENDING"),
  resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  declineReason: text("decline_reason"),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Treatment plans & exercises
// ─────────────────────────────────────────────────────────────────────────

export const TREATMENT_PLAN_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;

export const treatmentPlans = sqliteTable("treatment_plans", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  physioId: text("physio_id").notNull().references(() => physiotherapists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  goals: text("goals").notNull(), // JSON-encoded string[]
  status: text("status", { enum: TREATMENT_PLAN_STATUSES }).notNull().default("DRAFT"),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),
  frequency: text("frequency"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const DIFFICULTY_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export const exercises = sqliteTable("exercises", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bodyArea: text("body_area").notNull(),
  difficulty: text("difficulty", { enum: DIFFICULTY_LEVELS }).notNull().default("BEGINNER"),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(), // physiotherapist's own written instructions — never generated
  safetyNotes: text("safety_notes"),
  mediaUrl: text("media_url"), // uploaded video/image file, served via authenticated route
  youtubeUrl: text("youtube_url"), // embedded as-is, never downloaded/re-hosted
  defaultSets: integer("default_sets"),
  defaultReps: integer("default_reps"),
  defaultDurationSec: integer("default_duration_sec"),
  defaultRestSec: integer("default_rest_sec"),
  ...timestamps,
});

export const EXERCISE_ASSIGNMENT_STATUSES = ["ACTIVE", "COMPLETED", "PAUSED"] as const;

export const exerciseAssignments = sqliteTable("exercise_assignments", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  treatmentPlanId: text("treatment_plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull().references(() => exercises.id),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  sets: integer("sets"),
  reps: integer("reps"),
  durationSec: integer("duration_sec"),
  restSec: integer("rest_sec"),
  frequency: text("frequency"),
  instructions: text("instructions"),
  status: text("status", { enum: EXERCISE_ASSIGNMENT_STATUSES }).notNull().default("ACTIVE"),
  ...timestamps,
});

export const EXERCISE_COMPLETION_STATES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const;

export const exerciseCompletions = sqliteTable("exercise_completions", {
  id: id(),
  exerciseAssignmentId: text("exercise_assignment_id").notNull().references(() => exerciseAssignments.id, { onDelete: "cascade" }),
  date: integer("date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  state: text("state", { enum: EXERCISE_COMPLETION_STATES }).notNull().default("NOT_STARTED"),
  setsCompleted: integer("sets_completed"),
  painLevel: integer("pain_level"),
  difficultyRating: integer("difficulty_rating"),
  notes: text("notes"),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Recovery tracking & session notes
// ─────────────────────────────────────────────────────────────────────────

export const recoveryLogs = sqliteTable("recovery_logs", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  date: integer("date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  painLevel: integer("pain_level"),
  mobility: integer("mobility"),
  mood: integer("mood"),
  notes: text("notes"),
  ...timestamps,
});

export const sessionNotes = sqliteTable("session_notes", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  physioId: text("physio_id").notNull().references(() => physiotherapists.id, { onDelete: "cascade" }),
  date: integer("date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  summary: text("summary").notNull(),
  observations: text("observations"),
  treatmentPerformed: text("treatment_performed"),
  patientResponse: text("patient_response"),
  nextSteps: text("next_steps"),
  ...timestamps,
});

export const patientDischarges = sqliteTable("patient_discharges", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().unique().references(() => patients.id, { onDelete: "cascade" }),
  physioId: text("physio_id").notNull().references(() => physiotherapists.id),
  dischargedByUserId: text("discharged_by_user_id").notNull().references(() => users.id),
  treatmentOutcome: text("treatment_outcome").notNull(),
  finalClinicalNotes: text("final_clinical_notes").notNull(),
  treatmentGoalsStatus: text("treatment_goals_status").notNull(),
  sessionsCompleted: integer("sessions_completed").notNull(),
  dischargeReason: text("discharge_reason").notNull(),
  finalProgress: text("final_progress").notNull(),
  followUpRecommendations: text("follow_up_recommendations"),
  dischargedAt: integer("discharged_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────────────────

export const INVENTORY_CATEGORIES = ["INJECTION", "TABLET", "OINTMENT", "OTHER_SUPPLY"] as const;

export const inventoryItems = sqliteTable("inventory_items", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: INVENTORY_CATEGORIES }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull().default("unit"), // e.g. "vial", "tablet", "tube"
  minStockThreshold: integer("min_stock_threshold").notNull().default(5),
  supplier: text("supplier"),
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
  batchNumber: text("batch_number"),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const INVENTORY_MOVEMENT_TYPES = ["ADDED", "REMOVED", "ADJUSTED", "EXPIRED"] as const;

export const inventoryMovements = sqliteTable("inventory_movements", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  type: text("type", { enum: INVENTORY_MOVEMENT_TYPES }).notNull(),
  quantityDelta: integer("quantity_delta").notNull(), // signed: -5 for dispensed, +20 for restock
  reason: text("reason").notNull(),
  recordedByUserId: text("recorded_by_user_id").notNull().references(() => users.id),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Patient invitations
// ─────────────────────────────────────────────────────────────────────────

export const invitationTokens = sqliteTable("invitation_tokens", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  // Only a hash is stored — the raw token is shown to the admin once and never persisted,
  // so a database read can never leak a usable invitation link.
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Audit log
// ─────────────────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = [
  "PATIENT_CREATED",
  "PATIENT_UPDATED",
  "APPOINTMENT_CREATED",
  "APPOINTMENT_CHANGED",
  "APPOINTMENT_CANCELLED",
  "EXERCISE_CREATED",
  "EXERCISE_ASSIGNED",
  "INVENTORY_ADJUSTED",
  "STAFF_INVITED",
  "PATIENT_INVITATION_SENT",
  "PATIENT_INVITATION_ACCEPTED",
  "PATIENT_DISCHARGED",
] as const;

export const auditLogs = sqliteTable("audit_logs", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  actorUserId: text("actor_user_id").references(() => users.id),
  action: text("action", { enum: AUDIT_ACTIONS }).notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  metadata: text("metadata"), // JSON-encoded, non-sensitive summary only
  ...timestamps,
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  patient: one(patients, { fields: [sessionNotes.patientId], references: [patients.id] }),
  physio: one(physiotherapists, { fields: [sessionNotes.physioId], references: [physiotherapists.id] }),
}));

export const patientDischargesRelations = relations(patientDischarges, ({ one }) => ({
  patient: one(patients, { fields: [patientDischarges.patientId], references: [patients.id] }),
  physio: one(physiotherapists, { fields: [patientDischarges.physioId], references: [physiotherapists.id] }),
  dischargedBy: one(users, { fields: [patientDischarges.dischargedByUserId], references: [users.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────
// Messaging
// ─────────────────────────────────────────────────────────────────────────

export const conversations = sqliteTable("conversations", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const messages = sqliteTable("messages", {
  id: id(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  readAt: integer("read_at", { mode: "timestamp" }),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────

export const PAYMENT_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] as const;
export const PAYMENT_METHODS = ["MOBILE_MONEY", "CARD", "CASH"] as const;

export const payments = sqliteTable("payments", {
  id: id(),
  clinicId: text("clinic_id").notNull().references(() => clinics.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  appointmentId: text("appointment_id").unique().references(() => appointments.id),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("GHS"),
  method: text("method", { enum: PAYMENT_METHODS }).notNull(),
  status: text("status", { enum: PAYMENT_STATUSES }).notNull().default("PENDING"),
  providerRef: text("provider_ref"),
  purpose: text("purpose"),
  recordedByUserId: text("recorded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// ─────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = [
  "APPOINTMENT_SCHEDULED",
  "APPOINTMENT_CHANGED",
  "APPOINTMENT_CANCELLED",
  "EXERCISE_ASSIGNED",
  "EXERCISE_REMINDER",
  "TREATMENT_PLAN_UPDATED",
  "PATIENT_INVITATION",
  "NEW_MESSAGE",
  "PAYMENT_CONFIRMATION",
  "INVENTORY_LOW_STOCK",
] as const;

export const notifications = sqliteTable("notifications", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: integer("read_at", { mode: "timestamp" }),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────────────────
// Relations (for Drizzle's relational query API)
// ─────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
  physiotherapist: one(physiotherapists, { fields: [users.id], references: [physiotherapists.userId] }),
  manager: one(managers, { fields: [users.id], references: [managers.userId] }),
  clinicAdmin: one(clinicAdmins, { fields: [users.id], references: [clinicAdmins.userId] }),
  refreshTokens: many(refreshTokens),
  notifications: many(notifications),
  recordedPayments: many(payments),
}));

export const clinicsRelations = relations(clinics, ({ many }) => ({
  patients: many(patients),
  physiotherapists: many(physiotherapists),
  managers: many(managers),
  clinicAdmins: many(clinicAdmins),
  appointments: many(appointments),
  treatmentPlans: many(treatmentPlans),
}));

export const clinicAdminsRelations = relations(clinicAdmins, ({ one }) => ({
  user: one(users, { fields: [clinicAdmins.userId], references: [users.id] }),
  clinic: one(clinics, { fields: [clinicAdmins.clinicId], references: [clinics.id] }),
}));

export const managersRelations = relations(managers, ({ one }) => ({
  user: one(users, { fields: [managers.userId], references: [users.id] }),
  clinic: one(clinics, { fields: [managers.clinicId], references: [clinics.id] }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  clinic: one(clinics, { fields: [patients.clinicId], references: [clinics.id] }),
  primaryPhysio: one(physiotherapists, { fields: [patients.primaryPhysioId], references: [physiotherapists.id] }),
  appointments: many(appointments),
  treatmentPlans: many(treatmentPlans),
  exerciseAssignments: many(exerciseAssignments),
  recoveryLogs: many(recoveryLogs),
  payments: many(payments),
  conversations: many(conversations),
}));

export const physiotherapistsRelations = relations(physiotherapists, ({ one, many }) => ({
  user: one(users, { fields: [physiotherapists.userId], references: [users.id] }),
  clinic: one(clinics, { fields: [physiotherapists.clinicId], references: [clinics.id] }),
  patients: many(patients),
  treatmentPlans: many(treatmentPlans),
  appointments: many(appointments),
  sessionNotes: many(sessionNotes),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  physio: one(physiotherapists, { fields: [appointments.physioId], references: [physiotherapists.id] }),
  payment: one(payments, { fields: [appointments.id], references: [payments.appointmentId] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  patient: one(patients, { fields: [payments.patientId], references: [patients.id] }),
  recordedBy: one(users, { fields: [payments.recordedByUserId], references: [users.id] }),
  appointment: one(appointments, { fields: [payments.appointmentId], references: [appointments.id] }),
}));

export const treatmentPlansRelations = relations(treatmentPlans, ({ one, many }) => ({
  patient: one(patients, { fields: [treatmentPlans.patientId], references: [patients.id] }),
  physio: one(physiotherapists, { fields: [treatmentPlans.physioId], references: [physiotherapists.id] }),
  exerciseAssignments: many(exerciseAssignments),
}));

export const exerciseAssignmentsRelations = relations(exerciseAssignments, ({ one, many }) => ({
  treatmentPlan: one(treatmentPlans, { fields: [exerciseAssignments.treatmentPlanId], references: [treatmentPlans.id] }),
  exercise: one(exercises, { fields: [exerciseAssignments.exerciseId], references: [exercises.id] }),
  patient: one(patients, { fields: [exerciseAssignments.patientId], references: [patients.id] }),
  completions: many(exerciseCompletions),
}));

export const exerciseCompletionsRelations = relations(exerciseCompletions, ({ one }) => ({
  exerciseAssignment: one(exerciseAssignments, {
    fields: [exerciseCompletions.exerciseAssignmentId],
    references: [exerciseAssignments.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  patient: one(patients, { fields: [conversations.patientId], references: [patients.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  movements: many(inventoryMovements),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  item: one(inventoryItems, { fields: [inventoryMovements.itemId], references: [inventoryItems.id] }),
  recordedBy: one(users, { fields: [inventoryMovements.recordedByUserId], references: [users.id] }),
}));

export const appointmentRequestsRelations = relations(appointmentRequests, ({ one }) => ({
  clinic: one(clinics, { fields: [appointmentRequests.clinicId], references: [clinics.id] }),
  patient: one(patients, { fields: [appointmentRequests.patientId], references: [patients.id] }),
  physio: one(physiotherapists, { fields: [appointmentRequests.physioId], references: [physiotherapists.id] }),
  appointment: one(appointments, { fields: [appointmentRequests.appointmentId], references: [appointments.id] }),
  resolver: one(users, { fields: [appointmentRequests.resolvedBy], references: [users.id] }),
}));

export const rescheduleRequestsRelations = relations(rescheduleRequests, ({ one }) => ({
  clinic: one(clinics, { fields: [rescheduleRequests.clinicId], references: [clinics.id] }),
  appointment: one(appointments, { fields: [rescheduleRequests.appointmentId], references: [appointments.id] }),
  patient: one(patients, { fields: [rescheduleRequests.patientId], references: [patients.id] }),
  resolver: one(users, { fields: [rescheduleRequests.resolvedBy], references: [users.id] }),
}));
