/** Internal GRAM is persisted as integer hundredths: 1 unit is 0.01 GRAM. */
export const GRAM_SCALE = 100;
export const DEFAULT_MANUAL_ADD_REWARD = 1;
export const MAX_REWARD_CAMPAIGN_BUDGET = 10_000_000;
export const MAX_REWARD_PER_ACTION = 1_000_000;

export type RewardEventType = "subscription" | "invite_referral" | "manual_add";
export type RewardCommunityCategory = "Каналы" | "Чаты";

export type RewardCampaignConfig = {
  category: RewardCommunityCategory;
  rewardActive: boolean;
  rewardBudget: number;
  rewardPerSubscription: number;
  rewardPerInvite: number;
  rewardPerManualAdd: number;
};

export function getRewardAmount(config: RewardCampaignConfig, eventType: RewardEventType): number {
  if (eventType === "manual_add") return config.category === "Чаты" ? config.rewardPerManualAdd : 0;
  if (eventType === "subscription") return config.category === "Каналы" ? config.rewardPerSubscription : 0;
  return config.category === "Каналы" ? config.rewardPerInvite : 0;
}

export function isRewardCampaignActive(config: RewardCampaignConfig): boolean {
  if (!config.rewardActive || config.rewardBudget < 1) return false;
  return ["subscription", "invite_referral", "manual_add"].some(type => {
    const amount = getRewardAmount(config, type as RewardEventType);
    return Number.isInteger(amount) && amount > 0 && config.rewardBudget >= amount;
  });
}

export function validateRewardCampaignConfig(config: RewardCampaignConfig): string | undefined {
  const numericValues = [config.rewardBudget, config.rewardPerSubscription, config.rewardPerInvite, config.rewardPerManualAdd];
  if (!numericValues.every(Number.isInteger) || numericValues.some(value => value < 0)) return "Значения кампании должны быть целым количеством сотых GRAM";
  if (config.rewardBudget > MAX_REWARD_CAMPAIGN_BUDGET) return "Бюджет кампании слишком большой";
  if ([config.rewardPerSubscription, config.rewardPerInvite, config.rewardPerManualAdd].some(value => value > MAX_REWARD_PER_ACTION)) return "Размер вознаграждения слишком большой";
  if (!config.rewardActive) return undefined;
  if (config.rewardBudget < 1) return "Укажите бюджет кампании";
  if (!["subscription", "invite_referral", "manual_add"].some(type => getRewardAmount(config, type as RewardEventType) > 0)) return "Укажите хотя бы одно вознаграждение";
  if (!["subscription", "invite_referral", "manual_add"].some(type => {
    const amount = getRewardAmount(config, type as RewardEventType);
    return amount > 0 && config.rewardBudget >= amount;
  })) return "Бюджет должен покрывать хотя бы одно вознаграждение";
  return undefined;
}
