import type { PetDefinition } from "../types/pet";

export const PET_SCALE_FACTOR = 1.1;

const MIN_DISPLAY_SIZE = 16;
const MAX_DISPLAY_SIZE = 1024;

export function scaledPetDisplaySize(
  pet: Pick<PetDefinition, "displayWidth" | "displayHeight">,
  factor: number
) {
  const currentWidth = Math.max(1, pet.displayWidth);
  const currentHeight = Math.max(1, pet.displayHeight);
  const nextFactor =
    factor >= 1
      ? Math.min(factor, MAX_DISPLAY_SIZE / currentWidth, MAX_DISPLAY_SIZE / currentHeight)
      : Math.max(factor, MIN_DISPLAY_SIZE / currentWidth, MIN_DISPLAY_SIZE / currentHeight);

  return {
    displayWidth: Math.max(1, Math.round(currentWidth * nextFactor)),
    displayHeight: Math.max(1, Math.round(currentHeight * nextFactor))
  };
}

export function scalePetDisplay(pet: PetDefinition, factor: number): PetDefinition {
  return {
    ...pet,
    ...scaledPetDisplaySize(pet, factor)
  };
}
