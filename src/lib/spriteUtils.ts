export function getSpriteFrameRect(params: {
  frameIndex: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
}) {
  const column = params.frameIndex % params.columns;
  const row = Math.floor(params.frameIndex / params.columns);

  return {
    x: column * params.frameWidth,
    y: row * params.frameHeight,
    width: params.frameWidth,
    height: params.frameHeight
  };
}
