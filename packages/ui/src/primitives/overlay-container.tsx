import { createContext, useContext } from "react";

// Keep portals inside the fullscreen element. Standalone primitives use body.
export const OverlayContainer = createContext<HTMLElement | null>(null);
export const useOverlayContainer = () => useContext(OverlayContainer);
