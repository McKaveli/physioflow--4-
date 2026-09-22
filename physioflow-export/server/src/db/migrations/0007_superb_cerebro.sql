CREATE TABLE `patient_discharges` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`physio_id` text NOT NULL,
	`discharged_by_user_id` text NOT NULL,
	`treatment_outcome` text NOT NULL,
	`final_clinical_notes` text NOT NULL,
	`treatment_goals_status` text NOT NULL,
	`sessions_completed` integer NOT NULL,
	`discharge_reason` text NOT NULL,
	`final_progress` text NOT NULL,
	`follow_up_recommendations` text,
	`discharged_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`physio_id`) REFERENCES `physiotherapists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discharged_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patient_discharges_patient_id_unique` ON `patient_discharges` (`patient_id`);--> statement-breakpoint
ALTER TABLE `patients` ADD `date_onboarded` integer;--> statement-breakpoint
ALTER TABLE `patients` ADD `profession` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `purpose` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `recorded_by_user_id` text REFERENCES users(id);