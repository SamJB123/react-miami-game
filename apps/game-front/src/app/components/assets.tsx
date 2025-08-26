"use client";

import { createContext, useContext, useRef } from "react";

export type Assets = {
  models: {
    track: { url: string };
    vehicle: { url: string };
    logo: { url: string };
    heroBackground: { url: string };
    bodyMobile: { url: string };
  };
};

const AssetContext = createContext<Assets | null>(null);

export function useAssets() {
  const assets = useContext(AssetContext);
  const assetsRef = useRef(assets);
  if (!assets)
    throw new Error("useAssets must be used within an AssetsProvider");

  // avoid re-renders if this changes
  return assetsRef.current!;
}

interface AssetsProviderProps {
  children: React.ReactNode;
  assets: Assets;
}

export const AssetsProvider = ({ children, assets }: AssetsProviderProps) => (
  <AssetContext.Provider value={assets}>{children}</AssetContext.Provider>
);
