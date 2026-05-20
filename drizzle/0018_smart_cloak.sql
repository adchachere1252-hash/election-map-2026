CREATE TABLE `broadcast_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broadcast_key` varchar(128) NOT NULL,
	`election_date` varchar(16) NOT NULL,
	`state_code` varchar(4) NOT NULL,
	`chamber` varchar(16) NOT NULL,
	`district` varchar(8) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `broadcast_log_id` PRIMARY KEY(`id`),
	CONSTRAINT `broadcast_log_broadcast_key_unique` UNIQUE(`broadcast_key`)
);
