ALTER TABLE `governor_races` ADD `called_winner` varchar(128);--> statement-breakpoint
ALTER TABLE `house_races` ADD `candidate1_votes` bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `house_races` ADD `candidate2_votes` bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `senate_races` ADD `candidate1_votes` bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `senate_races` ADD `candidate2_votes` bigint DEFAULT 0;