import type { AppLanguage } from "../types/settings";
import type { PetSourceType } from "../types/pet";

const copy = {
  ko: {
    common: {
      cancel: "취소",
      close: "닫기",
      delete: "삭제",
      edit: "편집",
      hide: "숨기기",
      move: "이동",
      off: "끄기",
      on: "켜기",
      pause: "일시정지",
      quit: "종료",
      resume: "재개",
      save: "저장",
      show: "보이기",
      still: "정지",
      zoomIn: "크기 확대",
      zoomOut: "크기 축소"
    },
    settings: {
      alwaysOnTop: "항상 위",
      appSettingsSaved: "설정은 AppData/PetPlayer/settings.json에 저장됩니다.",
      barPosition: "펫바 위치",
      bottom: "화면 하단",
      displayCount: "표시",
      dynamicPadding: "맞춤 여백",
      english: "English",
      full: "전체 화면",
      half: "화면 절반",
      korean: "한국어",
      language: "언어",
      lowSpecMode: "저사양 모드",
      maxInstances: "최대 동시 표시 수",
      movement: "전체 이동",
      performanceWarning:
        "동시에 표시되는 캐릭터가 많으면 이동과 프레임 재생이 무거워질 수 있습니다.",
      stageArea: "활동 영역",
      top: "화면 상단",
      dynamic: "캐릭터 맞춤"
    },
    list: {
      add: "캐릭터 추가",
      characters: "캐릭터",
      empty: "저장된 캐릭터가 없습니다.",
      frameUnit: "프레임",
      frames: "분할 이미지",
      instanceCount: (count: number) => `${count}마리`,
      spritesheet: "통짜 스프라이트"
    },
    editor: {
      addTitle: "캐릭터 추가",
      chooseImages: "캐릭터 이미지 추가",
      displayHeight: "표시 높이",
      displaySize: "표시 크기",
      displayWidth: "표시 너비",
      editTitle: "캐릭터 편집",
      frameCount: "프레임 개수",
      frameHeight: "프레임 높이",
      frameInterval: "프레임 간격 ms",
      framePlayback: "프레임 재생 순서",
      frameWidth: "프레임 너비",
      instanceCount: "동시 표시 마릿수",
      movementDistance: "이동 거리 배수",
      movementDuration: "이동 시간 ms",
      movementFacing: "이동 방향",
      movementForward: "정방향",
      movementMode: "이동 방식",
      movementRange: "이동 범위",
      movementReverse: "역방향",
      name: "캐릭터 이름",
      playbackForward: (count: number) => `정방향 (1 -> ${count})`,
      playbackReverse: (count: number) => `역방향 (${count} -> 1)`,
      rangeLocal: "현재 위치 기준",
      rangeScreen: "전체 화면",
      sourceFrames: "분할 이미지 여러 장",
      sourceSpritesheet: "통짜 스프라이트 이미지 한 장",
      sourceType: "이미지 타입"
    },
    framePreview: {
      missing: "missing",
      moving: "이동",
      stopped: "정지",
      title: "프레임 미리보기"
    },
    menu: {
      alwaysOnTopOff: "항상 위 끄기",
      alwaysOnTopOn: "항상 위 켜기",
      globalMovementOff: "전체 이동 끄기",
      globalMovementOn: "전체 이동 켜기",
      hidePetBar: "펫 숨기기",
      lowSpecOff: "저사양 모드 끄기",
      lowSpecOn: "저사양 모드 켜기",
      moveToBottom: "화면 하단으로",
      moveToTop: "화면 상단으로",
      openSettings: "설정 열기",
      petMovementOff: "캐릭터 이동 끄기",
      petMovementOn: "캐릭터 이동 켜기",
      petProperties: "캐릭터 속성",
      stageFull: "활동 영역 전체로",
      stageHalf: "활동 영역 절반으로"
    },
    warnings: {
      skippedNonPng: (count: number) => `PNG가 아닌 파일 ${count}개를 제외했습니다.`,
      tooManyPng: "최대 프레임 수를 넘어 초과 PNG 파일은 제외했습니다."
    }
  },
  en: {
    common: {
      cancel: "Cancel",
      close: "Close",
      delete: "Delete",
      edit: "Edit",
      hide: "Hide",
      move: "Move",
      off: "Off",
      on: "On",
      pause: "Pause",
      quit: "Quit",
      resume: "Resume",
      save: "Save",
      show: "Show",
      still: "Still",
      zoomIn: "Scale up",
      zoomOut: "Scale down"
    },
    settings: {
      alwaysOnTop: "Always on top",
      appSettingsSaved: "Settings are saved to AppData/PetPlayer/settings.json.",
      barPosition: "Pet bar position",
      bottom: "Bottom",
      displayCount: "Showing",
      dynamicPadding: "Fit padding",
      english: "English",
      full: "Full screen",
      half: "Half screen",
      korean: "한국어",
      language: "Language",
      lowSpecMode: "Low-spec mode",
      maxInstances: "Max visible pets",
      movement: "Global movement",
      performanceWarning:
        "Showing many pets at once can make movement and frame playback heavier.",
      stageArea: "Activity area",
      top: "Top",
      dynamic: "Fit characters"
    },
    list: {
      add: "Add character",
      characters: "Characters",
      empty: "No characters have been saved.",
      frameUnit: "frames",
      frames: "Frame images",
      instanceCount: (count: number) => `${count} pet${count === 1 ? "" : "s"}`,
      spritesheet: "Spritesheet"
    },
    editor: {
      addTitle: "Add character",
      chooseImages: "Add character image",
      displayHeight: "Display height",
      displaySize: "Display size",
      displayWidth: "Display width",
      editTitle: "Edit character",
      frameCount: "Frame count",
      frameHeight: "Frame height",
      frameInterval: "Frame interval ms",
      framePlayback: "Frame playback order",
      frameWidth: "Frame width",
      instanceCount: "Visible copies",
      movementDistance: "Movement distance multiplier",
      movementDuration: "Movement duration ms",
      movementFacing: "Movement direction",
      movementForward: "Forward",
      movementMode: "Movement mode",
      movementRange: "Movement range",
      movementReverse: "Reverse",
      name: "Character name",
      playbackForward: (count: number) => `Forward (1 -> ${count})`,
      playbackReverse: (count: number) => `Reverse (${count} -> 1)`,
      rangeLocal: "Around current position",
      rangeScreen: "Full screen",
      sourceFrames: "Multiple frame images",
      sourceSpritesheet: "Single spritesheet image",
      sourceType: "Image type"
    },
    framePreview: {
      missing: "missing",
      moving: "Move",
      stopped: "Stop",
      title: "Frame preview"
    },
    menu: {
      alwaysOnTopOff: "Turn always on top off",
      alwaysOnTopOn: "Turn always on top on",
      globalMovementOff: "Turn global movement off",
      globalMovementOn: "Turn global movement on",
      hidePetBar: "Hide pet bar",
      lowSpecOff: "Turn low-spec mode off",
      lowSpecOn: "Turn low-spec mode on",
      moveToBottom: "Move to bottom",
      moveToTop: "Move to top",
      openSettings: "Open settings",
      petMovementOff: "Turn character movement off",
      petMovementOn: "Turn character movement on",
      petProperties: "Character properties",
      stageFull: "Use full activity area",
      stageHalf: "Use half activity area"
    },
    warnings: {
      skippedNonPng: (count: number) => `Skipped ${count} non-PNG file(s).`,
      tooManyPng: "Skipped PNG files beyond the maximum frame count."
    }
  }
};

export type Copy = typeof copy.ko;

export function getCopy(language?: AppLanguage): Copy {
  return language === "en" ? copy.en : copy.ko;
}

export function sourceTypeLabel(language: AppLanguage | undefined, sourceType: PetSourceType) {
  const text = getCopy(language);
  return sourceType === "frames" ? text.list.frames : text.list.spritesheet;
}
