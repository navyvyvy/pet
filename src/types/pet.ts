export type BarPosition = "top" | "bottom";

export type PetStageSize = "half" | "full" | "dynamic";

export type PetSourceType = "frames" | "spritesheet";

export type PlaybackDirection = "forward" | "reverse";

export type MovementFacing = "forward" | "reverse";

export type MovementMode = "still" | "walk";

export type MovementRange = "screen" | "local";

export type PetFrame = {
  index: number;
  filePath?: string;
  fileName?: string;
};

export type PetPlacement = {
  index: number;
  x: number;
  y: number;
};

export type PetDefinition = {
  id: string;
  name: string;
  sourceType: PetSourceType;
  frameCount: number;
  frameInterval: number;
  frameWidth: number;
  frameHeight: number;
  displayWidth: number;
  displayHeight: number;
  speed: number;
  movementDurationMs?: number;
  movementDistanceMultiplier?: number;
  instanceCount: number;
  isVisible?: boolean;
  playbackDirection?: PlaybackDirection;
  movementMode?: MovementMode;
  movementRange?: MovementRange;
  movementFacing?: MovementFacing;
  frames?: PetFrame[];
  frameMovement?: boolean[];
  placements?: PetPlacement[];
  spritesheetPath?: string;
  spritesheetFileName?: string;
  spritesheetWidth?: number;
  spritesheetHeight?: number;
  columns?: number;
  rows?: number;
};

export type PetInstanceState = {
  id: string;
  petId: string;
  x: number;
  y: number;
  movementDirection: 1 | -1;
  movementOriginX?: number;
  speed: number;
  currentFrame: number;
  frameElapsed: number;
};
