CREATE TABLE `literature` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`normalized_title` text NOT NULL,
	`year` integer NOT NULL,
	`abstract` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`innovation` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`bold_fields` text DEFAULT '[]' NOT NULL,
	`recorded_date` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_literature_normalized_title` ON `literature` (`normalized_title`);--> statement-breakpoint
CREATE INDEX `idx_literature_recorded_date` ON `literature` (`recorded_date`);--> statement-breakpoint
CREATE INDEX `idx_literature_type` ON `literature` (`type`);