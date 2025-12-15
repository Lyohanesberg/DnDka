

export type Theme = 'fantasy' | 'parchment' | 'scifi';

export enum Sender {
  User = 'user',
  AI = 'model',
  System = 'system'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isError?: boolean;
  isWhisper?: boolean; // NEW: Private message flag
  recipient?: string;  // NEW: Who sees this
  imageUrl?: string;   // NEW: Image attachment
  isStreaming?: boolean; // NEW: Streaming status flag
}

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface SpellSlot {
  current: number;
  max: number;
}

export interface SpellSlots {
  [level: number]: SpellSlot;
}

export interface HitDice {
  current: number;
  max: number;
  dieSize: number; // e.g., 6, 8, 10, 12
  // For multiclass, we might track pool, but simplistically we assume largest or track generally
}

export interface DeathSaves {
  successes: number;
  failures: number;
}

export interface ClassItem {
  name: string;
  level: number;
  hitDie: number;
}

export interface Currency {
  pp: number; // Platinum
  gp: number; // Gold
  ep: number; // Electrum
  sp: number; // Silver
  cp: number; // Copper
}

export interface Character {
  name: string;
  gender: string; // NEW: Character Gender
  race: string;
  class: string; // Deprecated but kept for display/primary
  classes: ClassItem[]; // NEW: Multiclass support
  level: number; // Total level
  stats: AbilityScores;
  proficientSkills: string[]; // NEW: List of skill names the character is proficient in
  inventory: string[];
  currency: Currency; // NEW: Money
  spells: string[]; 
  spellSlots: SpellSlots;
  hitDice: HitDice;
  deathSaves: DeathSaves;
  appearance: string; 
  backstory?: string; // NEW: AI Generated Backstory
  hp: number;
  maxHp: number;
  ac: number;
  speed: number;
  avatarUrl?: string;
  worldSetting: string;
  isSpectator?: boolean; // NEW: Spectator mode flag
}

export interface GameSettings {
  difficulty: 'story' | 'normal' | 'hard' | 'deadly';
  fogEnabled: boolean;
  allowPvp: boolean;
  publicRolls: boolean; // Force all rolls to be public
  ttsEnabled: boolean; // NEW: Text-to-Speech enabled
  ttsVoice: string; // NEW: Selected Voice Name
}

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'normal',
  fogEnabled: true,
  allowPvp: false,
  publicRolls: true,
  ttsEnabled: false,
  ttsVoice: 'Kore'
};

export type WeatherType = 'none' | 'rain' | 'snow' | 'ash' | 'fog';

export interface LocationState {
  name: string;
  description: string;
  imageUrl?: string;
  fogOfWar?: string; // NEW: Base64 image of the fog mask
  weather?: WeatherType; // NEW: Visual weather effect
  isGenerating: boolean;
  isAnalyzing?: boolean;
}

export type QuestStatus = 'active' | 'completed' | 'failed';

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
}

export type NoteType = 'npc' | 'location' | 'lore' | 'other';

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  timestamp: number;
}

export type Condition = 
  | 'blinded' 
  | 'charmed' 
  | 'deafened' 
  | 'frightened' 
  | 'grappled' 
  | 'incapacitated' 
  | 'invisible' 
  | 'paralyzed' 
  | 'petrified' 
  | 'poisoned' 
  | 'prone' 
  | 'restrained' 
  | 'stunned' 
  | 'unconscious'
  | 'silenced'
  | 'exhaustion'
  | 'blessed'
  | 'baned';

export interface Combatant {
  name: string;
  initiative: number;
  type: 'player' | 'enemy' | 'ally';
  isCurrentTurn: boolean;
  hpStatus?: string;
  hp?: number; // Optional absolute HP for tracking damage delta visually
  maxHp?: number;
  conditions?: Condition[]; // NEW: Active conditions
}

export interface CombatState {
  isActive: boolean;
  combatants: Combatant[];
}

export interface TokenPosition {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  p1: Point;
  p2: Point;
}

export interface MapToken {
  id: string; 
  position: TokenPosition;
  type: 'player' | 'enemy' | 'ally';
  size: number;
  imageUrl?: string; // NEW: Support for avatar images on tokens
}

export type MapObjectType = 'wall' | 'door' | 'chest' | 'tree' | 'rock' | 'trap' | 'fire' | 'water';

export interface MapObject {
  id: string;
  type: MapObjectType;
  position: TokenPosition;
  description?: string;
  isPassable: boolean;
  isInteractable: boolean;
  state?: 'open' | 'closed' | 'locked'; // NEW: For doors/chests
  loot?: string[]; // NEW: Loot inside container
  lootGenerated?: boolean; // NEW: Flag if loot was already generated
}

export interface Drawing {
  id: string;
  points: Point[];
  color: string;
  width: number;
  timestamp: number; // for auto-cleanup
}

export type TemplateType = 'circle' | 'cone' | 'cube' | 'line';

export interface MapTemplate {
  id: string;
  type: TemplateType;
  x: number; // Grid X (center or start)
  y: number; // Grid Y (center or start)
  size: number; // Radius or Length in feet
  rotation: number; // Degrees
  color: string;
  owner: string;
}

export interface Ping {
  id: string;
  x: number; // Grid X
  y: number; // Grid Y
  color: string;
  sender: string;
  timestamp: number;
}

export interface TurnState {
  hasAction: boolean;
  hasBonusAction: boolean;
  hasReaction: boolean;
  movementRemaining: number;
  maxMovement: number;
  isDashUsed: boolean;
}

export interface PendingRoll {
  callId: string;
  ability: string;
  skill?: string;
  dc?: number;
  reason: string;
  otherResponses: any[];
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface ShopItem {
  name: string;
  price: number; // in GP
  description?: string;
  type: 'weapon' | 'armor' | 'potion' | 'misc' | 'magic';
}

// --- HOMEBREW TYPES ---
export interface CustomSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  type: 'Attack' | 'Save' | 'Heal' | 'Utility' | 'Buff' | 'Debuff';
  description: string;
}

export interface CustomMonster {
  id: string;
  name: string;
  hp: number;
  ac: number;
  size: string; // 'Medium', 'Large', etc.
  description: string;
}

// --- MODDING TYPES ---
export interface GameMod {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  // Visual Overrides (CSS Variables)
  theme?: {
    [key: string]: string; // e.g. "--c-bg-main": "#000000"
  };
  // Content Additions
  content?: {
    classes?: Record<string, ClassPreset>;
    races?: Record<string, RacePreset>;
    items?: string[]; // Basic item names to add to lists
  };
}

// Visual FX Types
export type VFXType = 'fireball' | 'heal' | 'blood' | 'magic' | 'slash';

export interface VisualEffect {
    id: string;
    type: VFXType;
    x: number; // Grid X
    y: number; // Grid Y
    timestamp: number;
}

// Adaptive Difficulty
export interface RollRecord {
  value: number;
  type: 'success' | 'fail' | 'neutral';
  timestamp: number;
}

export const DND_CLASSES = [
  "Варвар",
  "Бард",
  "Воїн",
  "Друїд",
  "Жрець",
  "Монах",
  "Паладин",
  "Плут",
  "Слідопит",
  "Чародій",
  "Чаклун",
  "Чарівник"
];

export const DND_RACES = [
  // D&D Standard
  "Людина",
  "Ельф",
  "Дворф",
  "Галфлінг",
  "Дракононароджений",
  "Гном",
  "Напівельф",
  "Напіворк",
  "Тіфлінг",
  // WoW Alliance
  "Нічний Ельф (WoW)",
  "Дреней (WoW)",
  "Ворген (WoW)",
  "Гном (WoW)",
  "Механогном (WoW)",
  // WoW Horde
  "Орк (WoW)",
  "Ніжити (Forsaken)",
  "Таурен (WoW)",
  "Троль (WoW)",
  "Кровавий Ельф (WoW)",
  "Гоблін (WoW)",
  "Вульпера (WoW)",
  // WoW Neutral/Other
  "Мурлок (WoW)" 
];

export const WORLD_PRESETS = [
  "Забуті Королівства (Стандартне фентезі)",
  "World of Warcraft (Azeroth)",
  "Темне Фентезі (Ravenloft style)",
  "Високе Фентезі (Lord of the Rings style)",
  "Магічний Панк / Еберрон (Magitech)",
  "Міфічна Одіссея (Давньогрецький стиль)",
  "Постапокаліпсис",
  "Кіберпанк Фентезі (Shadowrun style)"
];

export interface ClassPreset {
  hitDie: number;
  primaryStats: (keyof AbilityScores)[];
  inventory: string[];
  spells?: string[];
  armorType: 'none' | 'light' | 'medium' | 'heavy' | 'unarmored_barb' | 'unarmored_monk';
  baseAc: number;
}

export interface RacePreset {
  speed: number;
  bonuses: Partial<AbilityScores>;
  description: string;
}

export interface SkillDefinition {
  name: string;
  ability: keyof AbilityScores;
}

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  { name: 'Acrobatics (Акробатика)', ability: 'dexterity' },
  { name: 'Animal Handling (Тваринництво)', ability: 'wisdom' },
  { name: 'Arcana (Магія)', ability: 'intelligence' },
  { name: 'Athletics (Атлетика)', ability: 'strength' },
  { name: 'Deception (Обман)', ability: 'charisma' },
  { name: 'History (Історія)', ability: 'intelligence' },
  { name: 'Insight (Проникливість)', ability: 'wisdom' },
  { name: 'Intimidation (Залякування)', ability: 'charisma' },
  { name: 'Investigation (Розслідування)', ability: 'intelligence' },
  { name: 'Medicine (Медицина)', ability: 'wisdom' },
  { name: 'Nature (Природа)', ability: 'intelligence' },
  { name: 'Perception (Уважність)', ability: 'wisdom' },
  { name: 'Performance (Виступ)', ability: 'charisma' },
  { name: 'Persuasion (Переконання)', ability: 'charisma' },
  { name: 'Religion (Релігія)', ability: 'intelligence' },
  { name: 'Sleight of Hand (Спритність рук)', ability: 'dexterity' },
  { name: 'Stealth (Стелс)', ability: 'dexterity' },
  { name: 'Survival (Виживання)', ability: 'wisdom' },
];

export const CLASS_PRESETS: Record<string, ClassPreset> = {
  "Варвар": {
    hitDie: 12,
    primaryStats: ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'],
    inventory: ["Велика сокира", "Дві ручні сокири", "Набір мандрівника", "Дротики (4)"],
    armorType: 'unarmored_barb',
    baseAc: 10
  },
  "Бард": {
    hitDie: 8,
    primaryStats: ['charisma', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'strength'],
    inventory: ["Рапіра", "Набір дипломата", "Лютня", "Шкіряна броня", "Кинджал"],
    spells: ["Vicious Mockery", "Charm Person", "Healing Word"],
    armorType: 'light',
    baseAc: 11
  },
  "Воїн": {
    hitDie: 10,
    primaryStats: ['strength', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'charisma'],
    inventory: ["Кольчуга", "Довгий меч", "Щит", "Арбалет легкий", "Набір дослідника підземель"],
    armorType: 'heavy', 
    baseAc: 16
  },
  "Друїд": {
    hitDie: 8,
    primaryStats: ['wisdom', 'constitution', 'dexterity', 'intelligence', 'charisma', 'strength'],
    inventory: ["Дерев'яний щит", "Скімітар", "Шкіряна броня", "Набір мандрівника", "Фокус друїда"],
    spells: ["Druidcraft", "Entangle", "Cure Wounds"],
    armorType: 'light',
    baseAc: 11
  },
  "Жрець": {
    hitDie: 8,
    primaryStats: ['wisdom', 'strength', 'constitution', 'charisma', 'intelligence', 'dexterity'],
    inventory: ["Булава", "Луската броня", "Легкий арбалет", "Набір священика", "Щит", "Священний символ"],
    spells: ["Sacred Flame", "Bless", "Healing Word"],
    armorType: 'medium', 
    baseAc: 14
  },
  "Монах": {
    hitDie: 8,
    primaryStats: ['dexterity', 'wisdom', 'constitution', 'strength', 'intelligence', 'charisma'],
    inventory: ["Короткий меч", "Набір дослідника підземель", "Дротики (10)"],
    armorType: 'unarmored_monk',
    baseAc: 10
  },
  "Паладин": {
    hitDie: 10,
    primaryStats: ['strength', 'charisma', 'constitution', 'wisdom', 'intelligence', 'dexterity'],
    inventory: ["Бойовий молот", "Щит", "Дротики (5)", "Кольчуга", "Священний символ", "Набір мандрівника"],
    spells: ["Divine Sense", "Lay on Hands"],
    armorType: 'heavy',
    baseAc: 16
  },
  "Плут": {
    hitDie: 8,
    primaryStats: ['dexterity', 'intelligence', 'charisma', 'constitution', 'wisdom', 'strength'],
    inventory: ["Рапіра", "Короткий лук", "Набір злодія", "Шкіряна броня", "Два кинджали", "Стріли (20)"],
    armorType: 'light',
    baseAc: 11
  },
  "Слідопит": {
    hitDie: 10,
    primaryStats: ['dexterity', 'wisdom', 'constitution', 'strength', 'intelligence', 'charisma'],
    inventory: ["Луската броня", "Два коротких меча", "Набір мандрівника", "Довгий лук", "Стріли (20)"],
    armorType: 'medium',
    baseAc: 14
  },
  "Чародій": {
    hitDie: 6,
    primaryStats: ['charisma', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'strength'],
    inventory: ["Легкий арбалет", "Фокус чародія", "Набір дослідника підземель", "Два кинджали", "Стріли (20)"],
    spells: ["Fire Bolt", "Mage Armor", "Magic Missile"],
    armorType: 'none',
    baseAc: 10
  },
  "Чаклун": {
    hitDie: 8,
    primaryStats: ['charisma', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'strength'],
    inventory: ["Легкий арбалет", "Фокус", "Шкіряна броня", "Набір вченого", "Два кинджали", "Стріли (20)"],
    spells: ["Eldritch Blast", "Hex", "Hellish Rebuke"],
    armorType: 'light',
    baseAc: 11
  },
  "Чарівник": {
    hitDie: 6,
    primaryStats: ['intelligence', 'constitution', 'dexterity', 'wisdom', 'charisma', 'strength'],
    inventory: ["Книга заклять", "Фокус", "Набір вченого", "Сумка з компонентами"],
    spells: ["Fire Bolt", "Mage Armor", "Sleep"],
    armorType: 'none',
    baseAc: 10
  }
};

export const RACE_PRESETS: Record<string, RacePreset> = {
  // --- D&D Standard ---
  "Людина": {
    speed: 30,
    bonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    description: "+1 до всіх характеристик"
  },
  "Ельф": {
    speed: 30,
    bonuses: { dexterity: 2 },
    description: "+2 Спритність, Темний зір"
  },
  "Дворф": {
    speed: 25,
    bonuses: { constitution: 2 },
    description: "+2 Статура, Темний зір, Стійкість"
  },
  "Галфлінг": {
    speed: 25,
    bonuses: { dexterity: 2 },
    description: "+2 Спритність, Щасливчик"
  },
  "Дракононароджений": {
    speed: 30,
    bonuses: { strength: 2, charisma: 1 },
    description: "+2 Сила, +1 Харизма, Подих дракона"
  },
  "Гном": {
    speed: 25,
    bonuses: { intelligence: 2 },
    description: "+2 Інтелект, Темний зір"
  },
  "Напівельф": {
    speed: 30,
    bonuses: { charisma: 2, dexterity: 1, constitution: 1 }, 
    description: "+2 Харизма, +1 до двох інших"
  },
  "Напіворк": {
    speed: 30,
    bonuses: { strength: 2, constitution: 1 },
    description: "+2 Сила, +1 Статура, Лють"
  },
  "Тіфлінг": {
    speed: 30,
    bonuses: { charisma: 2, intelligence: 1 },
    description: "+2 Харизма, +1 Інтелект, Темний зір"
  },

  // --- WoW Alliance ---
  "Нічний Ельф (WoW)": {
    speed: 30,
    bonuses: { dexterity: 2, wisdom: 1 },
    description: "+2 Спритність, +1 Мудрість, Shadowmeld"
  },
  "Дреней (WoW)": {
    speed: 30,
    bonuses: { strength: 2, charisma: 1 },
    description: "+2 Сила, +1 Харизма, Heroic Presence"
  },
  "Ворген (WoW)": {
    speed: 30,
    bonuses: { strength: 1, dexterity: 2 },
    description: "+2 Спритність, +1 Сила, Darkflight"
  },
  "Гном (WoW)": {
    speed: 25,
    bonuses: { intelligence: 2, dexterity: 1 },
    description: "+2 Інтелект, +1 Спритність, Escape Artist"
  },
  "Механогном (WoW)": {
    speed: 25,
    bonuses: { intelligence: 2, constitution: 1 },
    description: "+2 Інтелект, +1 Статура, Кібер-кінцівки"
  },

  // --- WoW Horde ---
  "Орк (WoW)": {
    speed: 30,
    bonuses: { strength: 2, constitution: 1 },
    description: "+2 Сила, +1 Статура, Blood Fury"
  },
  "Ніжити (Forsaken)": {
    speed: 30,
    bonuses: { constitution: 2, wisdom: 1 },
    description: "+2 Статура, +1 Мудрість, Will of the Forsaken"
  },
  "Таурен (WoW)": {
    speed: 30,
    bonuses: { strength: 2, constitution: 1 },
    description: "+2 Сила, +1 Статура, War Stomp"
  },
  "Троль (WoW)": {
    speed: 30,
    bonuses: { dexterity: 2, constitution: 1 },
    description: "+2 Спритність, +1 Статура, Regeneration"
  },
  "Кровавий Ельф (WoW)": {
    speed: 30,
    bonuses: { intelligence: 2, charisma: 1 },
    description: "+2 Інтелект, +1 Харизма, Arcane Torrent"
  },
  "Гоблін (WoW)": {
    speed: 25,
    bonuses: { dexterity: 2, intelligence: 1 },
    description: "+2 Спритність, +1 Інтелект, Rocket Jump"
  },
  "Вульпера (WoW)": {
    speed: 25,
    bonuses: { dexterity: 2, intelligence: 1 },
    description: "+2 Спритність, +1 Інтелект, Make Camp"
  },
  // --- WoW Other ---
  "Мурлок (WoW)": {
    speed: 30,
    bonuses: { dexterity: 2, constitution: 1 },
    description: "+2 Спритність, +1 Статура, Mrrgllggll!"
  }
};

// Start completely empty to force user selection
export const DEFAULT_CHARACTER: Character = {
  name: "",
  gender: "Чоловіча",
  race: "",
  class: "",
  classes: [],
  level: 1,
  stats: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  },
  proficientSkills: [],
  inventory: [],
  currency: { pp: 0, gp: 10, ep: 0, sp: 0, cp: 0 }, // Default starting gold
  spells: [],
  spellSlots: {
     1: { current: 0, max: 0 },
     2: { current: 0, max: 0 },
     3: { current: 0, max: 0 },
     4: { current: 0, max: 0 },
     5: { current: 0, max: 0 },
     6: { current: 0, max: 0 },
     7: { current: 0, max: 0 },
     8: { current: 0, max: 0 },
     9: { current: 0, max: 0 }
  },
  hitDice: { current: 1, max: 1, dieSize: 8 },
  deathSaves: { successes: 0, failures: 0 },
  appearance: "",
  backstory: "",
  hp: 0, 
  maxHp: 0,
  ac: 10,
  speed: 30,
  worldSetting: "Забуті Королівства (Стандартне фентезі)",
  isSpectator: false 
};