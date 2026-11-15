// SERVER-ONLY. The registry of lab integrations. A lab with no adapter registered here is handled manually.
import type { LabAdapter } from "./types";

// The default: no integration. The order sheet (GET /api/admin/orders/<id>/lab-order) has what to give the lab.
function manualAdapter(id: string, name: string): LabAdapter {
  return { id, name, mode: "manual" };
}

const adapters = new Map<string, LabAdapter>();

// Registers an integration for a lab (by labs.id). Call it from a module that is imported at startup.
export function registerLabAdapter(adapter: LabAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function getLabAdapter(labId: string, labName = labId): LabAdapter {
  return adapters.get(labId) ?? manualAdapter(labId, labName);
}

export type { LabAdapter, LabOrder, LabOrderLine, LabSubmitResult } from "./types";
