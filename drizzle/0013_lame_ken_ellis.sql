ALTER TABLE `house_races` ADD `primary_winner` varchar(128);--> statement-breakpoint
ALTER TABLE `house_races` ADD `primary_party` enum('D','R','I');--> statement-breakpoint
ALTER TABLE `senate_races` ADD `primary_winner` varchar(128);--> statement-breakpoint
ALTER TABLE `senate_races` ADD `primary_party` enum('D','R','I');