use crate::{emit_settings, settings::SettingsState, windows};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, Submenu},
    tray::TrayIconBuilder,
    Manager, State,
};

pub fn create_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show_pet = MenuItem::with_id(app, "show_pet", "펫 보이기", true, None::<&str>)?;
    let hide_pet = MenuItem::with_id(app, "hide_pet", "펫 숨기기", true, None::<&str>)?;
    let top = MenuItem::with_id(app, "position_top", "화면 상단", true, None::<&str>)?;
    let bottom = MenuItem::with_id(app, "position_bottom", "화면 하단", true, None::<&str>)?;
    let stage_half = MenuItem::with_id(app, "stage_half", "활동 영역 절반", true, None::<&str>)?;
    let stage_full = MenuItem::with_id(app, "stage_full", "활동 영역 전체", true, None::<&str>)?;
    let stage_dynamic =
        MenuItem::with_id(app, "stage_dynamic", "활동 영역 맞춤", true, None::<&str>)?;
    let movement_on = MenuItem::with_id(app, "movement_on", "움직임 켜기", true, None::<&str>)?;
    let movement_off = MenuItem::with_id(app, "movement_off", "움직임 끄기", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "일시정지", true, None::<&str>)?;
    let resume = MenuItem::with_id(app, "resume", "재개", true, None::<&str>)?;
    let always_on_top =
        MenuItem::with_id(app, "always_on_top", "항상 위 켜기", true, None::<&str>)?;
    let not_always_on_top =
        MenuItem::with_id(app, "not_always_on_top", "항상 위 끄기", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "설정 열기", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
    let position = Submenu::with_items(app, "위치", true, &[&top, &bottom])?;
    let stage = Submenu::with_items(
        app,
        "활동 영역",
        true,
        &[&stage_half, &stage_full, &stage_dynamic],
    )?;
    let menu = Menu::with_items(
        app,
        &[
            &show_pet,
            &hide_pet,
            &position,
            &stage,
            &movement_on,
            &movement_off,
            &pause,
            &resume,
            &always_on_top,
            &not_always_on_top,
            &settings,
            &quit,
        ],
    )?;

    TrayIconBuilder::new()
        .icon(tray_icon())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let state: State<SettingsState> = app.state();
            match event.id.as_ref() {
                "show_pet" => {
                    if let Some(window) = app.get_webview_window("pet-bar") {
                        let _ = window.show();
                    }
                }
                "hide_pet" => {
                    if let Some(window) = app.get_webview_window("pet-bar") {
                        let _ = window.hide();
                    }
                }
                "position_top" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.bar_position = crate::settings::BarPosition::Top;
                    }) {
                        let _ = windows::position_pet_bar(
                            app,
                            settings.bar_position,
                            settings.pet_stage_size,
                        );
                        emit_settings(app, &settings);
                    }
                }
                "position_bottom" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.bar_position = crate::settings::BarPosition::Bottom;
                    }) {
                        let _ = windows::position_pet_bar(
                            app,
                            settings.bar_position,
                            settings.pet_stage_size,
                        );
                        emit_settings(app, &settings);
                    }
                }
                "stage_half" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.pet_stage_size = crate::settings::PetStageSize::Half;
                    }) {
                        let _ = windows::position_pet_bar(
                            app,
                            settings.bar_position,
                            settings.pet_stage_size,
                        );
                        emit_settings(app, &settings);
                    }
                }
                "stage_full" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.pet_stage_size = crate::settings::PetStageSize::Full;
                    }) {
                        let _ = windows::position_pet_bar(
                            app,
                            settings.bar_position,
                            settings.pet_stage_size,
                        );
                        emit_settings(app, &settings);
                    }
                }
                "stage_dynamic" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.pet_stage_size = crate::settings::PetStageSize::Dynamic;
                    }) {
                        let _ = windows::position_pet_bar(
                            app,
                            settings.bar_position,
                            settings.pet_stage_size,
                        );
                        emit_settings(app, &settings);
                    }
                }
                "movement_on" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.movement_enabled = true;
                    }) {
                        emit_settings(app, &settings);
                    }
                }
                "movement_off" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.movement_enabled = false;
                    }) {
                        emit_settings(app, &settings);
                    }
                }
                "pause" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.is_paused = true;
                    }) {
                        emit_settings(app, &settings);
                    }
                }
                "resume" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.is_paused = false;
                    }) {
                        emit_settings(app, &settings);
                    }
                }
                "always_on_top" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.always_on_top = true;
                    }) {
                        let _ = windows::set_pet_bar_always_on_top(app, true);
                        emit_settings(app, &settings);
                    }
                }
                "not_always_on_top" => {
                    if let Ok(settings) = state.update(|settings| {
                        settings.always_on_top = false;
                    }) {
                        let _ = windows::set_pet_bar_always_on_top(app, false);
                        emit_settings(app, &settings);
                    }
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("settings") {
                        let _ = window.center();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

fn tray_icon() -> Image<'static> {
    let size = 32usize;
    let mut rgba = Vec::with_capacity(size * size * 4);

    for y in 0..size {
        for x in 0..size {
            let dx = x as f64 - 16.0;
            let dy = y as f64 - 16.0;
            let distance = (dx * dx + dy * dy).sqrt();
            let inside = distance < 12.5;
            let eye = (x == 12 || x == 20) && (10..=13).contains(&y);
            let smile = (11..=21).contains(&x) && y == 21;

            if !inside {
                rgba.extend_from_slice(&[0, 0, 0, 0]);
            } else if eye || smile {
                rgba.extend_from_slice(&[36, 42, 54, 255]);
            } else {
                rgba.extend_from_slice(&[92, 142, 220, 255]);
            }
        }
    }

    Image::new_owned(rgba, size as u32, size as u32)
}
