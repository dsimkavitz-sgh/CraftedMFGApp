/**
 * Manufacturing stage pipeline — the single source of truth.
 *
 * To change the pipeline, edit this list. Stage values are stored as plain
 * text in Postgres (manufacturing_stage_events.stage) precisely so this list
 * can evolve without a migration.
 */
export const MANUFACTURING_STAGES = [
  "sampling",
  "production",
  "qc",
  "ready_to_ship",
  "shipped",
  "delivered",
] as const;

export type ManufacturingStage = (typeof MANUFACTURING_STAGES)[number];

export const STAGE_LABELS: Record<ManufacturingStage, string> = {
  sampling: "Sampling",
  production: "Production",
  qc: "QC",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  delivered: "Delivered",
};

export function isManufacturingStage(value: string): value is ManufacturingStage {
  return (MANUFACTURING_STAGES as readonly string[]).includes(value);
}

export function stageIndex(stage: string): number {
  return (MANUFACTURING_STAGES as readonly string[]).indexOf(stage);
}

/** The stage after `stage`, or null if it's the last (or unknown). */
export function nextStage(stage: string): ManufacturingStage | null {
  const i = stageIndex(stage);
  if (i === -1 || i === MANUFACTURING_STAGES.length - 1) return null;
  return MANUFACTURING_STAGES[i + 1] ?? null;
}
