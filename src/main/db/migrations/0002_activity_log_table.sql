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

-- Create indexes for performance
CREATE INDEX `idx_activity_log_timestamp` ON `activity_log` (`timestamp`);
CREATE INDEX `idx_activity_log_type` ON `activity_log` (`type`);
CREATE INDEX `idx_activity_log_source` ON `activity_log` (`source`); 