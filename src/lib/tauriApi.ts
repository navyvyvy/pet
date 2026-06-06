import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../types/settings";

type HitRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ContentBounds = {
  top: number;
  bottom: number;
};

export function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

export async function loadSettings() {
  return invoke<AppSettings>("load_settings");
}

export async function saveSettings(settings: AppSettings) {
  return invoke<AppSettings>("save_settings", { settings });
}

export async function setBarPosition(position: AppSettings["barPosition"]) {
  return invoke<AppSettings>("set_bar_position", { position });
}

export async function setPetStageSize(stageSize: AppSettings["petStageSize"]) {
  return invoke<AppSettings>("set_pet_stage_size", { stageSize });
}

export async function setPaused(isPaused: boolean) {
  return invoke<AppSettings>("set_paused", { isPaused });
}

export async function setMovementEnabled(movementEnabled: boolean) {
  return invoke<AppSettings>("set_movement_enabled", { movementEnabled });
}

export async function setAlwaysOnTop(alwaysOnTop: boolean) {
  return invoke<AppSettings>("set_always_on_top", { alwaysOnTop });
}

export async function registerSelectedPaths(paths: string[]) {
  if (paths.length === 0) {
    return;
  }
  await invoke("register_selected_paths", { paths });
}

export async function readImageDataUrl(path: string) {
  return invoke<string>("read_image_data_url", { path });
}

export async function hideSettingsWindow() {
  return invoke("hide_settings_window");
}

export async function showSettingsWindow() {
  return invoke("show_settings_window");
}

export async function showPetSettingsWindow(petId: string) {
  return invoke("show_pet_settings_window", { petId });
}

export async function hidePetBar() {
  return invoke("hide_pet_bar");
}

export async function setPetBarHitRegions(regions: HitRegion[]) {
  if (!isTauriRuntime()) {
    return;
  }

  return invoke("set_pet_bar_hit_regions", { regions });
}

export async function setPetBarContentBounds(bounds: ContentBounds) {
  if (!isTauriRuntime()) {
    return 0;
  }

  return invoke<number>("set_pet_bar_content_bounds", { bounds });
}

export async function quitApp() {
  return invoke("quit_app");
}
