PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`role` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "role", "full_name", "phone", "avatar_url", "is_active", "created_at", "updated_at") SELECT "id", "email", "password_hash", "role", "full_name", "phone", "avatar_url", "is_active", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `patients` ADD `patient_code` text NOT NULL;--> statement-breakpoint
ALTER TABLE `patients` ADD `status` text DEFAULT 'PENDING_ONBOARDING' NOT NULL;--> statement-breakpoint
ALTER TABLE `patients` ADD `presenting_complaint` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `body_area` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `date_of_injury` integer;--> statement-breakpoint
ALTER TABLE `patients` ADD `referring_source` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `intake_notes` text;--> statement-breakpoint
CREATE UNIQUE INDEX `patients_patient_code_unique` ON `patients` (`patient_code`);