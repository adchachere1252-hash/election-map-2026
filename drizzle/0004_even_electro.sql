CREATE TABLE `senators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state_code` varchar(2) NOT NULL,
	`state_name` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`party` enum('D','R','I') NOT NULL,
	`senate_class` int NOT NULL,
	`next_election_year` int NOT NULL,
	`is_up_in_2026` boolean NOT NULL DEFAULT false,
	`bio` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `senators_id` PRIMARY KEY(`id`)
);
