import { useEffect, useState } from "react";
import missingFrameUrl from "../assets/missing-frame.png";
import { isTauriRuntime, readImageDataUrl } from "./tauriApi";

const imageCache = new Map<string, string | null>();
const imageRequests = new Map<string, Promise<string | null>>();

export function useImageDataUrl(path?: string) {
  const [loadedImage, setLoadedImage] = useState<{ path?: string; dataUrl: string | null }>(() => {
    if (!path) {
      return { path, dataUrl: null };
    }
    return { path, dataUrl: imageCache.get(path) ?? null };
  });
  const cached = path ? imageCache.get(path) : undefined;

  useEffect(() => {
    let isMounted = true;

    if (!path) {
      return;
    }

    const cached = imageCache.get(path);
    if (cached !== undefined) {
      return;
    }

    if (!isTauriRuntime()) {
      imageCache.set(path, null);
      setLoadedImage({ path, dataUrl: null });
      return;
    }

    let request = imageRequests.get(path);
    if (!request) {
      request = readImageDataUrl(path)
        .then((nextDataUrl) => {
          imageCache.set(path, nextDataUrl);
          return nextDataUrl;
        })
        .catch(() => {
          imageCache.set(path, null);
          return null;
        })
        .finally(() => {
          imageRequests.delete(path);
        });
      imageRequests.set(path, request);
    }

    request.then((nextDataUrl) => {
      if (isMounted) {
        setLoadedImage({ path, dataUrl: nextDataUrl });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [path]);

  if (!path) {
    return null;
  }

  if (cached !== undefined) {
    return cached;
  }

  return loadedImage.path === path ? loadedImage.dataUrl : null;
}

export function clearImageCache(paths?: string[]) {
  if (!paths) {
    imageCache.clear();
    imageRequests.clear();
    return;
  }

  for (const path of paths) {
    imageCache.delete(path);
    imageRequests.delete(path);
  }
}

export const missingFrame = missingFrameUrl;
