
import { describe, it, expect } from 'vitest';
import { 
    getAbilityModifier, 
    getModifierString, 
    calculateAC, 
    calculateMoveCost, 
    parseRollExpression 
} from '../utils/mechanics';
import { MapObject } from '../types';

describe('D&D Mechanics', () => {
    describe('Ability Modifiers', () => {
        it('calculates modifiers correctly', () => {
            expect(getAbilityModifier(10)).toBe(0);
            expect(getAbilityModifier(12)).toBe(1);
            expect(getAbilityModifier(8)).toBe(-1);
            expect(getAbilityModifier(18)).toBe(4);
            expect(getAbilityModifier(1)).toBe(-5);
            expect(getAbilityModifier(20)).toBe(5);
        });

        it('formats modifier strings correctly', () => {
            expect(getModifierString(10)).toBe('+0');
            expect(getModifierString(14)).toBe('+2');
            expect(getModifierString(8)).toBe('-1');
        });
    });

    describe('AC Calculation', () => {
        it('calculates unarmored AC', () => {
            // Dex 14 (+2)
            expect(calculateAC(14, 10, 10, 'none', 10, false)).toBe(12);
        });

        it('calculates light armor AC', () => {
            // Light Armor (Studded Leather: 12) + Dex 16 (+3)
            expect(calculateAC(16, 10, 10, 'light', 12, false)).toBe(15);
        });

        it('calculates medium armor AC (capped dex)', () => {
            // Medium Armor (Scale Mail: 14) + Dex 18 (+4) -> Capped at +2
            expect(calculateAC(18, 10, 10, 'medium', 14, false)).toBe(16);
        });

        it('calculates heavy armor AC (no dex)', () => {
            // Heavy Armor (Chain Mail: 16) + Dex 10 -> Flat 16
            expect(calculateAC(10, 10, 10, 'heavy', 16, false)).toBe(16);
        });

        it('calculates Barbarian Unarmored Defense', () => {
            // Dex 14 (+2) + Con 16 (+3) + Base 10 = 15
            expect(calculateAC(14, 16, 10, 'unarmored_barb', 10, false)).toBe(15);
        });

        it('adds shield bonus', () => {
            // Heavy Armor 16 + Shield (+2) = 18
            expect(calculateAC(10, 10, 10, 'heavy', 16, true)).toBe(18);
        });
    });
});

describe('Dice Parsing', () => {
    it('parses standard dice notation', () => {
        expect(parseRollExpression('1d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
        expect(parseRollExpression('2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
    });

    it('parses notation with positive modifiers', () => {
        expect(parseRollExpression('1d20+5')).toEqual({ count: 1, sides: 20, modifier: 5 });
        expect(parseRollExpression('2d8 + 3')).toEqual({ count: 2, sides: 8, modifier: 3 });
    });

    it('parses notation with negative modifiers', () => {
        expect(parseRollExpression('1d20-1')).toEqual({ count: 1, sides: 20, modifier: -1 });
    });

    it('handles slash commands', () => {
        expect(parseRollExpression('/roll 1d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
        expect(parseRollExpression('/r 1d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
    });

    it('returns null for invalid input', () => {
        expect(parseRollExpression('hello')).toBeNull();
        expect(parseRollExpression('d20')).toBeNull(); // Requires count
    });
});

describe('Map Logic', () => {
    const mockObjects: MapObject[] = [
        { id: '1', type: 'wall', position: { x: 5, y: 5 }, isPassable: false, isInteractable: false },
        { id: '2', type: 'water', position: { x: 6, y: 5 }, isPassable: true, isInteractable: false }, // Difficult terrain
        { id: '3', type: 'rock', position: { x: 7, y: 5 }, isPassable: true, isInteractable: false } // Difficult terrain
    ];

    it('calculates standard movement cost', () => {
        // Move 1 square right
        const start = { x: 0, y: 0 };
        const end = { x: 1, y: 0 };
        const result = calculateMoveCost(start, end, mockObjects);
        expect(result.cost).toBe(5);
        expect(result.isBlocked).toBe(false);
    });

    it('calculates diagonal movement cost', () => {
        // Move 1 square diagonal (D&D 5e: 5-5-5 or 5-10-5 depending on variant, but here simple 5)
        const start = { x: 0, y: 0 };
        const end = { x: 1, y: 1 };
        const result = calculateMoveCost(start, end, mockObjects);
        expect(result.cost).toBe(5);
    });

    it('calculates difficult terrain cost', () => {
        // Move into water
        const start = { x: 5, y: 5 }; // Doesn't matter where from really
        const end = { x: 6, y: 5 }; // Water tile
        const result = calculateMoveCost(start, end, mockObjects);
        expect(result.cost).toBe(10); // Double cost
    });

    it('detects blocked movement', () => {
        // Move into wall
        const start = { x: 4, y: 5 };
        const end = { x: 5, y: 5 }; // Wall tile
        const result = calculateMoveCost(start, end, mockObjects);
        expect(result.isBlocked).toBe(true);
    });
});
