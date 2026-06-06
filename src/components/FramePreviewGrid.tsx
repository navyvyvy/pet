import type { PetDefinition } from "../types/pet";
import type { AppLanguage } from "../types/settings";
import { frameCanMove } from "../lib/frameMovement";
import { getCopy } from "../lib/i18n";
import { missingFrame, useImageDataUrl } from "../lib/imageUtils";
import { getSpriteFrameRect } from "../lib/spriteUtils";

type Props = {
  pet: PetDefinition;
  language: AppLanguage;
  onToggleFrameMovement?: (index: number) => void;
};

const PREVIEW_BOX_SIZE = 64;

function spritesheetColumns(pet: PetDefinition) {
  if (pet.columns) {
    return Math.max(1, pet.columns);
  }

  if (pet.spritesheetWidth) {
    return Math.max(1, Math.floor(pet.spritesheetWidth / Math.max(1, pet.frameWidth)));
  }

  return Math.max(1, pet.frameCount);
}

function spritesheetRows(pet: PetDefinition, columns: number) {
  if (pet.rows) {
    return Math.max(1, pet.rows);
  }

  if (pet.spritesheetHeight) {
    return Math.max(1, Math.floor(pet.spritesheetHeight / Math.max(1, pet.frameHeight)));
  }

  return Math.max(1, Math.ceil(pet.frameCount / columns));
}

function FrameMeta({
  pet,
  index,
  label,
  language,
  onToggleFrameMovement
}: {
  pet: PetDefinition;
  index: number;
  label: string;
  language: AppLanguage;
  onToggleFrameMovement?: (index: number) => void;
}) {
  const canMove = frameCanMove(pet.frameMovement, index);
  const text = getCopy(language);
  const motionLabel = canMove ? text.framePreview.moving : text.framePreview.stopped;

  return (
    <div className="frame-meta">
      <strong>{index + 1}</strong>
      <span>{label}</span>
      {onToggleFrameMovement ? (
        <button
          className={canMove ? "frame-motion-toggle active" : "frame-motion-toggle"}
          type="button"
          onClick={() => onToggleFrameMovement(index)}
        >
          {motionLabel}
        </button>
      ) : (
        <span>{motionLabel}</span>
      )}
    </div>
  );
}

function FramePreview({
  pet,
  index,
  language,
  onToggleFrameMovement
}: {
  pet: PetDefinition;
  index: number;
  language: AppLanguage;
  onToggleFrameMovement?: (index: number) => void;
}) {
  const text = getCopy(language);
  const frame = pet.frames?.[index];
  const frameUrl = useImageDataUrl(pet.sourceType === "frames" ? frame?.filePath : undefined);
  const spriteUrl = useImageDataUrl(
    pet.sourceType === "spritesheet" ? pet.spritesheetPath : undefined
  );

  if (pet.sourceType === "spritesheet" && spriteUrl) {
    const columns = spritesheetColumns(pet);
    const rows = spritesheetRows(pet, columns);
    const frameWidth = Math.max(1, pet.frameWidth);
    const frameHeight = Math.max(1, pet.frameHeight);
    const scale = Math.min(PREVIEW_BOX_SIZE / frameWidth, PREVIEW_BOX_SIZE / frameHeight);
    const previewWidth = Math.max(1, Math.round(frameWidth * scale));
    const previewHeight = Math.max(1, Math.round(frameHeight * scale));
    const rect = getSpriteFrameRect({
      frameIndex: index,
      frameWidth,
      frameHeight,
      columns
    });

    return (
      <div className="frame-tile">
        <div className="sprite-preview-frame">
          <div
            className="sprite-preview"
            style={{
              width: previewWidth,
              height: previewHeight,
              backgroundImage: `url("${spriteUrl}")`,
              backgroundSize: `${columns * frameWidth * scale}px ${rows * frameHeight * scale}px`,
              backgroundPosition: `-${rect.x * scale}px -${rect.y * scale}px`
            }}
          />
        </div>
        <FrameMeta
          pet={pet}
          index={index}
          label={pet.spritesheetFileName ?? text.framePreview.missing}
          language={language}
          onToggleFrameMovement={onToggleFrameMovement}
        />
      </div>
    );
  }

  return (
    <div className={frameUrl ? "frame-tile" : "frame-tile missing"}>
      <img src={frameUrl ?? missingFrame} alt="" draggable={false} />
      <FrameMeta
        pet={pet}
        index={index}
        label={frame?.fileName ?? text.framePreview.missing}
        language={language}
        onToggleFrameMovement={onToggleFrameMovement}
      />
    </div>
  );
}

export default function FramePreviewGrid({ pet, language, onToggleFrameMovement }: Props) {
  const text = getCopy(language);

  return (
    <div className="preview-wrap">
      <h3>{text.framePreview.title}</h3>
      <div className="frame-grid">
        {Array.from({ length: pet.frameCount }, (_, index) => (
          <FramePreview
            key={index}
            pet={pet}
            index={index}
            language={language}
            onToggleFrameMovement={onToggleFrameMovement}
          />
        ))}
      </div>
    </div>
  );
}
