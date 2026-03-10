/**
 * server/src/utils/importPokemon.ts
 * ───────────────────────────────────────────────────────────
 * Utilities for importing Pokemon data into a draft session.
 *
 * Supports two import formats:
 *  1. CSV file  - Spreadsheet export, human-editable
 *  2. JSON file - Structured format, API-friendly
 *
 * When to use:
 *  Before a draft begins, the commissioner imports their Pokemon
 *  tier list. This runs once per session setup.
 *
 * CSV column spec:
 *   name     (required) - Official Pokemon name e.g. "Landorus-Therian"
 *   tier     (required) - Tier label: "S", "1", "2", "3", "4", "5"
 *   points   (required) - Point cost as integer (e.g. 100, 80, 60, 40, 20, 10)
 *   type1    (required) - Primary type e.g. "Ground"
 *   type2    (optional) - Secondary type e.g. "Flying" (leave blank if mono-type)
 *   spriteUrl (optional) - URL to Pokemon sprite (leave blank for text-only)
 *
 * JSON format:
 *   { "pokemon": [ { "name": "...", "tier": "...", "points": 100, "types": ["Fire"], "spriteUrl": "..." }, ... ] }
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import type { PokemonData } from '../../../shared/types';

// ── CSV Row Type ──────────────────────────────────────────────
/**
 * Shape of a row parsed from the CSV file.
 * All values are strings at this stage (csv-parse returns raw strings).
 */
interface PokemonCSVRow {
  name: string;
  tier: string;
  points: string;   // Parsed to Int before database insert
  type1: string;
  type2?: string;   // Optional - empty string if not provided
  spriteUrl?: string; // Optional
}

// ── CSV Import ────────────────────────────────────────────────

/**
 * Imports Pokemon from a CSV file into a draft session.
 *
 * Steps:
 *  1. Read file from disk using fs.readFileSync
 *  2. Parse CSV with csv-parse/sync (columns: true for header row)
 *  3. Validate each row (name non-empty, points is valid integer, etc.)
 *  4. Transform rows to database shape (combine type1+type2 into JSON array)
 *  5. Bulk insert with prisma.pokemon.createMany()
 *  6. Log success count
 *
 * @param sessionId - UUID of the target session
 * @param filePath  - Absolute or relative path to the CSV file
 * @param prisma    - Prisma client instance
 * @returns         - Number of Pokemon successfully imported
 *
 * TODO: Implement this function
 */
export async function importPokemonFromCSV(
  sessionId: string,
  filePath: string,
  prisma: PrismaClient
): Promise<number> {
  // TODO: Implementation
  // const { parse } = await import('csv-parse/sync');
  //
  // 1. readFileSync(filePath, 'utf-8')
  // 2. parse(fileContent, { columns: true, skip_empty_lines: true }) as PokemonCSVRow[]
  // 3. Validate: filter out rows where name or tier is empty
  //    Log a warning for each invalid row
  // 4. Map rows to DB shape:
  //    {
  //      sessionId,
  //      name: row.name.trim(),
  //      tier: row.tier.trim().toUpperCase(),
  //      points: parseInt(row.points, 10),
  //      types: JSON.stringify([row.type1, row.type2].filter(t => t && t.trim())),
  //      spriteUrl: row.spriteUrl?.trim() || null,
  //    }
  // 5. prisma.pokemon.createMany({ data: pokemonData, skipDuplicates: true })
  // 6. Return count of created records
  throw new Error('Not implemented');
}

// ── JSON Import ───────────────────────────────────────────────

/**
 * Imports Pokemon from a JSON file into a draft session.
 *
 * Expected JSON structure:
 * {
 *   "pokemon": [
 *     {
 *       "name": "Landorus-Therian",
 *       "tier": "S",
 *       "points": 100,
 *       "types": ["Ground", "Flying"],
 *       "spriteUrl": "https://..." // optional
 *     }
 *   ]
 * }
 *
 * @param sessionId - UUID of the target session
 * @param filePath  - Absolute or relative path to the JSON file
 * @param prisma    - Prisma client instance
 * @returns         - Number of Pokemon successfully imported
 *
 * TODO: Implement this function
 */
export async function importPokemonFromJSON(
  sessionId: string,
  filePath: string,
  prisma: PrismaClient
): Promise<number> {
  // TODO: Implementation
  // 1. readFileSync(filePath, 'utf-8')
  // 2. JSON.parse(fileContent) → validate it has a 'pokemon' array
  // 3. Map each entry to DB shape:
  //    {
  //      sessionId,
  //      name: entry.name,
  //      tier: entry.tier,
  //      points: entry.points,
  //      types: JSON.stringify(entry.types),  // Store as JSON string
  //      spriteUrl: entry.spriteUrl || null,
  //    }
  // 4. prisma.pokemon.createMany({ data: pokemonData, skipDuplicates: true })
  // 5. Return count
  throw new Error('Not implemented');
}

// ── Validation Helpers ────────────────────────────────────────

/**
 * Validates a single PokemonData object before database insertion.
 * Returns an array of error strings (empty array = valid).
 *
 * Validation rules:
 *  - name: non-empty string
 *  - tier: one of "S", "1", "2", "3", "4", "5"
 *  - points: positive integer
 *  - types: array with 1-2 valid Pokemon type strings
 *
 * Valid Pokemon types:
 *  Normal, Fire, Water, Grass, Electric, Ice, Fighting, Poison,
 *  Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel, Fairy
 *
 * TODO: Implement this function
 */
export function validatePokemonData(data: Partial<PokemonData>): string[] {
  const errors: string[] = [];

  // TODO: Validate each field and push error messages to errors array
  // Example:
  // if (!data.name || data.name.trim() === '') errors.push('name is required');
  // if (!['S','1','2','3','4','5'].includes(data.tier ?? '')) errors.push(`invalid tier: ${data.tier}`);
  // if (!data.points || data.points <= 0 || !Number.isInteger(data.points)) errors.push('points must be positive integer');
  // if (!data.types || data.types.length === 0 || data.types.length > 2) errors.push('types must have 1-2 entries');

  return errors;
}

/**
 * Auto-fetches sprite URL from PokeAPI or Smogon sprite CDN.
 * Used as a fallback if spriteUrl is not provided in the import file.
 *
 * Smogon sprite URL pattern:
 *   https://www.smogon.com/dex/media/sprites/xy/{name.toLowerCase()}.gif
 *
 * PokeAPI sprite URL pattern:
 *   https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex-id}.png
 *
 * Note: This requires a network call per Pokemon. Use sparingly.
 *
 * @param pokemonName - Official Pokemon name (case-insensitive)
 * @returns           - Sprite URL string or null if not found
 *
 * TODO: Implement this function (optional/bonus)
 */
export async function fetchSpriteUrl(pokemonName: string): Promise<string | null> {
  // TODO: Try fetching from PokeAPI to get the dex number and sprite URL
  // const name = pokemonName.toLowerCase().replace(/[^a-z0-9-]/g, '');
  // const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
  // if (!response.ok) return null;
  // const data = await response.json();
  // return data.sprites.front_default || null;
  return null;
}
