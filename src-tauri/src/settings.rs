use serde::{Deserialize, Serialize};
use std::{collections::HashSet, fs, path::PathBuf, sync::Mutex};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BarPosition {
    Top,
    Bottom,
}

impl Default for BarPosition {
    fn default() -> Self {
        Self::Top
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PetStageSize {
    Half,
    Full,
    Dynamic,
}

impl Default for PetStageSize {
    fn default() -> Self {
        Self::Dynamic
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AppLanguage {
    Ko,
    En,
}

impl Default for AppLanguage {
    fn default() -> Self {
        Self::Ko
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PetSourceType {
    Frames,
    Spritesheet,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PlaybackDirection {
    Forward,
    Reverse,
}

impl Default for PlaybackDirection {
    fn default() -> Self {
        Self::Forward
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MovementFacing {
    Forward,
    Reverse,
}

impl Default for MovementFacing {
    fn default() -> Self {
        Self::Forward
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MovementMode {
    Still,
    Walk,
}

impl Default for MovementMode {
    fn default() -> Self {
        Self::Still
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MovementRange {
    Screen,
    Local,
}

impl Default for MovementRange {
    fn default() -> Self {
        Self::Screen
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PetFrame {
    pub index: usize,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PetPlacement {
    pub index: usize,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PetDefinition {
    pub id: String,
    pub name: String,
    pub source_type: PetSourceType,
    pub frame_count: u32,
    pub frame_interval: u32,
    pub frame_width: u32,
    pub frame_height: u32,
    pub display_width: u32,
    pub display_height: u32,
    pub speed: f64,
    #[serde(default = "default_movement_duration_ms")]
    pub movement_duration_ms: u32,
    #[serde(default = "default_movement_distance_multiplier")]
    pub movement_distance_multiplier: f64,
    pub instance_count: u32,
    #[serde(default = "default_pet_visible")]
    pub is_visible: bool,
    #[serde(default)]
    pub playback_direction: PlaybackDirection,
    #[serde(default)]
    pub movement_mode: MovementMode,
    #[serde(default)]
    pub movement_range: MovementRange,
    #[serde(default)]
    pub movement_facing: MovementFacing,
    pub frames: Option<Vec<PetFrame>>,
    #[serde(default)]
    pub frame_movement: Vec<bool>,
    #[serde(default)]
    pub placements: Vec<PetPlacement>,
    pub spritesheet_path: Option<String>,
    pub spritesheet_file_name: Option<String>,
    pub spritesheet_width: Option<u32>,
    pub spritesheet_height: Option<u32>,
    pub columns: Option<u32>,
    pub rows: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub bar_position: BarPosition,
    #[serde(default)]
    pub pet_stage_size: PetStageSize,
    #[serde(default = "default_dynamic_stage_padding")]
    pub dynamic_stage_padding: u32,
    #[serde(default)]
    pub language: AppLanguage,
    pub selected_pet_id: Option<String>,
    #[serde(default)]
    pub pets: Vec<PetDefinition>,
    #[serde(default)]
    pub is_paused: bool,
    #[serde(default = "default_movement_enabled")]
    pub movement_enabled: bool,
    #[serde(default = "default_always_on_top")]
    pub always_on_top: bool,
    #[serde(default)]
    pub low_spec_mode: bool,
    #[serde(default = "default_max_instance_count")]
    pub max_instance_count: u32,
}

impl AppSettings {
    pub fn sanitized(mut self) -> Self {
        self.max_instance_count = self.max_instance_count.max(1);
        self.dynamic_stage_padding = self.dynamic_stage_padding.min(2_000);
        self.pets.iter_mut().for_each(|pet| {
            pet.frame_count = pet.frame_count.clamp(1, 60);
            pet.frame_interval = pet.frame_interval.max(16);
            pet.frame_width = pet.frame_width.max(1);
            pet.frame_height = pet.frame_height.max(1);
            pet.display_width = pet.display_width.max(1);
            pet.display_height = pet.display_height.max(1);
            pet.speed = pet.speed.max(0.0);
            pet.movement_duration_ms = pet.movement_duration_ms.clamp(1_000, 3_600_000);
            pet.movement_distance_multiplier = pet.movement_distance_multiplier.clamp(0.25, 100.0);
            pet.instance_count = pet.instance_count.clamp(1, self.max_instance_count);
            if pet.frame_movement.is_empty() {
                pet.frame_movement = vec![true; pet.frame_count as usize];
            } else {
                pet.frame_movement.truncate(pet.frame_count as usize);
                while pet.frame_movement.len() < pet.frame_count as usize {
                    pet.frame_movement.push(true);
                }
            }
            pet.placements
                .retain(|placement| placement.index < pet.instance_count as usize);
            pet.placements.iter_mut().for_each(|placement| {
                placement.x = placement.x.max(0.0);
                placement.y = placement.y.max(0.0);
            });
            if matches!(pet.source_type, PetSourceType::Spritesheet) {
                let columns = pet
                    .spritesheet_width
                    .map(|width| (width / pet.frame_width).max(1))
                    .unwrap_or_else(|| pet.columns.unwrap_or(pet.frame_count).max(1));
                let rows = pet
                    .spritesheet_height
                    .map(|height| (height / pet.frame_height).max(1))
                    .unwrap_or_else(|| {
                        pet.rows
                            .unwrap_or_else(|| pet.frame_count.div_ceil(columns))
                            .max(1)
                    });
                pet.columns = Some(columns);
                pet.rows = Some(rows);
                pet.frame_count = pet.frame_count.min(columns.saturating_mul(rows).max(1));
            }
        });

        let selected_pet_is_missing = self
            .selected_pet_id
            .as_ref()
            .map(|selected_id| !self.pets.iter().any(|pet| &pet.id == selected_id))
            .unwrap_or(true);
        if selected_pet_is_missing {
            self.selected_pet_id = self.pets.first().map(|pet| pet.id.clone());
        }

        self
    }

    pub fn image_paths(&self) -> Vec<String> {
        let mut paths = Vec::new();
        for pet in &self.pets {
            if let Some(frames) = &pet.frames {
                paths.extend(frames.iter().filter_map(|frame| frame.file_path.clone()));
            }
            if let Some(path) = &pet.spritesheet_path {
                paths.push(path.clone());
            }
        }
        paths
    }
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            bar_position: BarPosition::Top,
            pet_stage_size: PetStageSize::Dynamic,
            dynamic_stage_padding: default_dynamic_stage_padding(),
            language: AppLanguage::Ko,
            selected_pet_id: None,
            pets: Vec::new(),
            is_paused: false,
            movement_enabled: default_movement_enabled(),
            always_on_top: default_always_on_top(),
            low_spec_mode: false,
            max_instance_count: default_max_instance_count(),
        }
    }
}

pub struct SettingsState {
    allowed_paths: Mutex<HashSet<String>>,
}

impl SettingsState {
    pub fn new() -> Self {
        Self {
            allowed_paths: Mutex::new(HashSet::new()),
        }
    }

    pub fn load(&self) -> AppSettings {
        match fs::read_to_string(settings_path()) {
            Ok(contents) => serde_json::from_str::<AppSettings>(&contents)
                .unwrap_or_default()
                .sanitized(),
            Err(_) => AppSettings::default(),
        }
    }

    pub fn save(&self, settings: AppSettings) -> Result<AppSettings, String> {
        let settings = settings.sanitized();
        let path = settings_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }

        let contents =
            serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
        fs::write(path, contents).map_err(|error| error.to_string())?;
        self.register_paths(settings.image_paths());
        Ok(settings)
    }

    pub fn update(&self, update: impl FnOnce(&mut AppSettings)) -> Result<AppSettings, String> {
        let mut settings = self.load();
        update(&mut settings);
        self.save(settings)
    }

    pub fn register_paths(&self, paths: Vec<String>) {
        if let Ok(mut allowed_paths) = self.allowed_paths.lock() {
            for path in paths {
                allowed_paths.insert(path);
            }
        }
    }

    pub fn is_allowed_path(&self, path: &str) -> bool {
        self.allowed_paths
            .lock()
            .map(|allowed_paths| allowed_paths.contains(path))
            .unwrap_or(false)
    }
}

fn default_max_instance_count() -> u32 {
    10
}

fn default_dynamic_stage_padding() -> u32 {
    160
}

fn default_always_on_top() -> bool {
    true
}

fn default_movement_enabled() -> bool {
    true
}

fn default_movement_duration_ms() -> u32 {
    80_000
}

fn default_movement_distance_multiplier() -> f64 {
    2.0
}

fn default_pet_visible() -> bool {
    true
}

fn settings_path() -> PathBuf {
    if let Some(data_dir) = platform_data_dir() {
        return data_dir.join("PetPlayer").join("settings.json");
    }

    PathBuf::from("PetPlayer").join("settings.json")
}

fn platform_data_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("APPDATA").map(PathBuf::from)
    }

    #[cfg(target_os = "macos")]
    {
        std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|home| home.join("Library").join("Application Support"))
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/share"))
            })
    }
}
