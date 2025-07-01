CREATE TABLE `embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_id` text NOT NULL,
	`embedding` text NOT NULL,
	`model` text NOT NULL,
	`dimensions` integer NOT NULL,
	`chunk_index` integer NOT NULL,
	`chunk_count` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE no action
);
