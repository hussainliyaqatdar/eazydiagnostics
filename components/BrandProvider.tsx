"use client";
import React, { createContext, useContext } from "react";
import type { ClinicBrand } from "@/lib/brand";

// What client components need to know about the visitor's clinic: the clinic's
// brand when it has its own version of the site, and whether they came from any
// doctor's referral link (which changes how payment is described).
type BrandContextType = { brand: ClinicBrand | null; referred: boolean };

const BrandContext = createContext<BrandContextType>({ brand: null, referred: false });

export function BrandProvider({ brand, referred, children }: BrandContextType & { children: React.ReactNode }) {
  return <BrandContext.Provider value={{ brand, referred }}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
