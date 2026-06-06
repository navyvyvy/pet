export function normalizedFrameMovement(frameMovement: boolean[] | undefined, frameCount: number) {
  const count = Math.max(1, Math.floor(frameCount));
  return Array.from({ length: count }, (_, index) => frameMovement?.[index] ?? true);
}

export function frameCanMove(frameMovement: boolean[] | undefined, index: number) {
  return frameMovement?.[index] ?? true;
}

export function toggledFrameMovement(
  frameMovement: boolean[] | undefined,
  frameCount: number,
  index: number
) {
  const next = normalizedFrameMovement(frameMovement, frameCount);
  if (index >= 0 && index < next.length) {
    next[index] = !next[index];
  }
  return next;
}
