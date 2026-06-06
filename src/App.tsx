import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import PetLayer from "./components/PetLayer";
import SettingsWindow from "./components/SettingsWindow";

type Surface = "pet-bar" | "settings";

function detectSurface(): Surface {
  const hash = window.location.hash.replace("#/", "");
  if (hash === "pet-bar" || hash === "settings") {
    return hash;
  }

  try {
    const label = getCurrentWindow().label;
    if (label === "pet-bar" || label === "settings") {
      return label;
    }
  } catch {
    return "settings";
  }

  return "settings";
}

export default function App() {
  const [surface, setSurface] = useState<Surface>(detectSurface);

  useEffect(() => {
    const onHashChange = () => setSurface(detectSurface());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.surface = surface;
    document.body.dataset.surface = surface;
  }, [surface]);

  return surface === "pet-bar" ? <PetLayer /> : <SettingsWindow />;
}
