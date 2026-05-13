ALTER TABLE `governor_races` ADD `primary_winner` varchar(128);--> statement-breakpoint
ALTER TABLE `governor_races` ADD `primary_party` enum('D','R','I');