"use client";
import React, { createContext, useContext } from "react";
import type { ClinicBrand } from "@/lib/brand";

// What client components need to know about the visitor's clinic: the clinic's
// brand when it has its own version of the site, and whether the patient pays at the
// clinic's front desk (the clinic collects payment) - which changes how payment is described.
type BrandContextType = { brand: ClinicBrand | null; payAtClinic: boolean };

const BrandContext = createContext<BrandContextType>({ brand: null, payAtClinic: false });

export function BrandProvider({ brand, payAtClinic, children }: BrandContextType & { children: React.ReactNode }) {
  return <BrandContext.Provider value={{ brand, payAtClinic }}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
