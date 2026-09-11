export const CARD_BACKGROUND_PRESET_IDS = [
  "black", "onyx_black", "battleship_grey", "midnight_blue", "indigo_dye",
  "cobalt_blue", "neon_blue", "electric_indigo", "cyberpunk", "lavender",
  "electric_purple", "grape", "purple", "english_violet", "dark_lilac",
  "fandango", "mystic_pearl", "raspberry", "burgundy", "strawberry",
  "coral_red", "persimmon", "carrot_juice", "orange", "copper",
  "chestnut", "rosewood", "cappuccino", "amber", "caramel", "pure_gold",
  "satin_gold", "desert_sand", "light_olive", "khaki_green", "lemongrass",
  "shamrock_green", "malachite", "pine_green", "hunter_green", "pistachio",
  "emerald", "mint_green", "pacific_green", "jade_green", "turquoise",
  "aquamarine", "pacific_cyan", "moonstone", "silver_blue", "french_blue",
  "azure_blue", "sky_blue", "sapphire", "navy_blue", "steel_grey",
  "roman_silver", "platinum", "ivory_white",
] as const;

export type CardBackgroundPreset = (typeof CARD_BACKGROUND_PRESET_IDS)[number];
