import { NextRequest, NextResponse } from "next/server";
import { setCurrentLab, updateLab } from "@/lib/catalog-store";
import { catalogFailure, readBody } from "@/lib/catalog-http";

// Admin-only. Rename or switch a lab on or off, or make it the current lab (`{ "makeCurrent": true }`): from then on new
// orders are for it. Refused while any active test or standard package has no id at that lab, unless `"force": true`.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    if (body.makeCurrent === true) return NextResponse.json({ ok: true, labs: await setCurrentLab(params.id, { force: body.force === true }) });
    return NextResponse.json({ ok: true, lab: await updateLab(params.id, body) });
  } catch (err) {
    return catalogFailure(err, "lab could not be updated");
  }
}
