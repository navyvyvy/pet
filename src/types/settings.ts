import type { BarPosition, PetDefinition, PetStageSize } from "./pet";

export type AppLanguage = "ko" | "en";

export type AppSettings = {
  barPosition: BarPosition;
  petStageSize: PetStageSize;
  dynamicStagePadding: number;
  language: AppLanguage;
  selectedPetId?: string;
  pets: PetDefinition[];
  isPaused: boolean;
  movementEnabled: boolean;
  alwaysOnTop: boolean;
  lowSpecMode: boolean;
  maxInstanceCount: number;
};
