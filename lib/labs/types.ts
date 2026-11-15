// What a partner lab integration looks like. Today's lab (SRL) has no API: operations place each order with it by
// hand, using the "lab order sheet" (the order with the lab's own ids). A lab that offers an API or webhooks is added by
// writing an adapter that implements this and registering it (lib/labs/index.ts): the catalog, the mappings and the
// orders do not change.

// One line of an order, in the lab's terms.
export type LabOrderLine = {
  kind: "test" | "package";
  // Our id, and the lab's id for it (null when the lab has none: see LabOrder.missing).
  internalId: string;
  externalId: string | null;
  name: string;
  qty: number;
  // Set when a custom panel (which the lab does not know by name) was sent as its tests: the panel's internal id.
  expandedFrom?: string;
};

export type LabOrderMember = { name: string; age: string; gender: string; lines: LabOrderLine[] };

export type LabOrder = {
  orderId: string;
  labId: string;
  labName: string;
  collectionDate: string;
  collectionSlot: string;
  patient: { name: string; whatsapp: string; address: string; pincode: string; lat?: number; lng?: number; mapsUrl?: string };
  members: LabOrderMember[];
  // Everything to order, added up across members (lines with the same lab id are combined).
  totals: LabOrderLine[];
  // Items the lab has no id for. The order cannot be sent to the lab until they are mapped.
  missing: { kind: "test" | "package"; internalId: string; name: string }[];
};

export type LabSubmitResult = { ok: boolean; detail: string; reference?: string };

export interface LabAdapter {
  readonly id: string;
  readonly name: string;
  // "manual": operations place the order with the lab by hand. "api": submitOrder sends it.
  readonly mode: "manual" | "api";
  // Sends an order to the lab (api mode). Return the lab's own reference for it.
  submitOrder?(order: LabOrder): Promise<LabSubmitResult>;
  // Receives the lab's webhook calls (status updates, reports), if it has them.
  handleWebhook?(req: Request): Promise<Response>;
}
