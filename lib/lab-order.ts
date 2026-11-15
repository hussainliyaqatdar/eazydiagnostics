// SERVER-ONLY. Turns an order into what a partner lab needs: the same lines, but in the LAB's ids.
//
// Orders carry our internal ids (and the ids of the lab they were placed for). To send one to a lab - the current lab,
// or a different one - each line is looked up in that lab's mapping. A custom panel has no lab id of its own (unless one
// was set), so it is sent as the tests it includes. Anything the lab has no id for is listed in `missing`.
import { getDb } from "./db";
import { getCurrentLab, adminItemIdsBySlug, labIdsFor } from "./catalog-store";
import type { LabOrder, LabOrderLine } from "./labs/types";
import type { Booking, BookingLineItem } from "./types";

async function resolveLines(items: BookingLineItem[], labId: string, missing: LabOrder["missing"]): Promise<LabOrderLine[]> {
  // Internal ids: saved on the line; older orders only have the slug.
  const legacy = items.filter((i) => !i.internalId).map((i) => i.slug);
  const bySlug = await adminItemIdsBySlug(legacy);
  const withIds = items.map((i) => ({ item: i, internalId: i.internalId ?? bySlug.get(i.slug)?.internalId ?? "" }));
  const db = await getDb();

  const testIds = withIds.filter((x) => x.item.kind === "test" && x.internalId).map((x) => x.internalId);
  const packageIds = withIds.filter((x) => x.item.kind === "package" && x.internalId).map((x) => x.internalId);
  const [testMap, packageMap] = await Promise.all([labIdsFor(labId, "test", testIds), labIdsFor(labId, "package", packageIds)]);

  // Packages the lab has no id for are sent as their tests.
  const unmappedPackages = packageIds.filter((id) => !packageMap.has(id));
  const parts = unmappedPackages.length
    ? await db.query<{ internal_id: string; constituents: { slug: string | null; name: string }[] }>("SELECT internal_id, constituents FROM catalog_packages WHERE internal_id = ANY($1::text[])", [unmappedPackages])
    : [];
  const partSlugs = parts.flatMap((p) => p.constituents.map((c) => c.slug).filter((s): s is string => !!s));
  const testsBySlug = partSlugs.length ? await db.query<{ slug: string; internal_id: string }>("SELECT slug, internal_id FROM catalog_tests WHERE slug = ANY($1::text[])", [partSlugs]) : [];
  const partIds = new Map(testsBySlug.map((t) => [t.slug, t.internal_id]));
  const partMap = await labIdsFor(labId, "test", Array.from(partIds.values()));

  const lines: LabOrderLine[] = [];
  for (const { item, internalId } of withIds) {
    if (!internalId) {
      missing.push({ kind: item.kind, internalId: "", name: item.name });
      continue;
    }
    const direct = (item.kind === "test" ? testMap : packageMap).get(internalId);
    if (direct) {
      lines.push({ kind: item.kind, internalId, externalId: direct, name: item.name, qty: item.qty });
      continue;
    }
    const expansion = item.kind === "package" ? parts.find((p) => p.internal_id === internalId) : undefined;
    if (expansion && expansion.constituents.length > 0) {
      for (const c of expansion.constituents) {
        const tid = c.slug ? partIds.get(c.slug) : undefined;
        const ext = tid ? partMap.get(tid) ?? null : null;
        if (!ext) missing.push({ kind: "test", internalId: tid ?? "", name: c.name });
        lines.push({ kind: "test", internalId: tid ?? "", externalId: ext, name: c.name, qty: item.qty, expandedFrom: internalId });
      }
      continue;
    }
    missing.push({ kind: item.kind, internalId, name: item.name });
    lines.push({ kind: item.kind, internalId, externalId: null, name: item.name, qty: item.qty });
  }
  return lines;
}

// `labId`: the lab to build it for. Defaults to the lab the order was placed for (older orders: the current lab).
export async function buildLabOrder(booking: Booking, labId?: string): Promise<LabOrder> {
  const db = await getDb();
  const target = labId ?? booking.labId ?? (await getCurrentLab()).id;
  const [lab] = await db.query<{ id: string; name: string }>("SELECT id, name FROM labs WHERE id = $1", [target]);
  if (!lab) throw new Error(`Unknown lab ${target}`);

  const missing: LabOrder["missing"] = [];
  const people = booking.members?.length
    ? booking.members.map((m) => ({ name: m.name, age: m.age, gender: m.gender, items: m.items }))
    : [{ name: booking.patient.name, age: booking.patient.age, gender: booking.patient.gender, items: booking.items }];
  const members = [];
  for (const p of people) members.push({ name: p.name, age: p.age, gender: p.gender, lines: await resolveLines(p.items, lab.id, missing) });

  // Added up across members, by the lab's id (an id the lab lacks stays on its own line).
  const totals = new Map<string, LabOrderLine>();
  for (const l of members.flatMap((m) => m.lines)) {
    const key = l.externalId ? `${l.kind}:${l.externalId}` : `none:${l.internalId}:${l.name}`;
    const hit = totals.get(key);
    if (hit) hit.qty += l.qty;
    else totals.set(key, { ...l });
  }
  const pt = booking.patient;
  return {
    orderId: booking.id,
    labId: lab.id,
    labName: lab.name,
    collectionDate: booking.date,
    collectionSlot: booking.slot,
    patient: { name: pt.name, whatsapp: pt.whatsapp, address: [pt.addressLine, pt.locality, pt.city].filter(Boolean).join(", "), pincode: pt.pincode, ...(pt.lat != null ? { lat: pt.lat, lng: pt.lng } : {}), ...(pt.mapsUrl ? { mapsUrl: pt.mapsUrl } : {}) },
    members,
    totals: Array.from(totals.values()),
    missing: missing.filter((m, i) => missing.findIndex((x) => x.internalId === m.internalId && x.name === m.name) === i),
  };
}
