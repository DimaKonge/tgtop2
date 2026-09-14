CREATE TABLE `reward_invite_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`beneficiaryOpenId` varchar(64) NOT NULL,
	`inviteLink` varchar(512) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_invite_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `reward_invite_links_inviteLink_unique` UNIQUE(`inviteLink`),
	CONSTRAINT `reward_invite_links_group_beneficiary_unique` UNIQUE(`groupId`,`beneficiaryOpenId`)
);
