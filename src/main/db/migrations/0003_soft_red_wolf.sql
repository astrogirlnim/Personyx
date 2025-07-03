CREATE TABLE `persona_history` (
	`history_id` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`previous_data` text NOT NULL,
	`new_data` text NOT NULL,
	`change_type` text NOT NULL,
	`confidence` real NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action
);
