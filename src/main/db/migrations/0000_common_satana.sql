CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`service` text NOT NULL,
	`token_encrypted` text NOT NULL,
	`iv` text NOT NULL,
	`auth_tag` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`content` text NOT NULL,
	`source` text NOT NULL,
	`source_type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`tags` text NOT NULL,
	`sentiment` text,
	`importance` integer NOT NULL,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`persona_id` text NOT NULL,
	`score` real NOT NULL,
	`evidence_count` integer NOT NULL,
	`last_calculated` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`top_quotes` text NOT NULL,
	`breakdown_recency` real NOT NULL,
	`breakdown_coverage` real NOT NULL,
	`breakdown_relevance` real NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `product_documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`primary_goal` text NOT NULL,
	`main_pain_point` text NOT NULL,
	`keywords` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`file_path` text,
	`type` text NOT NULL,
	`uploaded_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_modified` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`evidence_score` real
);
