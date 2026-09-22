CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invitation_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_tokens_token_hash_unique` ON `invitation_tokens` (`token_hash`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_patients` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`primary_physio_id` text,
	`date_of_birth` integer,
	`gender` text,
	`condition` text,
	`emergency_contact` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`primary_physio_id`) REFERENCES `physiotherapists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_patients`("id", "user_id", "clinic_id", "primary_physio_id", "date_of_birth", "gender", "condition", "emergency_contact", "created_at") SELECT "id", "user_id", "clinic_id", "primary_physio_id", "date_of_birth", "gender", "condition", "emergency_contact", "created_at" FROM `patients`;--> statement-breakpoint
DROP TABLE `patients`;--> statement-breakpoint
ALTER TABLE `__new_patients` RENAME TO `patients`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `patients_user_id_unique` ON `patients` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_physiotherapists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`specialty` text,
	`bio` text,
	`license_no` text,
	`years_experience` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_physiotherapists`("id", "user_id", "clinic_id", "specialty", "bio", "license_no", "years_experience", "created_at") SELECT "id", "user_id", "clinic_id", "specialty", "bio", "license_no", "years_experience", "created_at" FROM `physiotherapists`;--> statement-breakpoint
DROP TABLE `physiotherapists`;--> statement-breakpoint
ALTER TABLE `__new_physiotherapists` RENAME TO `physiotherapists`;--> statement-breakpoint
CREATE UNIQUE INDEX `physiotherapists_user_id_unique` ON `physiotherapists` (`user_id`);--> statement-breakpoint
ALTER TABLE `appointments` ADD `clinic_id` text NOT NULL REFERENCES clinics(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `clinic_id` text NOT NULL REFERENCES clinics(id);--> statement-breakpoint
ALTER TABLE `exercise_assignments` ADD `clinic_id` text NOT NULL REFERENCES clinics(id);--> statement-breakpoint
ALTER TABLE `exercises` ADD `clinic_id` text NOT NULL REFERENCES clinics(id);--> statement-breakpoint
ALTER TABLE `payments` ADD `clinic_id` text NOT NULL REFERENCES clinics(id);--> statement-breakpoint
ALTER TABLE `recovery_logs` ADD `clinic_id` text NOT NULL REFERENCES clinics(id);--> statement-breakpoint
ALTER TABLE `session_notes` ADD `clinic_id` text NOT NULL REFERENCES clinics(id);--> statement-breakpoint
ALTER TABLE `treatment_plans` ADD `clinic_id` text NOT NULL REFERENCES clinics(id);