import type { AppSettings } from "../types/settings";
import type { PetDefinition } from "../types/pet";

export const BAR_HEIGHT = 160;
export const DEFAULT_FRAME_COUNT = 12;
export const DEFAULT_FRAME_INTERVAL = 600;
export const DEFAULT_MOVEMENT_SPEED = 0.02;
export const DEFAULT_MOVEMENT_DURATION_MS = 80_000;
export const DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER = 2;
export const DEFAULT_DYNAMIC_STAGE_PADDING = 160;
export const DEFAULT_LANGUAGE = "ko";
export const DEFAULT_LOW_SPEC_MODE = false;
export const MAX_FRAME_COUNT = 60;
export const DEFAULT_MAX_INSTANCE_COUNT = 10;
export const PERFORMANCE_WARNING_COUNT = 20;

export const DEFAULT_PET: Omit<PetDefinition, "id" | "name"> = {
  sourceType: "frames",
  frameCount: DEFAULT_FRAME_COUNT,
  frameInterval: DEFAULT_FRAME_INTERVAL,
  frameWidth: 48,
  frameHeight: 48,
  displayWidth: 96,
  displayHeight: 96,
  speed: DEFAULT_MOVEMENT_SPEED,
  movementDurationMs: DEFAULT_MOVEMENT_DURATION_MS,
  movementDistanceMultiplier: DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER,
  instanceCount: 1,
  isVisible: true,
  playbackDirection: "forward",
  movementMode: "still",
  movementRange: "screen",
  movementFacing: "forward",
  frames: [],
  frameMovement: Array.from({ length: DEFAULT_FRAME_COUNT }, () => true)
};

export const DEFAULT_SETTINGS: AppSettings = {
  barPosition: "top",
  petStageSize: "dynamic",
  dynamicStagePadding: DEFAULT_DYNAMIC_STAGE_PADDING,
  language: DEFAULT_LANGUAGE,
  pets: [],
  isPaused: false,
  movementEnabled: true,
  alwaysOnTop: true,
  lowSpecMode: DEFAULT_LOW_SPEC_MODE,
  maxInstanceCount: DEFAULT_MAX_INSTANCE_COUNT
};

export function createDraftPet(_maxInstanceCount: number): PetDefinition {
  return {
    ...DEFAULT_PET,
    id: crypto.randomUUID(),
    name: "Pixel Pet",
    instanceCount: 1,
    isVisible: true,
    movementMode: "still",
    frameMovement: Array.from({ length: DEFAULT_FRAME_COUNT }, () => true),
    frames: []
  };
}
