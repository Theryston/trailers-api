CREATE TABLE `process` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`status_details` text NOT NULL,
	`is_completed` integer DEFAULT 0 NOT NULL,
	`service_name` text NOT NULL,
	`name` text,
	`year` integer,
	`trailer_page` text,
	`callback_url` text,
	`callback_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trailers` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`process_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`process_id`) REFERENCES `process`(`id`) ON UPDATE no action ON DELETE no action
);
