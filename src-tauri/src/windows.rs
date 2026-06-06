use crate::settings::{AppSettings, BarPosition, PetStageSize};
use serde::{Deserialize, Serialize};
use tauri::{
    window::Color, Manager, PhysicalPosition, PhysicalSize, Position, Size, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder,
};

const FALLBACK_SCREEN_HEIGHT: u32 = 1080;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HitRegion {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentBounds {
    top: f64,
    bottom: f64,
}

pub fn create_windows(app: &tauri::App, settings: &AppSettings) -> tauri::Result<()> {
    let bounds = pet_bar_bounds(app.handle(), settings.bar_position, settings.pet_stage_size);

    let pet_bar = WebviewWindowBuilder::new(
        app,
        "pet-bar",
        WebviewUrl::App("index.html#/pet-bar".into()),
    )
    .title("PetPlayer")
    .transparent(true)
    .background_color(Color(0, 0, 0, 0))
    .decorations(false)
    .shadow(false)
    .always_on_top(settings.always_on_top)
    .skip_taskbar(true)
    .resizable(false)
    .inner_size(bounds.width as f64, bounds.height as f64)
    .position(bounds.x as f64, bounds.y as f64)
    .visible(false)
    .build()?;
    configure_pet_bar_window(&pet_bar, settings.always_on_top)?;
    apply_pet_bar_bounds(&pet_bar, bounds)?;
    pet_bar.show()?;

    WebviewWindowBuilder::new(
        app,
        "settings",
        WebviewUrl::App("index.html#/settings".into()),
    )
    .title("PetPlayer Settings")
    .inner_size(900.0, 720.0)
    .min_inner_size(680.0, 520.0)
    .resizable(true)
    .center()
    .visible(false)
    .build()?;

    Ok(())
}

pub fn position_pet_bar(
    app: &tauri::AppHandle,
    position: BarPosition,
    stage_size: PetStageSize,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window("pet-bar") else {
        return Ok(());
    };
    let bounds = pet_bar_bounds(app, position, stage_size);
    apply_pet_bar_bounds(&window, bounds).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn set_pet_bar_always_on_top(
    app: &tauri::AppHandle,
    always_on_top: bool,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window("pet-bar") else {
        return Ok(());
    };
    configure_pet_bar_window(&window, always_on_top).map_err(|error| error.to_string())?;
    Ok(())
}

pub fn set_pet_bar_hit_regions(
    app: &tauri::AppHandle,
    regions: Vec<HitRegion>,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window("pet-bar") else {
        return Ok(());
    };

    apply_pet_bar_hit_regions(&window, &regions)
}

pub fn set_pet_bar_content_bounds(
    app: &tauri::AppHandle,
    bounds: ContentBounds,
) -> Result<f64, String> {
    let Some(window) = app.get_webview_window("pet-bar") else {
        return Ok(0.0);
    };

    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .or_else(|| app.primary_monitor().ok().flatten());
    let current_position = window.outer_position().map_err(|error| error.to_string())?;

    let Some(monitor) = monitor else {
        return Ok(0.0);
    };

    let area = *monitor.work_area();
    let top = bounds.top;
    let bottom = bounds.bottom.max(top + 1.0);
    let top_px = (top * scale).round() as i32;
    let bottom_px = (bottom * scale).round() as i32;
    let min_height = (32.0 * scale).round().max(1.0) as u32;
    let area_bottom = area.position.y + area.size.height as i32;
    let desired_y = current_position.y + top_px;
    let max_y = area_bottom - min_height as i32;
    let y = desired_y.clamp(area.position.y, max_y.max(area.position.y));
    let desired_bottom = current_position.y + bottom_px;
    let bottom = desired_bottom.clamp(y + min_height as i32, area_bottom);
    let height = (bottom - y).max(min_height as i32) as u32;

    window
        .set_size(Size::Physical(PhysicalSize::new(area.size.width, height)))
        .map_err(|error| error.to_string())?;
    window
        .set_position(Position::Physical(PhysicalPosition::new(
            area.position.x,
            y,
        )))
        .map_err(|error| error.to_string())?;

    Ok((y - current_position.y) as f64 / scale)
}

struct PetBarBounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

fn pet_bar_bounds(
    app: &tauri::AppHandle,
    position: BarPosition,
    stage_size: PetStageSize,
) -> PetBarBounds {
    let monitor = app.primary_monitor().ok().flatten();

    if let Some(monitor) = monitor {
        let area = *monitor.work_area();
        let height = match stage_size {
            PetStageSize::Half => (area.size.height / 2).max(1),
            PetStageSize::Full | PetStageSize::Dynamic => area.size.height.max(1),
        };
        let x = area.position.x;
        let y = match position {
            BarPosition::Top => area.position.y,
            BarPosition::Bottom => area.position.y + area.size.height as i32 - height as i32,
        };

        return PetBarBounds {
            x,
            y,
            width: area.size.width,
            height,
        };
    }

    PetBarBounds {
        x: 0,
        y: 0,
        width: 960,
        height: match stage_size {
            PetStageSize::Half => FALLBACK_SCREEN_HEIGHT / 2,
            PetStageSize::Full | PetStageSize::Dynamic => FALLBACK_SCREEN_HEIGHT,
        },
    }
}

fn configure_pet_bar_window(window: &WebviewWindow, always_on_top: bool) -> tauri::Result<()> {
    window.set_shadow(false)?;
    window.set_background_color(Some(Color(0, 0, 0, 0)))?;
    window.set_always_on_top(always_on_top)?;
    Ok(())
}

fn apply_pet_bar_bounds(window: &WebviewWindow, bounds: PetBarBounds) -> tauri::Result<()> {
    window.set_size(Size::Physical(PhysicalSize::new(
        bounds.width,
        bounds.height,
    )))?;
    window.set_position(Position::Physical(PhysicalPosition::new(
        bounds.x, bounds.y,
    )))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn apply_pet_bar_hit_regions(window: &WebviewWindow, regions: &[HitRegion]) -> Result<(), String> {
    use ::windows::Win32::Graphics::Gdi::{
        CombineRgn, CreateRectRgn, DeleteObject, SetWindowRgn, HGDIOBJ, RGN_ERROR, RGN_OR,
    };

    let hwnd = window.hwnd().map_err(|error| error.to_string())?;

    unsafe {
        let combined = CreateRectRgn(0, 0, 0, 0);
        if combined.is_invalid() {
            return Err("failed to create pet bar window region".into());
        }

        for region in regions {
            if region.width <= 0 || region.height <= 0 {
                continue;
            }

            let left = region.x.max(0);
            let top = region.y.max(0);
            let right = (region.x + region.width).max(left + 1);
            let bottom = (region.y + region.height).max(top + 1);
            let rect = CreateRectRgn(left, top, right, bottom);
            if rect.is_invalid() {
                continue;
            }

            let result = CombineRgn(Some(combined), Some(combined), Some(rect), RGN_OR);
            let _ = DeleteObject(HGDIOBJ(rect.0));
            if result == RGN_ERROR {
                let _ = DeleteObject(HGDIOBJ(combined.0));
                return Err("failed to combine pet bar window region".into());
            }
        }

        if SetWindowRgn(hwnd, Some(combined), true) == 0 {
            let _ = DeleteObject(HGDIOBJ(combined.0));
            return Err("failed to apply pet bar window region".into());
        }
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn apply_pet_bar_hit_regions(
    _window: &WebviewWindow,
    _regions: &[HitRegion],
) -> Result<(), String> {
    Ok(())
}
