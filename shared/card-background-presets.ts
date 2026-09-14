export const CARD_BACKGROUND_PRESET_IDS = [
  "black", "ivory_white", "onyx_black",
  "turquoise", "deep_cyan", "aquamarine", "pacific_cyan", "feldgrau",
  "moonstone", "silver_blue", "celtic_blue", "french_blue", "azure_blue",
  "sky_blue", "sapphire", "navy_blue", "steel_grey", "roman_silver",
  "platinum",
  "seal_brown", "chocolate", "battleship_grey", "midnight_blue", "marine_blue",
  "indigo_dye", "cobalt_blue", "neon_blue", "electric_indigo", "cyberpunk",
  "lavender", "electric_purple", "french_violet", "grape", "purple",
  "english_violet", "dark_lilac", "fandango", "mystic_pearl", "raspberry",
  "mexican_pink", "burgundy", "carmine", "fire_engine", "strawberry",
  "coral_red", "tomato", "persimmon", "burnt_sienna", "carrot_juice",
  "orange", "copper", "chestnut", "rosewood", "cappuccino",
  "mustard", "amber", "caramel", "pure_gold", "satin_gold",
  "old_gold", "desert_sand", "light_olive", "khaki_green", "lemongrass",
  "shamrock_green", "malachite", "camo_green", "ranger_green", "dark_green",
  "rifle_green", "gunship_green", "tactical_pine", "pine_green", "hunter_green",
  "pistachio", "emerald", "mint_green", "pacific_green", "jade_green",
] as const;

export type CardBackgroundPreset = (typeof CARD_BACKGROUND_PRESET_IDS)[number];
