export type ProcessedRow = (number | string | null)[];

export interface Round {
  label: string;
  registeredTeams: number;
  rankedTeams: number;
}

export interface ProcessedData {
  rows: ProcessedRow[];
  rounds: Round[];
}
