// SERVER-ONLY. The image library for WhatsApp templates: images uploaded once on /admin/whatsapp and then
// chosen as a template's header. WhatsApp fetches the image from a public URL when a message is sent, so each
// image has an unguessable token (/api/whatsapp/media/<token>).
import { randomBytes } from "node:crypto";
import { getDb } from "./db";
import { SITE_URL } from "./site-config";

// WhatsApp accepts JPEG and PNG for template headers, up to 5 MB.
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_TYPES = ["image/jpeg", "image/png"] as const;

export type MediaItem = { id: number; name: string; contentType: string; size: number; token: string; createdAt: string; usedBy: string[] };

export function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export const mediaUrl = (token: string) => `${SITE_URL.replace(/\/$/, "")}/api/whatsapp/media/${token}`;

type Row = { id: number | string; name: string; content_type: string; size: number; token: string; created_at: Date | string; used_by: string[] | null };

export async function listMedia(): Promise<MediaItem[]> {
  const db = await getDb();
  const rows = await db.query<Row>(
    `SELECT m.id, m.name, m.content_type, m.size, m.token, m.created_at,
            (SELECT array_agg(t.name ORDER BY t.name) FROM whatsapp_templates t WHERE t.header_media_id = m.id) AS used_by
     FROM whatsapp_media m ORDER BY m.created_at DESC, m.id DESC`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    contentType: r.content_type,
    size: r.size,
    token: r.token,
    createdAt: new Date(r.created_at).toISOString(),
    usedBy: r.used_by ?? [],
  }));
}

export async function saveMedia(name: string, bytes: Buffer, contentType: string): Promise<MediaItem> {
  const db = await getDb();
  const token = randomBytes(18).toString("hex");
  const rows = await db.query<{ id: number | string }>(
    "INSERT INTO whatsapp_media (name, content_type, data, size, token) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [name.slice(0, 120), contentType, bytes, bytes.length, token]
  );
  const all = await listMedia();
  return all.find((m) => m.id === Number(rows[0].id))!;
}

export async function getMediaBytes(id: number): Promise<{ data: Buffer; contentType: string; name: string } | undefined> {
  const db = await getDb();
  const [r] = await db.query<{ data: Buffer | Uint8Array; content_type: string; name: string }>("SELECT data, content_type, name FROM whatsapp_media WHERE id = $1", [id]);
  return r ? { data: Buffer.from(r.data), contentType: r.content_type, name: r.name } : undefined;
}

export async function getMediaByToken(token: string): Promise<{ data: Buffer; contentType: string } | undefined> {
  if (!/^[0-9a-f]{36}$/.test(token)) return undefined;
  const db = await getDb();
  const [r] = await db.query<{ data: Buffer | Uint8Array; content_type: string }>("SELECT data, content_type FROM whatsapp_media WHERE token = $1", [token]);
  return r ? { data: Buffer.from(r.data), contentType: r.content_type } : undefined;
}

export async function getMediaToken(id: number): Promise<string | undefined> {
  const db = await getDb();
  const [r] = await db.query<{ token: string }>("SELECT token FROM whatsapp_media WHERE id = $1", [id]);
  return r?.token;
}

// An image used as a template's header cannot be deleted from under it.
export async function deleteMedia(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const used = await db.query<{ name: string }>("SELECT name FROM whatsapp_templates WHERE header_media_id = $1", [id]);
  if (used.length > 0) return { ok: false, error: `It is the header image of ${used.map((u) => u.name).join(", ")}. Change that template first.` };
  await db.query("DELETE FROM whatsapp_media WHERE id = $1", [id]);
  return { ok: true };
}
