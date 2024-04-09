CREATE TABLE `subtitles` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`language` text NOT NULL,
	`trailer_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`trailer_id`) REFERENCES `trailers`(`id`) ON UPDATE no action ON DELETE no action
);
