export type ProcessedRow = (number | string | null)[];

export interface ProcessedData {
  rows: ProcessedRow[];
  uniqueTeamsByRound: number[];
  rankedTeamsByRound: number[];
}
