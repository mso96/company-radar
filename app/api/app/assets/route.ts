import { NextResponse } from "next/server"
import { agencyError, getAgencyRequestContext } from "@/lib/agency/request"
import { getAgencyRuntimeEnv } from "@/lib/agency/runtime"

const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"])

export async function POST(request: Request) {
  try {
    const { session } = await getAgencyRequestContext(true)
    const bucket = (await getAgencyRuntimeEnv()).AGENCY_ASSETS
    if (!bucket) throw new Error("Letter asset storage is not configured.")
    const file = (await request.formData()).get("file")
    if (!(file instanceof File)) throw new Error("Choose an image to upload.")
    if (!allowed.has(file.type)) throw new Error("Use a PNG, JPEG, WebP or SVG image.")
    if (file.size > 2 * 1024 * 1024) throw new Error("Images must be 2 MB or smaller.")
    const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" } as Record<string, string>)[file.type]
    const id = crypto.randomUUID()
    const key = `${session.workspaceId}/${id}.${extension}`
    await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { workspaceId: session.workspaceId } })
    return NextResponse.json({ url: `${new URL(request.url).origin}/api/letter-assets/${session.workspaceId}/${id}.${extension}` }, { status: 201 })
  } catch (error) { return agencyError(error) }
}
