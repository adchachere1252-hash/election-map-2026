ALTER TABLE `referendums` ADD `category` varchar(128);--> statement-breakpoint
ALTER TABLE `referendums` ADD `measure_type` varchar(64);--> statement-breakpoint
ALTER TABLE `referendums` ADD `measure_type_full` varchar(256);--> statement-breakpoint
ALTER TABLE `referendums` ADD `scope` varchar(16) DEFAULT 'state';--> statement-breakpoint
ALTER TABLE `referendums` ADD `country` varchar(128) DEFAULT 'United States';--> statement-breakpoint
ALTER TABLE `referendums` ADD `country_code` varchar(3) DEFAULT 'US';