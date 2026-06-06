import type { PetFrame } from "../types/pet";
import type { AppLanguage } from "../types/settings";
import { getCopy } from "./i18n";

export type SelectedFile = {
  path: string;
  name: string;
};

export type FrameMapResult = {
  frames: PetFrame[];
  warnings: string[];
};

function isPng(file: SelectedFile) {
  return file.name.toLowerCase().endsWith(".png");
}

function frameOrderNumber(name: string) {
  const matches = name.match(/\d+/g);
  if (!matches) {
    return undefined;
  }
  return Number.parseInt(matches[matches.length - 1], 10);
}

export function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

export function mapFilesToFrames(
  files: SelectedFile[],
  frameCount: number,
  language: AppLanguage = "ko"
): FrameMapResult {
  const frames: PetFrame[] = Array.from({ length: frameCount }, (_, index) => ({ index }));
  const warnings: string[] = [];
  const text = getCopy(language);
  const pngFiles = files.filter(isPng);
  const skipped = files.length - pngFiles.length;

  if (skipped > 0) {
    warnings.push(text.warnings.skippedNonPng(skipped));
  }

  const sortedFiles = [...pngFiles].sort((a, b) => {
    const aNumber = frameOrderNumber(a.name);
    const bNumber = frameOrderNumber(b.name);

    if (aNumber !== undefined && bNumber !== undefined && aNumber !== bNumber) {
      return aNumber - bNumber;
    }

    return a.name.localeCompare(b.name, language, { numeric: true });
  });

  for (const [index, file] of sortedFiles.slice(0, frameCount).entries()) {
    frames[index] = { index, filePath: file.path, fileName: file.name };
  }

  if (pngFiles.length > frameCount) {
    warnings.push(text.warnings.tooManyPng);
  }

  return { frames, warnings };
}
