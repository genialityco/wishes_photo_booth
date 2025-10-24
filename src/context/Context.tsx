/* eslint-disable @next/next/no-img-element */
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface TextStyle {
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  fontFamily?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  italic?: boolean;
}

export const defaultTextStyle: TextStyle = {
  fontSize: "40px",
  fontWeight: "bold",
  color: "red",
  fontFamily: "Arial, sans-serif",
  backgroundOpacity: 0.7,
  shadowColor: "rgba(0, 0, 0, 0.8)",
  shadowBlur: 4,
  italic: true,
};

interface WishStyleContextType {
  wishImage: string[];
  setWishImage: React.Dispatch<React.SetStateAction<string[]>>;
}

const WishStyleContext = createContext<WishStyleContextType | undefined>(undefined);

export const WishStyleProvider = ({ children }: { children: ReactNode }) => {
  const [wishImage, setWishImage] = useState<string[]>([]);

  return (
    <WishStyleContext.Provider
      value={{
        wishImage,
        setWishImage, // Ahora pasa el setter directo de useState
      }}
    >
      {children}
    </WishStyleContext.Provider>
  );
};

// Hook personalizado para usar el context
export const useWishStyle = () => {
  const context = useContext(WishStyleContext);
  if (context === undefined) {
    throw new Error("useWishStyle must be used within a WishStyleProvider");
  }
  return context;
};