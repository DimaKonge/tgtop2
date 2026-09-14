CREATE TABLE `telegram_event_receipts` (
	`eventKey` varchar(191) NOT NULL,
	`firstBot` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_event_receipts_eventKey` PRIMARY KEY(`eventKey`)
);
