import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Check, Pause, Play, Power, Settings, X } from "lucide-react";
import CharacterEditor from "./CharacterEditor";
import CharacterList from "./CharacterList";
import {
  DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER,
  DEFAULT_MOVEMENT_DURATION_MS,
  DEFAULT_SETTINGS,
  PERFORMANCE_WARNING_COUNT
} from "../lib/defaults";
import { normalizedFrameMovement } from "../lib/frameMovement";
import { getCopy } from "../lib/i18n";
import { scalePetDisplay } from "../lib/petSizing";
import { useSyncedSettings } from "../lib/settingsStore";
import {
  hideSettingsWindow,
  isTauriRuntime,
  quitApp,
  saveSettings,
  setAlwaysOnTop,
  setBarPosition,
  setMovementEnabled,
  setPaused,
  setPetStageSize
} from "../lib/tauriApi";
import type { AppSettings } from "../types/settings";
import type { PetDefinition } from "../types/pet";

type Mode =
  | { type: "list" }
  | { type: "add" }
  | { type: "edit"; pet: PetDefinition };

export default function SettingsWindow() {
  const { settings, setSettings, isLoading } = useSyncedSettings();
  const text = getCopy(settings.language);
  const [mode, setMode] = useState<Mode>({ type: "list" });
  const [draftMax, setDraftMax] = useState(DEFAULT_SETTINGS.maxInstanceCount);
  const [draftDynamicPadding, setDraftDynamicPadding] = useState(
    DEFAULT_SETTINGS.dynamicStagePadding
  );
  const [pendingEditPetId, setPendingEditPetId] = useState<string | null>(null);
  const visibleInstanceCount = useMemo(
    () =>
      settings.pets.reduce((total, pet) => {
        if (pet.isVisible === false) {
          return total;
        }

        return total + Math.max(1, Math.floor(pet.instanceCount || 1));
      }, 0),
    [settings.pets]
  );

  useEffect(() => {
    setDraftMax(settings.maxInstanceCount);
  }, [settings.maxInstanceCount]);

  useEffect(() => {
    setDraftDynamicPadding(settings.dynamicStagePadding);
  }, [settings.dynamicStagePadding]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let unlisten: (() => void) | undefined;
    void listen<string>("edit-pet", (event) => {
      setPendingEditPetId(event.payload);
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!pendingEditPetId) {
      return;
    }

    const pet = settings.pets.find((item) => item.id === pendingEditPetId);
    if (!pet) {
      return;
    }

    setMode({ type: "edit", pet });
    setPendingEditPetId(null);
  }, [pendingEditPetId, settings.pets]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        void hideSettingsWindow();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function persist(nextSettings: AppSettings) {
    const saved = await saveSettings(nextSettings);
    setSettings(saved);
  }

  async function handlePositionChange(position: AppSettings["barPosition"]) {
    const saved = await setBarPosition(position);
    setSettings(saved);
  }

  async function handleStageSizeChange(stageSize: AppSettings["petStageSize"]) {
    const saved = await setPetStageSize(stageSize);
    setSettings(saved);
  }

  async function handlePauseChange(isPaused: boolean) {
    const saved = await setPaused(isPaused);
    setSettings(saved);
  }

  async function handleMovementEnabledChange(movementEnabled: boolean) {
    const saved = await setMovementEnabled(movementEnabled);
    setSettings(saved);
  }

  async function handleAlwaysOnTopChange(alwaysOnTop: boolean) {
    const saved = await setAlwaysOnTop(alwaysOnTop);
    setSettings(saved);
  }

  async function handleLanguageChange(language: AppSettings["language"]) {
    await persist({ ...settings, language });
  }

  async function handleLowSpecModeChange(lowSpecMode: boolean) {
    await persist({ ...settings, lowSpecMode });
  }

  async function handleTogglePetVisible(petId: string) {
    const pets = settings.pets.map((pet) =>
      pet.id === petId ? { ...pet, isVisible: pet.isVisible === false } : pet
    );
    await persist({ ...settings, pets });
  }

  async function handleTogglePetMovement(petId: string) {
    const pets = settings.pets.map((pet) =>
      pet.id === petId
        ? {
            ...pet,
            movementMode: pet.movementMode === "walk" ? ("still" as const) : ("walk" as const)
          }
        : pet
    );
    await persist({ ...settings, pets });
  }

  async function handleScalePet(petId: string, factor: number) {
    const pets = settings.pets.map((pet) =>
      pet.id === petId ? scalePetDisplay(pet, factor) : pet
    );
    await persist({ ...settings, pets });
  }

  async function handleDeletePet(petId: string) {
    const pets = settings.pets.filter((pet) => pet.id !== petId);
    const selectedPetId =
      settings.selectedPetId === petId ? pets[0]?.id : settings.selectedPetId;
    await persist({ ...settings, pets, selectedPetId });
  }

  async function handleSavePet(pet: PetDefinition, maxInstanceCount: number) {
    const frameCount = Math.max(1, Math.min(pet.frameCount, 60));
    const normalizedPet = {
      ...pet,
      instanceCount: Math.max(1, Math.min(pet.instanceCount || 1, maxInstanceCount)),
      isVisible: pet.isVisible ?? true,
      movementMode: pet.movementMode ?? "still",
      movementRange: pet.movementRange ?? "screen",
      movementDurationMs: Math.max(1_000, pet.movementDurationMs ?? DEFAULT_MOVEMENT_DURATION_MS),
      movementDistanceMultiplier: Math.max(
        0.25,
        pet.movementDistanceMultiplier ?? DEFAULT_MOVEMENT_DISTANCE_MULTIPLIER
      ),
      movementFacing: pet.movementFacing ?? "forward",
      playbackDirection: pet.playbackDirection ?? "forward",
      frameCount,
      frameMovement: normalizedFrameMovement(pet.frameMovement, frameCount)
    };
    const exists = settings.pets.some((item) => item.id === normalizedPet.id);
    const pets = exists
      ? settings.pets.map((item) => (item.id === normalizedPet.id ? normalizedPet : item))
      : [...settings.pets, normalizedPet];

    await persist({
      ...settings,
      pets,
      selectedPetId: settings.selectedPetId ?? normalizedPet.id,
      maxInstanceCount
    });
    setMode({ type: "list" });
  }

  async function handleSaveAppSettings() {
    const maxInstanceCount = Math.max(1, Math.floor(draftMax || 1));
    await persist({ ...settings, maxInstanceCount });
  }

  async function handleSaveDynamicPadding() {
    const dynamicStagePadding = Math.max(0, Math.floor(draftDynamicPadding || 0));
    await persist({ ...settings, dynamicStagePadding });
  }

  if (isLoading) {
    return <main className="settings-shell loading-shell" />;
  }

  return (
    <main className="settings-shell">
      <header className="app-toolbar">
        <div>
          <h1>PetPlayer</h1>
          <p>
            {text.settings.displayCount}{" "}
            {Math.min(visibleInstanceCount, settings.maxInstanceCount)} /{" "}
            {settings.maxInstanceCount}
          </p>
        </div>
        <div className="toolbar-actions">
          <button
            className="icon-button"
            type="button"
            onClick={() => handlePauseChange(!settings.isPaused)}
            title={settings.isPaused ? text.common.resume : text.common.pause}
            aria-label={settings.isPaused ? text.common.resume : text.common.pause}
          >
            {settings.isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => hideSettingsWindow()}
            title={text.common.close}
            aria-label={text.common.close}
          >
            <X size={18} />
          </button>
          <button
            className="icon-button danger"
            type="button"
            onClick={() => quitApp()}
            title={text.common.quit}
            aria-label={text.common.quit}
          >
            <Power size={18} />
          </button>
        </div>
      </header>

      <section className="settings-band">
        <div className="field-group">
          <span className="field-label">{text.settings.barPosition}</span>
          <div className="segmented-control" aria-label={text.settings.barPosition}>
            <button
              type="button"
              className={settings.barPosition === "top" ? "active" : ""}
              onClick={() => handlePositionChange("top")}
            >
              {text.settings.top}
            </button>
            <button
              type="button"
              className={settings.barPosition === "bottom" ? "active" : ""}
              onClick={() => handlePositionChange("bottom")}
            >
              {text.settings.bottom}
            </button>
          </div>
        </div>

        <div className="field-group">
          <span className="field-label">{text.settings.stageArea}</span>
          <div className="segmented-control three-way" aria-label={text.settings.stageArea}>
            <button
              type="button"
              className={settings.petStageSize === "half" ? "active" : ""}
              onClick={() => handleStageSizeChange("half")}
            >
              {text.settings.half}
            </button>
            <button
              type="button"
              className={settings.petStageSize === "full" ? "active" : ""}
              onClick={() => handleStageSizeChange("full")}
            >
              {text.settings.full}
            </button>
            <button
              type="button"
              className={settings.petStageSize === "dynamic" ? "active" : ""}
              onClick={() => handleStageSizeChange("dynamic")}
            >
              {text.settings.dynamic}
            </button>
          </div>
        </div>

        <div className="field-group compact-number">
          <label htmlFor="dynamic-padding">{text.settings.dynamicPadding}</label>
          <input
            id="dynamic-padding"
            type="number"
            min={0}
            step={20}
            value={draftDynamicPadding}
            onChange={(event) => setDraftDynamicPadding(Number(event.target.value))}
          />
          <button type="button" className="icon-button strong" onClick={handleSaveDynamicPadding}>
            <Check size={18} />
          </button>
        </div>

        <div className="field-group compact-number">
          <label htmlFor="max-instance">{text.settings.maxInstances}</label>
          <input
            id="max-instance"
            type="number"
            min={1}
            value={draftMax}
            onChange={(event) => setDraftMax(Number(event.target.value))}
          />
          <button type="button" className="icon-button strong" onClick={handleSaveAppSettings}>
            <Check size={18} />
          </button>
        </div>

        <div className="field-group">
          <span className="field-label">{text.settings.language}</span>
          <div className="segmented-control" aria-label={text.settings.language}>
            <button
              type="button"
              className={settings.language === "ko" ? "active" : ""}
              onClick={() => handleLanguageChange("ko")}
            >
              {text.settings.korean}
            </button>
            <button
              type="button"
              className={settings.language === "en" ? "active" : ""}
              onClick={() => handleLanguageChange("en")}
            >
              {text.settings.english}
            </button>
          </div>
        </div>

        <div className="field-group">
          <span className="field-label">{text.settings.lowSpecMode}</span>
          <div className="segmented-control" aria-label={text.settings.lowSpecMode}>
            <button
              type="button"
              className={settings.lowSpecMode ? "active" : ""}
              onClick={() => handleLowSpecModeChange(true)}
            >
              {text.common.on}
            </button>
            <button
              type="button"
              className={!settings.lowSpecMode ? "active" : ""}
              onClick={() => handleLowSpecModeChange(false)}
            >
              {text.common.off}
            </button>
          </div>
        </div>

        <div className="field-group">
          <span className="field-label">{text.settings.movement}</span>
          <div className="segmented-control" aria-label={text.settings.movement}>
            <button
              type="button"
              className={settings.movementEnabled ? "active" : ""}
              onClick={() => handleMovementEnabledChange(true)}
            >
              {text.common.on}
            </button>
            <button
              type="button"
              className={!settings.movementEnabled ? "active" : ""}
              onClick={() => handleMovementEnabledChange(false)}
            >
              {text.common.off}
            </button>
          </div>
        </div>

        <div className="field-group">
          <span className="field-label">{text.settings.alwaysOnTop}</span>
          <div className="segmented-control" aria-label={text.settings.alwaysOnTop}>
            <button
              type="button"
              className={settings.alwaysOnTop ? "active" : ""}
              onClick={() => handleAlwaysOnTopChange(true)}
            >
              {text.common.on}
            </button>
            <button
              type="button"
              className={!settings.alwaysOnTop ? "active" : ""}
              onClick={() => handleAlwaysOnTopChange(false)}
            >
              {text.common.off}
            </button>
          </div>
        </div>

        {draftMax > PERFORMANCE_WARNING_COUNT ? (
          <p className="warning-text">{text.settings.performanceWarning}</p>
        ) : null}
      </section>

      {mode.type === "list" ? (
        <CharacterList
          settings={settings}
          onAdd={() => setMode({ type: "add" })}
          onEdit={(pet) => setMode({ type: "edit", pet })}
          onDelete={handleDeletePet}
          onToggleVisible={handleTogglePetVisible}
          onToggleMovement={handleTogglePetMovement}
          onScale={handleScalePet}
        />
      ) : (
        <CharacterEditor
          settings={settings}
          pet={mode.type === "edit" ? mode.pet : undefined}
          onCancel={() => setMode({ type: "list" })}
          onSave={handleSavePet}
        />
      )}

      <footer className="settings-footer">
        <Settings size={16} />
        <span>{text.settings.appSettingsSaved}</span>
      </footer>
    </main>
  );
}
