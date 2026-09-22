CREATE TABLE `managers` (
	`id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `managers_clinic_id_user_id_unique` ON `managers` (`clinic_id`,`user_id`);--> statement-breakpoint
ALTER TABLE `clinics` ADD `org_code` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `clinics_org_code_unique` ON `clinics` (`org_code`);