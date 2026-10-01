import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { CardioLive } from "./cardio-live"

export default async function CardioSeancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const wod = await prisma.cardioProgram.findFirst({
    where: { id, OR: [{ userId: null }, { userId: session.user.id }] },
    include: {
      steps: {
        include: { cardioExercise: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!wod) notFound()

  return (
    <CardioLive
      wod={{
        id: wod.id,
        name: wod.name,
        image: wod.image,
        format: wod.format,
        durationMin: wod.durationMin,
        steps: wod.steps.map((step) => ({
          order: step.order,
          name: step.cardioExercise.name,
          image: step.cardioExercise.image,
          durationSec: step.durationSec,
          reps: step.reps,
          distanceM: step.distanceM,
        })),
      }}
    />
  )
}
