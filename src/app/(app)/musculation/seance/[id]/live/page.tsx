import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startFromTemplate } from "../../actions"
import { WorkoutLive } from "./workout-live"

export default async function WorkoutLivePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const workout = await prisma.workout.findFirst({
    where: { id, userId: session.user.id },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!workout) notFound()
  if (workout.status === "TERMINEE") redirect(`/musculation/seance/${id}`)

  // Si c'est un template, créer une copie et rediriger vers celle-ci
  if (workout.isTemplate) await startFromTemplate(id)

  return <WorkoutLive workout={workout} />
}
