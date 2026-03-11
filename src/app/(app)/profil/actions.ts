"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Non authentifié" }

  const name = (formData.get("name") as string)?.trim()
  if (!name) return { error: "Le nom est requis" }
  if (name.length > 100) return { error: "Nom trop long (max 100 caractères)" }

  const imageFile = formData.get("image") as File | null

  let imageUrl: string | undefined
  if (imageFile && imageFile.size > 0) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(imageFile.type)) {
      return { error: "Format non supporté (jpg, png, webp, gif)" }
    }
    if (imageFile.size > 3 * 1024 * 1024) {
      return { error: "Image trop grande (max 3 Mo)" }
    }

    const ext = imageFile.type === "image/jpeg" ? "jpg" : imageFile.type.split("/")[1]
    const filename = `avatar-${session.user.id}.${ext}`
    const buffer = Buffer.from(await imageFile.arrayBuffer())

    const { writeFile, mkdir } = await import("fs/promises")
    const { join } = await import("path")
    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), buffer)

    imageUrl = `/uploads/${filename}`
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      updatedAt: new Date(),
      ...(imageUrl ? { image: imageUrl } : {}),
    },
  })

  revalidatePath("/profil")
  return {}
}
