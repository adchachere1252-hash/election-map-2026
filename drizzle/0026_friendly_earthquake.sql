CREATE TABLE `candidate_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`normalized_name` varchar(256) NOT NULL,
	`display_name` varchar(256) NOT NULL,
	`photo_url` text NOT NULL,
	`source` enum('manus-storage','bioguide','cdn','manual') NOT NULL DEFAULT 'manual',
	`chamber` enum('senate','house','governor','world'),
	`party` enum('D','R','I','L','G'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_photos_normalized_name_unique` UNIQUE(`normalized_name`)
);
