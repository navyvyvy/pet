import { useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Save, X, ZoomIn, ZoomOut } from "lucide-react";
import FramePreviewGrid from "./FramePreviewGrid";
import {
  createDraftPet,
  DEFAULT_FRAME_INTERVAL,
  DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER,
  DEFAULT_MOVEMENT_DURATION_MS,
  DEFAULT_MOVEMENT_SPEED,
  MAX_FRAME_COUNT
} from "../lib/defaults";
import { normalizedFrameMovement, toggledFrameMovement } from "../lib/frameMovement";
import { fileNameFromPath, mapFilesToFrames } from "../lib/frameMapper";
import { getCopy } from "../lib/i18n";
import { clearImageCache } from "../lib/imageUtils";
import { PET_SCALE_FACTOR, scaledPetDisplaySize } from "../lib/petSizing";
import { readImageDataUrl, registerSelectedPaths } from "../lib/tauriApi";
import type { AppSettings } from "../types/settings";
import type {
  MovementFacing,
  MovementMode,
  MovementRange,
  PetDefinition,
  PetSourceType,
  PlaybackDirection
} from "../types/pet";

type Props = {
  settings: AppSettings;
  pet?: PetDefinition;
  onCancel: () => void;
  onSave: (pet: PetDefinition, maxInstanceCount: number) => void;
};

function numeric(value: FormDataEntryValue | null, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function countPngFiles(paths: string[]) {
  return paths.filter((path) => fileNameFromPath(path).toLowerCase().endsWith(".png")).length;
}

function spritesheetMetrics(params: {
  imageWidth?: number;
  imageHeight?: number;
  frameWidth: number;
  frameHeight: number;
  requestedFrameCount?: number;
}) {
  const frameWidth = Math.max(1, Math.floor(params.frameWidth));
  const frameHeight = Math.max(1, Math.floor(params.frameHeight));
  const fallbackFrameCount = Math.max(1, Math.floor(params.requestedFrameCount ?? 1));
  const columns = params.imageWidth
    ? Math.max(1, Math.floor(params.imageWidth / frameWidth))
    : fallbackFrameCount;
  const rows = params.imageHeight ? Math.max(1, Math.floor(params.imageHeight / frameHeight)) : 1;
  const capacity = Math.max(1, columns * rows);
  const frameCount = Math.max(
    1,
    Math.min(MAX_FRAME_COUNT, params.requestedFrameCount ?? capacity, capacity)
  );

  return { columns, rows, frameCount };
}

async function imageDimensions(path: string) {
  const dataUrl = await readImageDataUrl(path);
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = dataUrl;
  });
}

export default function CharacterEditor({ settings, pet, onCancel, onSave }: Props) {
  const text = getCopy(settings.language);
  const initialPet = useMemo(
    () => pet ?? createDraftPet(settings.maxInstanceCount),
    [pet, settings.maxInstanceCount]
  );
  const [draft, setDraft] = useState<PetDefinition>(initialPet);
  const [warnings, setWarnings] = useState<string[]>([]);

  function updateNumber<K extends keyof PetDefinition>(key: K, value: number) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateFrameSize(key: "frameWidth" | "frameHeight", value: number) {
    setDraft((current) => {
      const next = { ...current, [key]: Math.max(1, value) };
      if (next.sourceType !== "spritesheet") {
        return next;
      }

      const metrics = spritesheetMetrics({
        imageWidth: next.spritesheetWidth,
        imageHeight: next.spritesheetHeight,
        frameWidth: next.frameWidth,
        frameHeight: next.frameHeight,
        requestedFrameCount: next.frameCount
      });

      return {
        ...next,
        ...metrics,
        frameMovement: normalizedFrameMovement(next.frameMovement, metrics.frameCount)
      };
    });
  }

  function scaleDisplay(factor: number) {
    setDraft((current) => ({
      ...current,
      ...scaledPetDisplaySize(current, factor)
    }));
  }

  function updateSourceType(sourceType: PetSourceType) {
    setDraft((current) => ({
      ...current,
      sourceType,
      frames: sourceType === "frames" ? current.frames ?? [] : undefined,
      spritesheetPath: sourceType === "spritesheet" ? current.spritesheetPath : undefined,
      spritesheetFileName: sourceType === "spritesheet" ? current.spritesheetFileName : undefined,
      columns: sourceType === "spritesheet" ? current.frameCount : undefined,
      rows: sourceType === "spritesheet" ? 1 : undefined
    }));
    setWarnings([]);
  }

  async function chooseImages() {
    const result = await open({
      multiple: draft.sourceType === "frames",
      filters: [{ name: "PNG", extensions: ["png"] }]
    });

    if (!result) {
      return;
    }

    const paths = Array.isArray(result) ? result : [result];
    await registerSelectedPaths(paths);
    clearImageCache(paths);

    if (draft.sourceType === "frames") {
      const frameCount = Math.max(1, Math.min(MAX_FRAME_COUNT, countPngFiles(paths)));
      const mapped = mapFilesToFrames(
        paths.map((path) => ({ path, name: fileNameFromPath(path) })),
        frameCount,
        settings.language
      );
      setDraft((current) => ({
        ...current,
        frameCount,
        frameMovement: normalizedFrameMovement(current.frameMovement, frameCount),
        frames: mapped.frames
      }));
      setWarnings(mapped.warnings);
      return;
    }

    const path = paths[0];
    let dimensions: { width: number; height: number } | undefined;
    try {
      dimensions = await imageDimensions(path);
    } catch {
      dimensions = undefined;
    }

    setDraft((current) => {
      const metrics = spritesheetMetrics({
        imageWidth: dimensions?.width,
        imageHeight: dimensions?.height,
        frameWidth: current.frameWidth,
        frameHeight: current.frameHeight,
        requestedFrameCount: dimensions ? undefined : current.frameCount
      });

      return {
        ...current,
        ...metrics,
        frameMovement: normalizedFrameMovement(current.frameMovement, metrics.frameCount),
        spritesheetPath: path,
        spritesheetFileName: fileNameFromPath(path),
        spritesheetWidth: dimensions?.width,
        spritesheetHeight: dimensions?.height
      };
    });
    setWarnings([]);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const requestedFrameCount = Math.max(
      1,
      Math.min(MAX_FRAME_COUNT, numeric(form.get("frameCount"), 12))
    );
    const frameWidth = Math.max(1, numeric(form.get("frameWidth"), 48));
    const frameHeight = Math.max(1, numeric(form.get("frameHeight"), 48));
    const metrics =
      draft.sourceType === "spritesheet"
        ? spritesheetMetrics({
            imageWidth: draft.spritesheetWidth,
            imageHeight: draft.spritesheetHeight,
            frameWidth,
            frameHeight,
            requestedFrameCount
          })
        : undefined;
    const frameCount = metrics?.frameCount ?? requestedFrameCount;
    const nextPet: PetDefinition = {
      ...draft,
      name: String(form.get("name") || "Pixel Pet").trim() || "Pixel Pet",
      frameCount,
      frameMovement: normalizedFrameMovement(draft.frameMovement, frameCount),
      frameWidth,
      frameHeight,
      displayWidth: Math.max(1, numeric(form.get("displayWidth"), 96)),
      displayHeight: Math.max(1, numeric(form.get("displayHeight"), 96)),
      frameInterval: Math.max(16, numeric(form.get("frameInterval"), DEFAULT_FRAME_INTERVAL)),
      speed: Math.max(0, draft.speed ?? DEFAULT_MOVEMENT_SPEED),
      movementDurationMs: Math.max(
        1_000,
        numeric(
          form.get("movementDurationMs"),
          draft.movementDurationMs ?? DEFAULT_MOVEMENT_DURATION_MS
        )
      ),
      movementDistanceMultiplier: Math.max(
        0.25,
        numeric(
          form.get("movementDistanceMultiplier"),
          draft.movementDistanceMultiplier ?? DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER
        )
      ),
      playbackDirection: String(form.get("playbackDirection") || "forward") as PlaybackDirection,
      movementMode: String(form.get("movementMode") || "still") as MovementMode,
      movementRange: String(form.get("movementRange") || "screen") as MovementRange,
      movementFacing: String(form.get("movementFacing") || "forward") as MovementFacing,
      instanceCount: Math.max(
        1,
        Math.min(
          Math.floor(numeric(form.get("instanceCount"), draft.instanceCount || 1)),
          settings.maxInstanceCount
        )
      ),
      columns: draft.sourceType === "spritesheet" ? metrics?.columns ?? frameCount : undefined,
      rows: draft.sourceType === "spritesheet" ? metrics?.rows ?? 1 : undefined
    };

    onSave(nextPet, settings.maxInstanceCount);
  }

  return (
    <section className="editor-section">
      <div className="section-header">
        <h2>{pet ? text.editor.editTitle : text.editor.addTitle}</h2>
        <button type="button" className="icon-button" onClick={onCancel} aria-label={text.common.cancel}>
          <X size={18} />
        </button>
      </div>

      <form className="editor-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            {text.editor.name}
            <input
              name="name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label>
            {text.editor.sourceType}
            <select
              value={draft.sourceType}
              onChange={(event) => updateSourceType(event.target.value as PetSourceType)}
            >
              <option value="frames">{text.editor.sourceFrames}</option>
              <option value="spritesheet">{text.editor.sourceSpritesheet}</option>
            </select>
          </label>

          <label>
            {text.editor.frameCount}
            <input
              name="frameCount"
              type="number"
              min={1}
              max={MAX_FRAME_COUNT}
              value={draft.frameCount}
              onChange={(event) => {
                const frameCount = Math.max(1, Math.min(MAX_FRAME_COUNT, Number(event.target.value)));
                setDraft((current) => ({
                  ...current,
                  frameCount,
                  frameMovement: normalizedFrameMovement(current.frameMovement, frameCount),
                  ...(current.sourceType === "spritesheet"
                    ? spritesheetMetrics({
                        imageWidth: current.spritesheetWidth,
                        imageHeight: current.spritesheetHeight,
                        frameWidth: current.frameWidth,
                        frameHeight: current.frameHeight,
                        requestedFrameCount: frameCount
                      })
                    : {})
                }));
              }}
            />
          </label>

          <label>
            {text.editor.frameWidth}
            <input
              name="frameWidth"
              type="number"
              min={1}
              value={draft.frameWidth}
              onChange={(event) => updateFrameSize("frameWidth", Number(event.target.value))}
            />
          </label>

          <label>
            {text.editor.frameHeight}
            <input
              name="frameHeight"
              type="number"
              min={1}
              value={draft.frameHeight}
              onChange={(event) => updateFrameSize("frameHeight", Number(event.target.value))}
            />
          </label>

          <label>
            {text.editor.displayWidth}
            <input
              name="displayWidth"
              type="number"
              min={1}
              value={draft.displayWidth}
              onChange={(event) => updateNumber("displayWidth", Number(event.target.value))}
            />
          </label>

          <label>
            {text.editor.displayHeight}
            <input
              name="displayHeight"
              type="number"
              min={1}
              value={draft.displayHeight}
              onChange={(event) => updateNumber("displayHeight", Number(event.target.value))}
            />
          </label>

          <div className="field-button-group" aria-label={text.editor.displaySize}>
            <span>{text.editor.displaySize}</span>
            <div className="row-actions">
              <button
                className="icon-button"
                type="button"
                onClick={() => scaleDisplay(1 / PET_SCALE_FACTOR)}
                title={text.common.zoomOut}
                aria-label={text.common.zoomOut}
              >
                <ZoomOut size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => scaleDisplay(PET_SCALE_FACTOR)}
                title={text.common.zoomIn}
                aria-label={text.common.zoomIn}
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>

          <label>
            {text.editor.frameInterval}
            <input
              name="frameInterval"
              type="number"
              min={16}
              value={draft.frameInterval}
              onChange={(event) => updateNumber("frameInterval", Number(event.target.value))}
            />
          </label>

          <label>
            {text.editor.framePlayback}
            <select
              name="playbackDirection"
              value={draft.playbackDirection ?? "forward"}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  playbackDirection: event.target.value as PlaybackDirection
                }))
              }
            >
              <option value="forward">{text.editor.movementForward}</option>
              <option value="reverse">{text.editor.movementReverse}</option>
            </select>
          </label>

          <label>
            {text.editor.movementMode}
            <select
              name="movementMode"
              value={draft.movementMode ?? "still"}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  movementMode: event.target.value as MovementMode
                }))
              }
            >
              <option value="still">{text.common.still}</option>
              <option value="walk">{text.common.move}</option>
            </select>
          </label>

          <label>
            {text.editor.movementRange}
            <select
              name="movementRange"
              value={draft.movementRange ?? "screen"}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  movementRange: event.target.value as MovementRange
                }))
              }
            >
              <option value="screen">{text.editor.rangeScreen}</option>
              <option value="local">{text.editor.rangeLocal}</option>
            </select>
          </label>

          <label>
            {text.editor.movementDistance}
            <input
              name="movementDistanceMultiplier"
              type="number"
              min={0.25}
              step={0.25}
              value={draft.movementDistanceMultiplier ?? DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER}
              onChange={(event) =>
                updateNumber("movementDistanceMultiplier", Number(event.target.value))
              }
            />
          </label>

          <label>
            {text.editor.movementFacing}
            <select
              name="movementFacing"
              value={draft.movementFacing ?? "forward"}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  movementFacing: event.target.value as MovementFacing
                }))
              }
            >
              <option value="forward">{text.editor.playbackForward(draft.frameCount)}</option>
              <option value="reverse">{text.editor.playbackReverse(draft.frameCount)}</option>
            </select>
          </label>

          <label>
            {text.editor.movementDuration}
            <input
              name="movementDurationMs"
              type="number"
              min={1000}
              step={1000}
              value={draft.movementDurationMs ?? DEFAULT_MOVEMENT_DURATION_MS}
              onChange={(event) => updateNumber("movementDurationMs", Number(event.target.value))}
            />
          </label>

          <label>
            {text.editor.instanceCount}
            <input
              name="instanceCount"
              type="number"
              min={1}
              max={settings.maxInstanceCount}
              value={draft.instanceCount}
              onChange={(event) => updateNumber("instanceCount", Number(event.target.value))}
            />
          </label>
        </div>

        <div className="editor-actions">
          <button className="secondary-button" type="button" onClick={chooseImages}>
            <FolderOpen size={18} />
            {text.editor.chooseImages}
          </button>
          <button className="primary-button" type="submit">
            <Save size={18} />
            {text.common.save}
          </button>
        </div>

        {warnings.length > 0 ? (
          <ul className="warning-list">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}

        <FramePreviewGrid
          pet={draft}
          language={settings.language}
          onToggleFrameMovement={(index) =>
            setDraft((current) => ({
              ...current,
              frameMovement: toggledFrameMovement(current.frameMovement, current.frameCount, index)
            }))
          }
        />
      </form>
    </section>
  );
}
