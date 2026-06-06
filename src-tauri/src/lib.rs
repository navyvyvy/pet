mod settings;
mod tray;
mod windows;

use base64::Engine;
use settings::{AppSettings, SettingsState};
use std::path::Path;
use tauri::{Emitter, Manager, State};

#[tauri::command]
fn load_settings(state: State<SettingsState>) -> AppSettings {
    state.load()
}

#[tauri::command]
fn save_settings(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let settings = state.save(settings)?;
    windows::position_pet_bar(&app, settings.bar_position, settings.pet_stage_size)?;
    windows::set_pet_bar_always_on_top(&app, settings.always_on_top)?;
    emit_settings(&app, &settings);
    Ok(settings)
}

#[tauri::command]
fn set_bar_position(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    position: settings::BarPosition,
) -> Result<AppSettings, String> {
    let settings = state.update(|settings| {
        settings.bar_position = position;
    })?;
    windows::position_pet_bar(&app, settings.bar_position, settings.pet_stage_size)?;
    emit_settings(&app, &settings);
    Ok(settings)
}

#[tauri::command]
fn set_pet_stage_size(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    stage_size: settings::PetStageSize,
) -> Result<AppSettings, String> {
    let settings = state.update(|settings| {
        settings.pet_stage_size = stage_size;
    })?;
    windows::position_pet_bar(&app, settings.bar_position, settings.pet_stage_size)?;
    emit_settings(&app, &settings);
    Ok(settings)
}

#[tauri::command]
fn set_paused(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    is_paused: bool,
) -> Result<AppSettings, String> {
    let settings = state.update(|settings| {
        settings.is_paused = is_paused;
    })?;
    emit_settings(&app, &settings);
    Ok(settings)
}

#[tauri::command]
fn set_movement_enabled(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    movement_enabled: bool,
) -> Result<AppSettings, String> {
    let settings = state.update(|settings| {
        settings.movement_enabled = movement_enabled;
    })?;
    emit_settings(&app, &settings);
    Ok(settings)
}

#[tauri::command]
fn set_always_on_top(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    always_on_top: bool,
) -> Result<AppSettings, String> {
    let settings = state.update(|settings| {
        settings.always_on_top = always_on_top;
    })?;
    windows::set_pet_bar_always_on_top(&app, settings.always_on_top)?;
    emit_settings(&app, &settings);
    Ok(settings)
}

#[tauri::command]
fn register_selected_paths(state: State<SettingsState>, paths: Vec<String>) {
    state.register_paths(paths);
}

#[tauri::command]
fn read_image_data_url(state: State<SettingsState>, path: String) -> Result<String, String> {
    if !state.is_allowed_path(&path) {
        return Err("file path was not selected in PetPlayer".into());
    }

    let file_path = Path::new(&path);
    if file_path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| !extension.eq_ignore_ascii_case("png"))
        .unwrap_or(true)
    {
        return Err("only PNG files can be loaded".into());
    }

    let bytes = std::fs::read(file_path).map_err(|error| error.to_string())?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:image/png;base64,{encoded}"))
}

#[tauri::command]
fn hide_settings_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn show_settings_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.center();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn show_pet_settings_window(app: tauri::AppHandle, pet_id: String) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.center();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit_to("settings", "edit-pet", pet_id);
    }
}

#[tauri::command]
fn hide_pet_bar(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("pet-bar") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn set_pet_bar_hit_regions(
    app: tauri::AppHandle,
    regions: Vec<windows::HitRegion>,
) -> Result<(), String> {
    windows::set_pet_bar_hit_regions(&app, regions)
}

#[tauri::command]
fn set_pet_bar_content_bounds(
    app: tauri::AppHandle,
    bounds: windows::ContentBounds,
) -> Result<f64, String> {
    windows::set_pet_bar_content_bounds(&app, bounds)
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

fn emit_settings(app: &tauri::AppHandle, settings: &AppSettings) {
    let _ = app.emit_to("pet-bar", "settings-updated", settings);
    let _ = app.emit_to("settings", "settings-updated", settings);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(SettingsState::new())
        .invoke_handler(tauri::generate_handler![
            load_settings,
            save_settings,
            set_bar_position,
            set_pet_stage_size,
            set_paused,
            set_movement_enabled,
            set_always_on_top,
            register_selected_paths,
            read_image_data_url,
            hide_settings_window,
            show_settings_window,
            show_pet_settings_window,
            hide_pet_bar,
            set_pet_bar_hit_regions,
            set_pet_bar_content_bounds,
            quit_app
        ])
        .setup(|app| {
            let state = app.state::<SettingsState>();
            let settings = state.load();
            state.register_paths(settings.image_paths());
            windows::create_windows(app, &settings)?;
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "settings" {
                return;
            }

            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running PetPlayer");
}
