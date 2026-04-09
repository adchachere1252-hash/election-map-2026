CREATE TABLE `pinned_key_races` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chamber` enum('senate','house') NOT NULL,
	`race_id` int NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`pinned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pinned_key_races_id` PRIMARY KEY(`id`)
);
