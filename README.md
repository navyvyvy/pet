# PetPlayer

PetPlayer is a lightweight desktop pixel-pet player built with Tauri, React, and TypeScript.
It lets you load your own PNG frame images or a single spritesheet, preview the frame mapping, and run one or more transparent desktop pets from the system tray.

PetPlayer는 Tauri, React, TypeScript로 만든 가벼운 데스크톱 픽셀 펫 플레이어입니다.
사용자가 직접 준비한 PNG 프레임 이미지나 통짜 스프라이트 이미지를 불러와 프레임을 확인하고, 투명 배경 위에서 여러 펫을 동시에 표시할 수 있습니다.

## Features

- Transparent pet bar: only the pets and menus receive pointer input.
- Multiple pets and multiple visible copies per pet.
- Frame image mode: select multiple numbered PNG files and map them in numeric order.
- Spritesheet mode: select one PNG and split it by configured frame width and height.
- Per-pet visibility, movement on/off, display scale, movement distance, movement duration, playback direction, and facing direction.
- Per-frame movement control for animations where some frames should animate in place.
- Activity area modes: half screen, full screen, or character-fit mode with adjustable padding.
- Drag pets to place them manually. Placement is saved.
- Right-click pet menu for settings, pet properties, movement toggle, always-on-top, low-spec mode, hide, and quit.
- Korean/English UI language setting.
- Low-spec mode to reduce render and hit-region update frequency.
- Settings persist across restarts in the app data directory.

## Requirements

- Windows is the primary target.
- Node.js and pnpm.
- Rust toolchain for Tauri builds.

## Development

```bash
pnpm install
pnpm generate:missing-frame
pnpm tauri dev
```

## Build

```bash
pnpm install
pnpm generate:missing-frame
pnpm tauri build
```

For a quick release executable without bundling installers:

```bash
pnpm tauri build --no-bundle
```

The executable is generated at:

```text
src-tauri/target/release/petplayer.exe
```

## Basic Usage

1. Open the tray icon menu.
2. Open settings.
3. Add a character.
4. Choose either multiple frame images or one spritesheet image.
5. Set frame count, frame size, display size, frame interval, movement, and copy count.
6. Preview the frames.
7. Save.
8. Drag pets on the desktop if you want to place them manually.
9. Right-click a pet to open quick actions or jump to that pet's properties.

## Asset Notes

PetPlayer does not include copyrighted character sprites, game assets, logos, or franchise artwork.
Only use PNG files that you created, own, or have permission to use.

Supported source modes:

- Multiple PNG frame files: files are sorted by the increasing number in the filename.
- Single PNG spritesheet: frames are sliced left to right, top to bottom, using the configured frame width and height.

Default values:

- Frame count: 12
- Frame size: 48 x 48
- Display size: 96 x 96
- Frame interval: 600 ms
- Max visible pets: 10
- Visible copies per new pet: 1
- Movement mode for new pets: still
- Default activity area: character-fit

## Settings

Settings are saved locally under:

```text
AppData/PetPlayer/settings.json
```

Important settings include:

- Language: Korean or English.
- Low-spec mode: lowers visual update frequency and transparent hit-region update frequency.
- Always on top: controls whether pets stay above other windows.
- Activity area: half screen, full screen, or character-fit mode.
- Fit padding: expands the character-fit activity area.
- Global movement: enables or disables movement across all pets.

## GitHub Remote

This local project can be connected to:

```text
https://github.com/navyvyvy/pet
```

If the folder has not been initialized as a git repository yet:

```bash
git init
git branch -M main
git remote add origin https://github.com/navyvyvy/pet.git
git add .
git commit -m "feat: add desktop pet player"
git push -u origin main
```

If the repository is already initialized:

```bash
git remote add origin https://github.com/navyvyvy/pet.git
git push -u origin main
```

If `origin` already exists:

```bash
git remote set-url origin https://github.com/navyvyvy/pet.git
```

## GitHub Actions

The repository includes a Windows build workflow at:

```text
.github/workflows/build.yml
```

It runs on:

- Pushes to `main`
- Pull requests into `main`
- Manual runs from the GitHub Actions tab
- Tags that start with `v`

The workflow builds:

- Windows: `src-tauri/target/release/petplayer.exe`
- macOS: an Apple Silicon `.dmg`

Artifacts are uploaded as:

- `petplayer-windows`
- `petplayer-macos`

To publish a GitHub Release automatically, push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Tag builds attach the Windows `.exe` and macOS `.dmg` to the GitHub Release.

The macOS build is not Apple notarized. macOS may show a Gatekeeper warning the first time it is opened.

## Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm tauri dev
pnpm tauri build
pnpm generate:missing-frame
```

## License And Asset Responsibility

This project is a generic desktop pet player.
It is not affiliated with any game, animation, brand, character, or franchise.

Users are responsible for ensuring that any loaded images are allowed to be used.
