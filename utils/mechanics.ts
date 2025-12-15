

import { AbilityScores, TokenPosition, MapObject } from '../types';

// --- D&D RULES ---

export const getAbilityModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

export const getModifierString = (score: number): string => {
  const mod = getAbilityModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

export const calculateProficiencyBonus = (level: number): number => {
    if (level < 1) return 2;
    return Math.ceil(level / 4) + 1;
};

export const calculateAC = (
  dexScore: number, 
  conScore: number, 
  wisScore: number, 
  armorType: string, 
  baseAc: number, 
  hasShield: boolean
): number => {
  const dexMod = getAbilityModifier(dexScore);
  const conMod = getAbilityModifier(conScore);
  const wisMod = getAbilityModifier(wisScore);

  let ac = 10;
  
  switch (armorType) {
    case 'heavy': 
      ac = baseAc; 
      break;
    case 'medium': 
      ac = baseAc + Math.min(dexMod, 2); 
      break;
    case 'light': 
      ac = baseAc + dexMod; 
      break;
    case 'unarmored_barb': 
      ac = 10 + dexMod + conMod; 
      break;
    case 'unarmored_monk': 
      ac = 10 + dexMod + wisMod; 
      break;
    default: 
      ac = 10 + dexMod;
  }

  if (hasShield) {
    ac += 2;
  }

  return ac;
};

// --- DICE LOGIC ---

export const parseRollExpression = (input: string): { count: number, sides: number, modifier: number } | null => {
    // Regex matches: 1d20, 2d6+3, 1d10-1
    const rollRegex = /^\/?(?:r|roll)?\s*([0-9]+)d([0-9]+)(?:\s*([+-])\s*([0-9]+))?/i;
    const match = input.match(rollRegex);

    if (match) {
        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const op = match[3];
        let modifier = 0;
        
        if (op && match[4]) {
            modifier = parseInt(match[4]);
            if (op === '-') modifier = -modifier;
        }

        return { count, sides, modifier };
    }
    return null;
};

// --- MAP LOGIC ---

export const calculateDistance = (p1: TokenPosition, p2: TokenPosition): number => {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return Math.max(dx, dy) * 5; 
};

export const calculateMoveCost = (
    p1: TokenPosition, 
    p2: TokenPosition, 
    mapObjects: MapObject[]
): { cost: number, isBlocked: boolean } => {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    const steps = Math.max(dx, dy);
    
    // Basic distance cost (5ft per tile)
    let cost = steps * 5;

    // Check target cell for Difficult Terrain
    const targetObj = mapObjects.find(o => o.position.x === p2.x && o.position.y === p2.y);
    
    // Check if blocked
    const isBlocked = targetObj ? !targetObj.isPassable : false;

    if (targetObj && (targetObj.type === 'water' || targetObj.type === 'rock')) {
        cost *= 2; // Double movement cost logic
    }
    
    return { cost, isBlocked };
};