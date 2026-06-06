import { BAR_HEIGHT } from "./defaults";
import type { BarPosition } from "../types/pet";

export type WorkArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function calculatePetBarBounds(params: {
  workArea: WorkArea;
  position: BarPosition;
  windowHeight?: number;
}) {
  const height = params.windowHeight ?? BAR_HEIGHT;
  return {
    x: params.workArea.x,
    y:
      params.position === "top"
        ? params.workArea.y
        : params.workArea.y + params.workArea.height - height,
    width: params.workArea.width,
    height
  };
}
