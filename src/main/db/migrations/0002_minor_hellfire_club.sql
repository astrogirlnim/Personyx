CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`metadata` text,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
