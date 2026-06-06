import { memo } from "react";
import type { PetDefinition, PetInstanceState } from "../types/pet";
import { getSpriteFrameRect } from "../lib/spriteUtils";
import { missingFrame, useImageDataUrl } from "../lib/imageUtils";

type Props = {
  pet: PetDefinition;
  instance: PetInstanceState;
  isDragging?: boolean;
  onPointerDown?: (
    instance: PetInstanceState,
    event: React.PointerEvent<HTMLElement>
  ) => void;
  onContextMenu?: (
    instance: PetInstanceState,
    event: React.MouseEvent<HTMLElement>
  ) => void;
};

function PetInstance({
  pet,
  instance,
  isDragging = false,
  onPointerDown,
  onContextMenu
}: Props) {
  const frameCount = Math.max(1, pet.frameCount);
  const frameIndex = instance.currentFrame % frameCount;
  const frame = pet.frames?.[frameIndex];
  const frameUrl = useImageDataUrl(pet.sourceType === "frames" ? frame?.filePath : undefined);
  const spriteUrl = useImageDataUrl(
    pet.sourceType === "spritesheet" ? pet.spritesheetPath : undefined
  );
  const forwardScale = pet.movementFacing === "reverse" ? 1 : -1;
  const transform = `translate3d(${instance.x}px, ${instance.y}px, 0) scaleX(${
    instance.movementDirection === 1 ? forwardScale : -forwardScale
  })`;
  const style = {
    width: pet.displayWidth,
    height: pet.displayHeight,
    left: 0,
    top: 0,
    transform
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    onPointerDown?.(instance, event);
  };
  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    onContextMenu?.(instance, event);
  };

  if (pet.sourceType === "spritesheet" && spriteUrl) {
    const columns = pet.columns ?? pet.frameCount;
    const rect = getSpriteFrameRect({
      frameIndex,
      frameWidth: pet.displayWidth,
      frameHeight: pet.displayHeight,
      columns
    });

    return (
      <div
        className={`pet-instance sprite-pet${isDragging ? " dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onContextMenu={handleContextMenu}
        style={{
          ...style,
          backgroundImage: `url("${spriteUrl}")`,
          backgroundSize: `${columns * pet.displayWidth}px ${
            (pet.rows ?? 1) * pet.displayHeight
          }px`,
          backgroundPosition: `-${rect.x}px -${rect.y}px`
        }}
      />
    );
  }

  return (
    <img
      className={`pet-instance${isDragging ? " dragging" : ""}`}
      src={frameUrl ?? missingFrame}
      alt=""
      draggable={false}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
      style={style}
    />
  );
}

export default memo(PetInstance);
