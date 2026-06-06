import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "./defaults";
import { isTauriRuntime, loadSettings } from "./tauriApi";
import type { AppSettings } from "../types/settings";

export function useSyncedSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      if (!isTauriRuntime()) {
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
        return;
      }

      try {
        const nextSettings = await loadSettings();
        if (alive) {
          setSettings(nextSettings);
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    }

    void refresh();

    if (!isTauriRuntime()) {
      return () => {
        alive = false;
      };
    }

    let unlisten: (() => void) | undefined;
    void listen<AppSettings>("settings-updated", (event) => {
      setSettings(event.payload);
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  return { settings, setSettings, isLoading };
}
