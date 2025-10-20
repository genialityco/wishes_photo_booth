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
  wishStyle: TextStyle;
  setWishStyle: (style: TextStyle | ((prev: TextStyle) => TextStyle)) => void;
  updateWishStyle: (partialStyle: Partial<TextStyle>) => void;
  resetWishStyle: () => void;
  getReactCSSProperties: () => React.CSSProperties;
}

const WishStyleContext = createContext<WishStyleContextType | undefined>(undefined);

export const WishStyleProvider = ({ children }: { children: ReactNode }) => {
  const [wishStyle, setWishStyle] = useState<TextStyle>(defaultTextStyle);

  const updateWishStyle = (partialStyle: Partial<TextStyle>) => {
    setWishStyle((prev) => ({ ...prev, ...partialStyle }));
  };

  const resetWishStyle = () => {
    setWishStyle(defaultTextStyle);
  };

  // Convertir TextStyle a React.CSSProperties para usar en componentes
  const getReactCSSProperties = (): React.CSSProperties => {
    return {
      fontSize: wishStyle.fontSize,
      fontWeight: wishStyle.fontWeight as any,
      color: wishStyle.color,
      fontFamily: wishStyle.fontFamily,
      fontStyle: wishStyle.italic ? 'italic' : 'normal',
    };
  };

  return (
    <WishStyleContext.Provider
      value={{
        wishStyle,
        setWishStyle,
        updateWishStyle,
        resetWishStyle,
        getReactCSSProperties,
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