import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PetDefinition, PetInstanceState } from "../types/pet";
import {
  DEFAULT_DYNAMIC_STAGE_PADDING,
  DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER,
  DEFAULT_MOVEMENT_DURATION_MS
} from "../lib/defaults";
import { frameCanMove } from "../lib/frameMovement";
import { getCopy } from "../lib/i18n";
import { useSyncedSettings } from "../lib/settingsStore";
import {
  hidePetBar,
  quitApp,
  saveSettings,
  setAlwaysOnTop,
  setBarPosition,
  setMovementEnabled,
  setPetBarContentBounds,
  setPetBarHitRegions,
  setPetStageSize,
  setPaused,
  showPetSettingsWindow,
  showSettingsWindow
} from "../lib/tauriApi";
import type { AppSettings } from "../types/settings";
import PetInstance from "./PetInstance";

type ContextMenuPoint = {
  x: number;
  y: number;
  petId?: string;
};

type HitRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PetInstanceSpec = {
  id: string;
  pet: PetDefinition;
  instanceIndex: number;
  slot: number;
};

type DragState = {
  instanceId: string;
  petId: string;
  instanceIndex: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};

const CONTEXT_MENU_WIDTH = 184;
const CONTEXT_MENU_HEIGHT = 340;
const CONTEXT_MENU_MARGIN = 4;
const HIT_REGION_PADDING = 10;
const NORMAL_HIT_REGION_UPDATE_INTERVAL = 150;
const LOW_SPEC_HIT_REGION_UPDATE_INTERVAL = 500;
const MIN_DYNAMIC_STAGE_HEIGHT = 32;
const NORMAL_VISUAL_UPDATE_INTERVAL = 33;
const LOW_SPEC_VISUAL_UPDATE_INTERVAL = 100;
const POSITION_RENDER_EPSILON = 0.001;
const STILL_LAYOUT_PADDING = 0;
const STILL_LAYOUT_GAP = 12;

function hitRegionUpdateInterval(lowSpecMode: boolean) {
  return lowSpecMode ? LOW_SPEC_HIT_REGION_UPDATE_INTERVAL : NORMAL_HIT_REGION_UPDATE_INTERVAL;
}

function visualUpdateInterval(lowSpecMode: boolean) {
  return lowSpecMode ? LOW_SPEC_VISUAL_UPDATE_INTERVAL : NORMAL_VISUAL_UPDATE_INTERVAL;
}

function contextMenuPoint(x: number, y: number): ContextMenuPoint {
  return {
    x: Math.max(
      CONTEXT_MENU_MARGIN,
      Math.min(x, window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_MARGIN)
    ),
    y: Math.max(
      CONTEXT_MENU_MARGIN,
      Math.min(y, window.innerHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_MARGIN)
    )
  };
}

function makeVisibleInstanceSpecs(
  pets: PetDefinition[],
  maxInstanceCount: number
): PetInstanceSpec[] {
  const specs: PetInstanceSpec[] = [];
  const maxCount = Math.max(1, Math.floor(maxInstanceCount || 1));

  for (const pet of pets) {
    if (pet.isVisible === false) {
      continue;
    }

    const instanceCount = Math.max(1, Math.floor(pet.instanceCount || 1));
    for (let index = 0; index < instanceCount && specs.length < maxCount; index += 1) {
      specs.push({
        id: `${pet.id}-${index}`,
        pet,
        instanceIndex: index,
        slot: specs.length
      });
    }

    if (specs.length >= maxCount) {
      break;
    }
  }

  return specs;
}

function stageHeight() {
  return Math.max(1, window.innerHeight || 1);
}

function canMovePet(pet: PetDefinition, movementEnabled: boolean) {
  return movementEnabled && pet.movementMode === "walk";
}

function savedPlacement(spec: PetInstanceSpec) {
  return spec.pet.placements?.find((placement) => placement.index === spec.instanceIndex);
}

function clampPetPosition(pet: PetDefinition, x: number, y: number, width: number, height: number) {
  return {
    x: Math.max(0, Math.min(x, Math.max(0, width - pet.displayWidth))),
    y: Math.max(0, Math.min(y, Math.max(0, height - pet.displayHeight)))
  };
}

function movementBounds(pet: PetDefinition, instance: PetInstanceState) {
  const maxX = Math.max(0, window.innerWidth - pet.displayWidth);
  if (pet.movementRange !== "local") {
    return { minX: 0, maxX };
  }

  const multiplier = Math.max(
    0.25,
    pet.movementDistanceMultiplier ?? DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER
  );
  const span = Math.min(maxX, Math.max(0, pet.displayWidth * multiplier));
  const originX = instance.movementOriginX ?? instance.x;
  const minX = Math.max(0, Math.min(originX - span / 2, maxX - span));

  return {
    minX,
    maxX: minX + span
  };
}

function movementDelta(pet: PetDefinition, bounds: { minX: number; maxX: number }, delta: number) {
  const duration = Math.max(1_000, pet.movementDurationMs ?? DEFAULT_MOVEMENT_DURATION_MS);
  const distance = Math.max(0, bounds.maxX - bounds.minX);
  return (distance / duration) * delta;
}

function makeInstance(spec: PetInstanceSpec, width: number, height: number): PetInstanceState {
  const { pet, instanceIndex, slot } = spec;
  const maxX = Math.max(0, width - pet.displayWidth);
  const frameCount = Math.max(1, pet.frameCount);
  const maxY = Math.max(0, height - pet.displayHeight);
  const y = Math.min(maxY, 16 + (slot * 22) % Math.max(1, maxY + 1));

  return {
    id: spec.id,
    petId: pet.id,
    x: Math.random() * maxX,
    y,
    movementDirection: Math.random() > 0.5 ? 1 : -1,
    movementOriginX: undefined,
    speed: pet.speed,
    currentFrame: (slot + instanceIndex) % frameCount,
    frameElapsed: Math.random() * Math.max(16, pet.frameInterval)
  };
}

function stillPositions(specs: PetInstanceSpec[], width: number, height: number) {
  const positions = new Map<string, { x: number; y: number }>();
  const totalPetWidth = specs.reduce((total, spec) => total + Math.max(1, spec.pet.displayWidth), 0);
  const availableGapWidth = Math.max(0, width - STILL_LAYOUT_PADDING * 2 - totalPetWidth);
  const gap =
    specs.length > 1 ? Math.min(STILL_LAYOUT_GAP, availableGapWidth / (specs.length - 1)) : 0;
  let x = STILL_LAYOUT_PADDING;

  for (const spec of specs) {
    const pet = spec.pet;
    const petWidth = Math.max(1, pet.displayWidth);
    const petHeight = Math.max(1, pet.displayHeight);
    const y = Math.max(0, height - STILL_LAYOUT_PADDING - petHeight);
    positions.set(spec.id, { x, y });
    x += petWidth + gap;
  }

  return positions;
}

function syncInstances(
  current: PetInstanceState[],
  specs: PetInstanceSpec[],
  width: number,
  height: number
): PetInstanceState[] {
  const currentById = new Map(current.map((instance) => [instance.id, instance]));
  const stillById = stillPositions(specs, width, height);

  return specs.map((spec) => {
    const { pet } = spec;
    const frameCount = Math.max(1, pet.frameCount);
    const maxX = Math.max(0, width - pet.displayWidth);
    const maxY = Math.max(0, height - pet.displayHeight);
    const existing = currentById.get(spec.id);
    const stillPosition = stillById.get(spec.id);
    const placement = savedPlacement(spec);
    const placedPosition = placement
      ? clampPetPosition(pet, placement.x, placement.y, width, height)
      : undefined;
    const usesFreePosition = pet.movementMode === "walk";

    if (!existing) {
      const instance = makeInstance(spec, width, height);
      if (placedPosition) {
        return {
          ...instance,
          x: placedPosition.x,
          y: placedPosition.y,
          movementOriginX: pet.movementRange === "local" ? placedPosition.x : undefined
        };
      }

      return usesFreePosition || !stillPosition
        ? instance
        : {
            ...instance,
            x: stillPosition.x,
            y: stillPosition.y,
            movementOriginX: pet.movementRange === "local" ? stillPosition.x : undefined
          };
    }

    const nextX =
      usesFreePosition || (!placedPosition && !stillPosition)
        ? Math.max(0, Math.min(existing.x, maxX))
        : (placedPosition ?? stillPosition)?.x ?? existing.x;
    const nextY =
      usesFreePosition || (!placedPosition && !stillPosition)
        ? Math.max(0, Math.min(existing.y, maxY))
        : (placedPosition ?? stillPosition)?.y ?? existing.y;

    return {
      ...existing,
      id: spec.id,
      petId: pet.id,
      x: nextX,
      y: nextY,
      movementOriginX:
        pet.movementRange === "local" ? placedPosition?.x ?? existing.movementOriginX ?? nextX : undefined,
      speed: pet.speed,
      currentFrame: existing.currentFrame % frameCount
    };
  });
}

function buildHitRegions(
  instances: PetInstanceState[],
  petsById: Map<string, PetDefinition>,
  contextMenu: ContextMenuPoint | null
): HitRegion[] {
  const scale = window.devicePixelRatio || 1;
  const regions = instances.flatMap((instance) => {
    const pet = petsById.get(instance.petId);
    if (!pet) {
      return [];
    }

    const x = Math.max(0, instance.x - HIT_REGION_PADDING);
    const y = Math.max(0, instance.y - HIT_REGION_PADDING);
    const width = pet.displayWidth + HIT_REGION_PADDING * 2;
    const height = pet.displayHeight + HIT_REGION_PADDING * 2;

    return [
      {
        x: Math.floor(x * scale),
        y: Math.floor(y * scale),
        width: Math.ceil(width * scale),
        height: Math.ceil(height * scale)
      }
    ];
  });

  if (contextMenu) {
    regions.push({
      x: Math.floor(contextMenu.x * scale),
      y: Math.floor(contextMenu.y * scale),
      width: Math.ceil(CONTEXT_MENU_WIDTH * scale),
      height: Math.ceil(CONTEXT_MENU_HEIGHT * scale)
    });
  }

  return regions;
}

function hitRegionSignature(regions: HitRegion[]) {
  return regions
    .map((region) => `${region.x},${region.y},${region.width},${region.height}`)
    .join("|");
}

function fullWindowHitRegion(): HitRegion {
  const scale = window.devicePixelRatio || 1;
  return {
    x: 0,
    y: 0,
    width: Math.ceil(window.innerWidth * scale),
    height: Math.ceil(window.innerHeight * scale)
  };
}

export default function PetLayer() {
  const { settings, setSettings, isLoading } = useSyncedSettings();
  const text = getCopy(settings.language);
  const visibleInstanceSpecs = useMemo(
    () => makeVisibleInstanceSpecs(settings.pets, settings.maxInstanceCount),
    [settings.maxInstanceCount, settings.pets]
  );
  const petsById = useMemo(
    () => new Map(settings.pets.map((pet) => [pet.id, pet])),
    [settings.pets]
  );
  const instanceSpecsById = useMemo(
    () => new Map(visibleInstanceSpecs.map((spec) => [spec.id, spec])),
    [visibleInstanceSpecs]
  );
  const [instances, setInstances] = useState<PetInstanceState[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuPoint | null>(null);
  const [draggingInstanceId, setDraggingInstanceId] = useState<string | null>(null);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const animationDeltaRef = useRef(0);
  const frameElapsedByIdRef = useRef(new Map<string, number>());
  const lastHitRegionUpdateRef = useRef(0);
  const lastHitRegionSignatureRef = useRef("");
  const lastDynamicBoundsCheckRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const dynamicBoundsRef = useRef({ top: -1, bottom: -1 });
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    lastTimeRef.current = undefined;
    animationDeltaRef.current = 0;
    const liveInstanceIds = new Set(visibleInstanceSpecs.map((spec) => spec.id));
    for (const instanceId of frameElapsedByIdRef.current.keys()) {
      if (!liveInstanceIds.has(instanceId)) {
        frameElapsedByIdRef.current.delete(instanceId);
      }
    }

    setInstances((current) =>
      syncInstances(current, visibleInstanceSpecs, window.innerWidth, stageHeight())
    );
  }, [visibleInstanceSpecs]);

  useEffect(() => {
    function onResize() {
      setInstances((current) =>
        syncInstances(current, visibleInstanceSpecs, window.innerWidth, stageHeight())
      );
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visibleInstanceSpecs]);

  useEffect(() => {
    let frameId = 0;

    function tick(time: number) {
      const previous = lastTimeRef.current ?? time;
      const rawDelta = Math.min(100, time - previous);
      lastTimeRef.current = time;

      if (settings.isPaused || visibleInstanceSpecs.length === 0) {
        animationDeltaRef.current = 0;
        frameId = requestAnimationFrame(tick);
        return;
      }

      animationDeltaRef.current += rawDelta;
      if (animationDeltaRef.current < visualUpdateInterval(settings.lowSpecMode)) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const delta = Math.min(250, animationDeltaRef.current);
      animationDeltaRef.current = 0;

      setInstances((current) => {
        let changed = false;
        const nextInstances: PetInstanceState[] = [];

        for (const instance of current) {
          const pet = petsById.get(instance.petId);
          if (!pet) {
            changed = true;
            continue;
          }

          const isDragging = dragRef.current?.instanceId === instance.id;
          const frameCount = Math.max(1, pet.frameCount);
          const frameInterval = Math.max(16, pet.frameInterval);
          let movementDirection = instance.movementDirection;
          let x = instance.x;

          if (
            !isDragging &&
            canMovePet(pet, settings.movementEnabled) &&
            frameCanMove(pet.frameMovement, instance.currentFrame % frameCount)
          ) {
            const bounds = movementBounds(pet, instance);
            x += movementDelta(pet, bounds, delta) * movementDirection;

            if (x <= bounds.minX) {
              x = bounds.minX;
              movementDirection = 1;
            }

            if (x >= bounds.maxX) {
              x = bounds.maxX;
              movementDirection = -1;
            }
          }

          let frameElapsed =
            (frameElapsedByIdRef.current.get(instance.id) ?? instance.frameElapsed) + delta;
          let currentFrame = instance.currentFrame;

          while (frameElapsed >= frameInterval) {
            frameElapsed -= frameInterval;
            currentFrame =
              pet.playbackDirection === "reverse"
                ? (currentFrame - 1 + frameCount) % frameCount
                : (currentFrame + 1) % frameCount;
          }
          frameElapsedByIdRef.current.set(instance.id, frameElapsed);

          const movementOriginX =
            pet.movementRange === "local" ? instance.movementOriginX ?? x : undefined;
          const didVisualChange =
            Math.abs(x - instance.x) > POSITION_RENDER_EPSILON ||
            movementDirection !== instance.movementDirection ||
            currentFrame !== instance.currentFrame ||
            movementOriginX !== instance.movementOriginX ||
            pet.speed !== instance.speed;

          if (!didVisualChange) {
            nextInstances.push(instance);
            continue;
          }

          changed = true;
          nextInstances.push({
            ...instance,
            x,
            movementDirection,
            movementOriginX,
            speed: pet.speed,
            currentFrame,
            frameElapsed
          });
        }

        return changed ? nextInstances : current;
      });

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [
    petsById,
    settings.isPaused,
    settings.lowSpecMode,
    settings.movementEnabled,
    visibleInstanceSpecs.length
  ]);

  useEffect(() => {
    if (
      settings.petStageSize !== "dynamic" ||
      instances.length === 0 ||
      draggingInstanceId ||
      contextMenu
    ) {
      return;
    }

    const now = performance.now();
    const updateInterval = hitRegionUpdateInterval(settings.lowSpecMode);
    if (now - lastDynamicBoundsCheckRef.current < updateInterval) {
      return;
    }
    lastDynamicBoundsCheckRef.current = now;

    let top = Number.POSITIVE_INFINITY;
    let bottom = 0;

    for (const instance of instances) {
      const pet = petsById.get(instance.petId);
      if (!pet) {
        continue;
      }

      top = Math.min(top, instance.y);
      bottom = Math.max(bottom, instance.y + pet.displayHeight);
    }

    if (!Number.isFinite(top)) {
      return;
    }

    const dynamicPadding = Math.max(
      0,
      settings.dynamicStagePadding ?? DEFAULT_DYNAMIC_STAGE_PADDING
    );

    top = Math.floor(top - dynamicPadding);
    bottom = Math.ceil(bottom + dynamicPadding);

    if (bottom - top < MIN_DYNAMIC_STAGE_HEIGHT) {
      bottom = top + MIN_DYNAMIC_STAGE_HEIGHT;
    }

    const previous = dynamicBoundsRef.current;
    if (Math.abs(previous.top - top) < 2 && Math.abs(previous.bottom - bottom) < 2) {
      return;
    }

    dynamicBoundsRef.current = { top, bottom };
    void setPetBarContentBounds({ top, bottom }).then((appliedTop) => {
      if (Math.abs(appliedTop) <= 0.5) {
        return;
      }

      setInstances((current) =>
        current.map((instance) => ({
          ...instance,
          y: Math.max(0, instance.y - appliedTop)
        }))
      );
    });
  }, [
    contextMenu,
    draggingInstanceId,
    instances,
    petsById,
    settings.dynamicStagePadding,
    settings.lowSpecMode,
    settings.petStageSize
  ]);

  useEffect(() => {
    if (draggingInstanceId) {
      const regions = [fullWindowHitRegion()];
      const signature = hitRegionSignature(regions);
      if (signature !== lastHitRegionSignatureRef.current) {
        lastHitRegionSignatureRef.current = signature;
        void setPetBarHitRegions(regions);
      }
      return;
    }

    const now = performance.now();
    const hasOpenMenu = contextMenu !== null;
    const updateInterval = hitRegionUpdateInterval(settings.lowSpecMode);
    if (!hasOpenMenu && now - lastHitRegionUpdateRef.current < updateInterval) {
      return;
    }

    lastHitRegionUpdateRef.current = now;
    const regions = buildHitRegions(instances, petsById, contextMenu);
    const signature = hitRegionSignature(regions);
    if (signature === lastHitRegionSignatureRef.current) {
      return;
    }

    lastHitRegionSignatureRef.current = signature;
    void setPetBarHitRegions(regions);
  }, [contextMenu, draggingInstanceId, instances, petsById, settings.lowSpecMode]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeContextMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    }

    window.addEventListener("click", closeContextMenu);
    window.addEventListener("blur", closeContextMenu);
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("blur", closeContextMenu);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  async function persistDraggedPlacement(drag: DragState) {
    const currentSettings = settingsRef.current;
    const pets = currentSettings.pets.map((pet) => {
      if (pet.id !== drag.petId) {
        return pet;
      }

      const placements = [
        ...(pet.placements ?? []).filter((placement) => placement.index !== drag.instanceIndex),
        {
          index: drag.instanceIndex,
          x: Math.round(drag.x),
          y: Math.round(drag.y)
        }
      ].sort((a, b) => a.index - b.index);

      return { ...pet, placements };
    });

    try {
      const saved = await saveSettings({ ...currentSettings, pets });
      setSettings(saved);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      const pet = settingsRef.current.pets.find((item) => item.id === drag.petId);
      if (!pet) {
        return;
      }

      const position = clampPetPosition(
        pet,
        event.clientX - drag.offsetX,
        event.clientY - drag.offsetY,
        window.innerWidth,
        stageHeight()
      );
      drag.x = position.x;
      drag.y = position.y;

      setInstances((current) =>
        current.map((instance) =>
          instance.id === drag.instanceId
            ? {
                ...instance,
                x: position.x,
                y: position.y,
                movementOriginX: position.x
              }
            : instance
        )
      );
    }

    function finishDrag() {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      dragRef.current = null;
      setDraggingInstanceId(null);
      void persistDraggedPlacement(drag);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [setSettings]);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setContextMenu(contextMenuPoint(event.clientX, event.clientY));
  }, []);

  const handlePetContextMenu = useCallback(
    (instance: PetInstanceState, event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({
        ...contextMenuPoint(event.clientX, event.clientY),
        petId: instance.petId
      });
    },
    []
  );

  const handlePetPointerDown = useCallback(
    (instance: PetInstanceState, event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      const spec = instanceSpecsById.get(instance.id);
      if (!spec) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setContextMenu(null);
      const regions = [fullWindowHitRegion()];
      lastHitRegionSignatureRef.current = hitRegionSignature(regions);
      void setPetBarHitRegions(regions);

      dragRef.current = {
        instanceId: instance.id,
        petId: instance.petId,
        instanceIndex: spec.instanceIndex,
        offsetX: event.clientX - instance.x,
        offsetY: event.clientY - instance.y,
        x: instance.x,
        y: instance.y
      };
      setDraggingInstanceId(instance.id);
    },
    [instanceSpecsById]
  );

  async function updateSettings(action: () => Promise<AppSettings>) {
    setContextMenu(null);
    const saved = await action();
    setSettings(saved);
  }

  async function togglePetMovement(petId: string) {
    await updateSettings(() => {
      const currentSettings = settingsRef.current;
      const pets = currentSettings.pets.map((pet) =>
        pet.id === petId
          ? {
              ...pet,
              movementMode: pet.movementMode === "walk" ? ("still" as const) : ("walk" as const)
            }
          : pet
      );

      return saveSettings({ ...currentSettings, pets });
    });
  }

  async function toggleLowSpecMode() {
    await updateSettings(() => {
      const currentSettings = settingsRef.current;
      return saveSettings({
        ...currentSettings,
        lowSpecMode: !currentSettings.lowSpecMode
      });
    });
  }

  async function openSettings() {
    setContextMenu(null);
    await showSettingsWindow();
  }

  async function openPetSettings(petId: string) {
    setContextMenu(null);
    await showPetSettingsWindow(petId);
  }

  async function hideBar() {
    setContextMenu(null);
    await hidePetBar();
  }

  function menu() {
    if (!contextMenu) {
      return null;
    }

    const menuPet = contextMenu.petId ? petsById.get(contextMenu.petId) : undefined;
    const pauseLabel = settings.isPaused ? text.common.resume : text.common.pause;
    const positionLabel =
      settings.barPosition === "top" ? text.menu.moveToBottom : text.menu.moveToTop;
    const stageLabel =
      settings.petStageSize === "full" ? text.menu.stageHalf : text.menu.stageFull;
    const movementLabel = menuPet
      ? menuPet.movementMode === "walk"
        ? text.menu.petMovementOff
        : text.menu.petMovementOn
      : settings.movementEnabled
        ? text.menu.globalMovementOff
        : text.menu.globalMovementOn;
    const alwaysOnTopLabel = settings.alwaysOnTop
      ? text.menu.alwaysOnTopOff
      : text.menu.alwaysOnTopOn;
    const lowSpecLabel = settings.lowSpecMode ? text.menu.lowSpecOff : text.menu.lowSpecOn;

    return (
      <div
        className="pet-context-menu"
        role="menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => updateSettings(() => setPaused(!settings.isPaused))}
        >
          {pauseLabel}
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() =>
            updateSettings(() =>
              setBarPosition(settings.barPosition === "top" ? "bottom" : "top")
            )
          }
        >
          {positionLabel}
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() =>
            updateSettings(() =>
              setPetStageSize(settings.petStageSize === "full" ? "half" : "full")
            )
          }
        >
          {stageLabel}
        </button>
        {menuPet ? (
          <button type="button" role="menuitem" onClick={() => togglePetMovement(menuPet.id)}>
            {movementLabel}
          </button>
        ) : (
          <button
            type="button"
            role="menuitem"
            onClick={() => updateSettings(() => setMovementEnabled(!settings.movementEnabled))}
          >
            {movementLabel}
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          onClick={() => updateSettings(() => setAlwaysOnTop(!settings.alwaysOnTop))}
        >
          {alwaysOnTopLabel}
        </button>
        <button type="button" role="menuitem" onClick={toggleLowSpecMode}>
          {lowSpecLabel}
        </button>
        {contextMenu.petId ? (
          <button type="button" role="menuitem" onClick={() => openPetSettings(contextMenu.petId!)}>
            {text.menu.petProperties}
          </button>
        ) : null}
        <button type="button" role="menuitem" onClick={openSettings}>
          {text.menu.openSettings}
        </button>
        <button type="button" role="menuitem" onClick={hideBar}>
          {text.menu.hidePetBar}
        </button>
        <button type="button" role="menuitem" className="danger" onClick={() => quitApp()}>
          {text.common.quit}
        </button>
      </div>
    );
  }

  if (isLoading || visibleInstanceSpecs.length === 0) {
    return (
      <div
        className="pet-bar-surface"
        aria-label="PetPlayer pet bar"
        onContextMenu={handleContextMenu}
      >
        {menu()}
      </div>
    );
  }

  return (
    <div
      className="pet-bar-surface"
      aria-label="PetPlayer pet bar"
      onContextMenu={handleContextMenu}
    >
      {instances.map((instance) => {
        const pet = petsById.get(instance.petId);
        return pet ? (
          <PetInstance
            key={instance.id}
            instance={instance}
            pet={pet}
            isDragging={draggingInstanceId === instance.id}
            onPointerDown={handlePetPointerDown}
            onContextMenu={handlePetContextMenu}
          />
        ) : null;
      })}
      {menu()}
    </div>
  );
}
