import { NextResponse } from "next/server";
import { metaPhoneInfo, whatsappConfigStatus } from "@/lib/whatsapp";

// Is the WhatsApp connection working? Asks Meta about the sending number.
export async function POST() {
  const config = whatsappConfigStatus();
  const phone = await metaPhoneInfo();
  return NextResponse.json(phone.ok ? { ok: true, config, phone: phone.data } : { ok: false, config, error: phone.error });
}
