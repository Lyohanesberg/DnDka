
export type SpellType = 'Attack' | 'Save' | 'Heal' | 'Utility' | 'Buff' | 'Debuff';
export type MagicSchool = 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';

export interface SpellDefinition {
  name: string;
  level: number; // 0 for Cantrip
  school: MagicSchool;
  type: SpellType;
  range?: string;
  castingTime?: string;
}

export const SPELL_DB: Record<string, SpellDefinition> = {
  // --- CANTRIPS (Level 0) ---
  "Eldritch Blast": { name: "Eldritch Blast", level: 0, school: "Evocation", type: "Attack" },
  "Fire Bolt": { name: "Fire Bolt", level: 0, school: "Evocation", type: "Attack" },
  "Sacred Flame": { name: "Sacred Flame", level: 0, school: "Evocation", type: "Save" },
  "Mage Hand": { name: "Mage Hand", level: 0, school: "Conjuration", type: "Utility" },
  "Minor Illusion": { name: "Minor Illusion", level: 0, school: "Illusion", type: "Utility" },
  "Prestidigitation": { name: "Prestidigitation", level: 0, school: "Transmutation", type: "Utility" },
  "Ray of Frost": { name: "Ray of Frost", level: 0, school: "Evocation", type: "Attack" },
  "Shocking Grasp": { name: "Shocking Grasp", level: 0, school: "Evocation", type: "Attack" },
  "Vicious Mockery": { name: "Vicious Mockery", level: 0, school: "Enchantment", type: "Save" },
  "Guidance": { name: "Guidance", level: 0, school: "Divination", type: "Buff" },
  "Light": { name: "Light", level: 0, school: "Evocation", type: "Utility" },
  "Message": { name: "Message", level: 0, school: "Transmutation", type: "Utility" },
  "Spare the Dying": { name: "Spare the Dying", level: 0, school: "Necromancy", type: "Heal" },
  "Thaumaturgy": { name: "Thaumaturgy", level: 0, school: "Transmutation", type: "Utility" },
  "Druidcraft": { name: "Druidcraft", level: 0, school: "Transmutation", type: "Utility" },
  "Thorn Whip": { name: "Thorn Whip", level: 0, school: "Transmutation", type: "Attack" },

  // --- LEVEL 1 ---
  "Bless": { name: "Bless", level: 1, school: "Enchantment", type: "Buff" },
  "Burning Hands": { name: "Burning Hands", level: 1, school: "Evocation", type: "Save" },
  "Charm Person": { name: "Charm Person", level: 1, school: "Enchantment", type: "Debuff" },
  "Command": { name: "Command", level: 1, school: "Enchantment", type: "Debuff" },
  "Cure Wounds": { name: "Cure Wounds", level: 1, school: "Evocation", type: "Heal" },
  "Detect Magic": { name: "Detect Magic", level: 1, school: "Divination", type: "Utility" },
  "Disguise Self": { name: "Disguise Self", level: 1, school: "Illusion", type: "Utility" },
  "Faerie Fire": { name: "Faerie Fire", level: 1, school: "Evocation", type: "Debuff" },
  "Feather Fall": { name: "Feather Fall", level: 1, school: "Transmutation", type: "Buff" },
  "Guiding Bolt": { name: "Guiding Bolt", level: 1, school: "Evocation", type: "Attack" },
  "Healing Word": { name: "Healing Word", level: 1, school: "Evocation", type: "Heal" },
  "Hellish Rebuke": { name: "Hellish Rebuke", level: 1, school: "Evocation", type: "Save" },
  "Heroism": { name: "Heroism", level: 1, school: "Enchantment", type: "Buff" },
  "Hex": { name: "Hex", level: 1, school: "Enchantment", type: "Debuff" },
  "Hunter's Mark": { name: "Hunter's Mark", level: 1, school: "Divination", type: "Buff" },
  "Identify": { name: "Identify", level: 1, school: "Divination", type: "Utility" },
  "Inflict Wounds": { name: "Inflict Wounds", level: 1, school: "Necromancy", type: "Attack" },
  "Mage Armor": { name: "Mage Armor", level: 1, school: "Abjuration", type: "Buff" },
  "Magic Missile": { name: "Magic Missile", level: 1, school: "Evocation", type: "Attack" },
  "Protection from Evil and Good": { name: "Protection from Evil and Good", level: 1, school: "Abjuration", type: "Buff" },
  "Shield": { name: "Shield", level: 1, school: "Abjuration", type: "Buff" },
  "Silent Image": { name: "Silent Image", level: 1, school: "Illusion", type: "Utility" },
  "Sleep": { name: "Sleep", level: 1, school: "Enchantment", type: "Debuff" },
  "Thunderwave": { name: "Thunderwave", level: 1, school: "Evocation", type: "Save" },
  "Entangle": { name: "Entangle", level: 1, school: "Conjuration", type: "Debuff" },

  // --- LEVEL 2 ---
  "Aid": { name: "Aid", level: 2, school: "Abjuration", type: "Heal" },
  "Blindness/Deafness": { name: "Blindness/Deafness", level: 2, school: "Necromancy", type: "Debuff" },
  "Blur": { name: "Blur", level: 2, school: "Illusion", type: "Buff" },
  "Darkness": { name: "Darkness", level: 2, school: "Evocation", type: "Utility" },
  "Darkvision": { name: "Darkvision", level: 2, school: "Transmutation", type: "Buff" },
  "Detect Thoughts": { name: "Detect Thoughts", level: 2, school: "Divination", type: "Utility" },
  "Enhance Ability": { name: "Enhance Ability", level: 2, school: "Transmutation", type: "Buff" },
  "Flaming Sphere": { name: "Flaming Sphere", level: 2, school: "Conjuration", type: "Save" },
  "Hold Person": { name: "Hold Person", level: 2, school: "Enchantment", type: "Debuff" },
  "Invisibility": { name: "Invisibility", level: 2, school: "Illusion", type: "Buff" },
  "Lesser Restoration": { name: "Lesser Restoration", level: 2, school: "Abjuration", type: "Heal" },
  "Levitate": { name: "Levitate", level: 2, school: "Transmutation", type: "Utility" },
  "Mirror Image": { name: "Mirror Image", level: 2, school: "Illusion", type: "Buff" },
  "Misty Step": { name: "Misty Step", level: 2, school: "Conjuration", type: "Utility" },
  "Moonbeam": { name: "Moonbeam", level: 2, school: "Evocation", type: "Save" },
  "Pass without Trace": { name: "Pass without Trace", level: 2, school: "Abjuration", type: "Buff" },
  "Scorching Ray": { name: "Scorching Ray", level: 2, school: "Evocation", type: "Attack" },
  "Shatter": { name: "Shatter", level: 2, school: "Evocation", type: "Save" },
  "Silence": { name: "Silence", level: 2, school: "Illusion", type: "Debuff" },
  "Spider Climb": { name: "Spider Climb", level: 2, school: "Transmutation", type: "Buff" },
  "Spike Growth": { name: "Spike Growth", level: 2, school: "Transmutation", type: "Debuff" },
  "Suggestion": { name: "Suggestion", level: 2, school: "Enchantment", type: "Debuff" },
  "Web": { name: "Web", level: 2, school: "Conjuration", type: "Debuff" },

  // --- LEVEL 3 ---
  "Animate Dead": { name: "Animate Dead", level: 3, school: "Necromancy", type: "Utility" },
  "Bestow Curse": { name: "Bestow Curse", level: 3, school: "Necromancy", type: "Debuff" },
  "Call Lightning": { name: "Call Lightning", level: 3, school: "Evocation", type: "Save" },
  "Counterspell": { name: "Counterspell", level: 3, school: "Abjuration", type: "Utility" },
  "Dispel Magic": { name: "Dispel Magic", level: 3, school: "Abjuration", type: "Utility" },
  "Fear": { name: "Fear", level: 3, school: "Illusion", type: "Debuff" },
  "Fireball": { name: "Fireball", level: 3, school: "Evocation", type: "Save" },
  "Fly": { name: "Fly", level: 3, school: "Transmutation", type: "Buff" },
  "Haste": { name: "Haste", level: 3, school: "Transmutation", type: "Buff" },
  "Hypnotic Pattern": { name: "Hypnotic Pattern", level: 3, school: "Illusion", type: "Debuff" },
  "Lightning Bolt": { name: "Lightning Bolt", level: 3, school: "Evocation", type: "Save" },
  "Major Image": { name: "Major Image", level: 3, school: "Illusion", type: "Utility" },
  "Mass Healing Word": { name: "Mass Healing Word", level: 3, school: "Evocation", type: "Heal" },
  "Revivify": { name: "Revivify", level: 3, school: "Necromancy", type: "Heal" },
  "Slow": { name: "Slow", level: 3, school: "Transmutation", type: "Debuff" },
  "Spirit Guardians": { name: "Spirit Guardians", level: 3, school: "Conjuration", type: "Save" },
  "Vampiric Touch": { name: "Vampiric Touch", level: 3, school: "Necromancy", type: "Attack" },
};

// Helper to fuzzy find a spell from the DB based on string name
export const findSpell = (spellName: string): SpellDefinition | null => {
    const normalizedInput = spellName.toLowerCase().trim();
    
    // Direct lookup
    if (SPELL_DB[spellName]) return SPELL_DB[spellName];

    // Fuzzy lookup
    const foundKey = Object.keys(SPELL_DB).find(key => key.toLowerCase() === normalizedInput);
    if (foundKey) return SPELL_DB[foundKey];

    return null;
};
