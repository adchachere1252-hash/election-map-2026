ALTER TABLE `governor_races` ADD `other_candidate_name` varchar(128);--> statement-breakpoint
ALTER TABLE `governor_races` ADD `other_candidate_party` enum('D','R','I','L','G');--> statement-breakpoint
ALTER TABLE `governor_races` ADD `other_votes` bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `governor_races` ADD `other_vote_pct` decimal(5,2);--> statement-breakpoint
ALTER TABLE `house_races` ADD `other_candidate_name` varchar(128);--> statement-breakpoint
ALTER TABLE `house_races` ADD `other_candidate_party` enum('D','R','I','L','G');--> statement-breakpoint
ALTER TABLE `house_races` ADD `other_votes` bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `house_races` ADD `other_vote_pct` decimal(5,2);--> statement-breakpoint
ALTER TABLE `senate_races` ADD `other_candidate_name` varchar(128);--> statement-breakpoint
ALTER TABLE `senate_races` ADD `other_candidate_party` enum('D','R','I','L','G');--> statement-breakpoint
ALTER TABLE `senate_races` ADD `other_votes` bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `senate_races` ADD `other_vote_pct` decimal(5,2);