import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProcessedData, ProcessedRow, Round } from '../src/models';

interface ArchipelagoTile {
  position: string;
  textures: string[];
}

interface ArchipelagoIsland {
  tiles: ArchipelagoTile[];
  radius: number;
}

interface ArchipelagoTeam {
  name: string;
}

interface ArchipelagoItem {
  island: ArchipelagoIsland;
  teamId: number;
  profit: number;
  currentPlace: number | null;
  country: string;
  team: ArchipelagoTeam;
  worldPosition: string;
}

type ArchipelagoData = ArchipelagoItem[];

interface LeaderboardItem {
  teamId: string;
  profit: number;
  position: number;
  previousRoundPosition: number;
  countryCode: string;
  country: string;
  name: string;
}

interface LeaderboardPosition {
  name: string;
  position: number;
}

interface LeaderboardData {
  overall: LeaderboardItem[];
  algo: LeaderboardItem[];
  manual: LeaderboardItem[];
  country: LeaderboardItem[];
  positions: LeaderboardPosition[];
}

interface ProcessedResultCategory {
  rank: number | null;
  profit: number;
}

interface ProcessedResult {
  overall: ProcessedResultCategory;
  manual: ProcessedResultCategory | null;
  algo: ProcessedResultCategory | null;
}

interface ProcessedTeam {
  name: string;
  country: string;
  results: (ProcessedResult | null)[];
}

function readFile<T>(relativePath: string): T {
  const absolutePath = path.resolve(import.meta.dirname, relativePath);
  const content = fs.readFileSync(absolutePath, { encoding: 'utf-8' });
  return JSON.parse(content);
}

function writeFile(relativePath: string, content: string): void {
  const absolutePath = path.resolve(import.meta.dirname, relativePath);
  fs.writeFileSync(absolutePath, content);
}

const processedTeams: Record<number, ProcessedTeam> = {};
const processedRounds: Round[] = [];

const countryCodeFormatter = new Intl.DisplayNames(['en'], { type: 'region' });

const dataDirectories: [number, string, string][] = [
  [1, 'After round 1 (before rerun)', 'round1-before-rerun'],
  [1, 'After round 1 (after rerun)', 'round1-after-rerun'],
  [2, 'After round 2 (before hardcoding update)', 'round2-before-hardcoding-update'],
  [2, 'After round 2 (after hardcoding update)', 'round2-after-hardcoding-update'],
];

for (let i = 0; i < dataDirectories.length; i++) {
  const [roundNum, label, directory] = dataDirectories[i];

  const archipelagoData = readFile<ArchipelagoData>(`${directory}/archipelago_ROUND${roundNum + 1}.json`);
  const leaderboardData = readFile<LeaderboardData>(`${directory}/team-leaderboard.json`);

  processedRounds.push({
    label,
    registeredTeams: archipelagoData.length,
    rankedTeams: archipelagoData.filter(row => row.currentPlace !== null).length,
  });

  for (const row of archipelagoData) {
    if (processedTeams[row.teamId] === undefined) {
      processedTeams[row.teamId] = {
        name: row.team.name,
        country: countryCodeFormatter.of(row.country)!.replace('Hong Kong SAR China', 'Hong Kong'),
        results: new Array(dataDirectories.length).fill(null),
      };
    }

    if (row.currentPlace === null) {
      continue;
    }

    const processedTeam = processedTeams[row.teamId];
    processedTeam.results[i] = {
      overall: {
        rank: row.currentPlace,
        profit: row.profit,
      },
      manual: null,
      algo: null,
    };
  }

  for (const category of ['manual', 'algo'] as const) {
    for (const row of leaderboardData[category]) {
      const processedTeam = processedTeams[parseInt(row.teamId)];
      processedTeam.results[i]![category] = {
        rank: row.position,
        profit: row.profit,
      };
    }
  }

  for (const category of ['manual', 'algo'] as const) {
    const oppositeCategory = category === 'manual' ? 'algo' : 'manual';

    for (const row of leaderboardData[category]) {
      const processedTeam = processedTeams[parseInt(row.teamId)];
      const result = processedTeam.results[i]!;

      if (result[category] !== null && result[oppositeCategory] === null) {
        result[oppositeCategory] = {
          rank: null,
          profit: result.overall.profit - result[category]!.profit,
        };
      }
    }
  }
}

function getValueDeltaPair(
  results: ProcessedTeam['results'],
  round: number,
  category: keyof ProcessedResult,
  item: keyof ProcessedResultCategory,
): (number | null)[] {
  const currentResult = results[round];
  if (currentResult === null) {
    return [null, null];
  }

  const currentCategory = currentResult[category];
  if (currentCategory === null) {
    return [null, null];
  }

  const currentValue = currentCategory[item];
  if (currentValue === null) {
    return [null, null];
  }

  const previousResult = results[round - 1];
  if (previousResult === null || previousResult === undefined) {
    return [currentValue, null];
  }

  const previousCategory = previousResult[category];
  if (previousCategory === null) {
    return [currentValue, null];
  }

  const previousValue = previousCategory[item];
  if (previousValue === null) {
    return [currentValue, null];
  }

  const delta = item === 'rank' ? previousValue - currentValue : currentValue - previousValue;
  return [currentValue, delta > -1e-6 && delta < 1e-6 ? 0 : delta];
}

const rows: ProcessedData['rows'] = [];
for (const team of Object.values(processedTeams)) {
  const row: ProcessedRow = [team.name, team.country];

  for (let round = processedRounds.length - 1; round >= 0; round--) {
    row.push(...getValueDeltaPair(team.results, round, 'overall', 'rank'));
    row.push(...getValueDeltaPair(team.results, round, 'overall', 'profit'));
    row.push(...getValueDeltaPair(team.results, round, 'manual', 'profit'));
    row.push(...getValueDeltaPair(team.results, round, 'algo', 'profit'));
  }

  rows.push(row);
}

const data: ProcessedData = {
  rows,
  rounds: processedRounds,
};

writeFile('processed.json', JSON.stringify(data));
