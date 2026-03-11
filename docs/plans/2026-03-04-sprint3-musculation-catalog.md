# Sprint 3 — Musculation Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter le catalogue de groupes musculaires et exercices avec seed Prisma et deux pages de navigation.

**Architecture:** Server Components uniquement — lecture BDD directe dans les pages via Prisma singleton. Routing par slug (`/musculation/pectoraux`). Données pré-remplies via seed idempotent (`upsert`).

**Tech Stack:** Next.js 16 App Router, Prisma 7 (PrismaPg adapter), TypeScript, Tailwind CSS v4, shadcn/ui (Card, Badge)

---

## Task 1 : Seed — Groupes musculaires

**Files:**
- Modify: `prisma/seed.ts`

**Step 1 : Remplacer le contenu de `prisma/seed.ts`**

```typescript
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function getTcpConnectionString(url: string): string {
  if (!url.startsWith("prisma+postgres://")) return url
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get("api_key")!
  const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"))
  return decoded.databaseUrl
}

const connectionString = getTcpConnectionString(process.env.DATABASE_URL!)
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const muscleGroups = [
  { name: "Pectoraux", slug: "pectoraux", image: "💪" },
  { name: "Dos", slug: "dos", image: "🔙" },
  { name: "Épaules", slug: "epaules", image: "🏔️" },
  { name: "Biceps", slug: "biceps", image: "💪" },
  { name: "Triceps", slug: "triceps", image: "🦾" },
  { name: "Abdominaux", slug: "abdominaux", image: "🎯" },
  { name: "Jambes", slug: "jambes", image: "🦵" },
  { name: "Fessiers", slug: "fessiers", image: "🍑" },
]

async function main() {
  console.log("Seeding muscle groups...")
  for (const group of muscleGroups) {
    await prisma.muscleGroup.upsert({
      where: { slug: group.slug },
      update: {},
      create: group,
    })
  }
  console.log("✅ Muscle groups seeded")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
```

**Step 2 : Lancer le seed**

```bash
pnpm db:seed
```

Expected output:
```
Seeding muscle groups...
✅ Muscle groups seeded
```

**Step 3 : Vérifier dans Prisma Studio**

```bash
pnpm db:studio
```

Ouvrir `http://localhost:5555` → table `MuscleGroup` → 8 lignes visibles.

**Step 4 : Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed muscle groups (8 groupes)"
```

---

## Task 2 : Seed — Exercices (60 exercices)

**Files:**
- Modify: `prisma/seed.ts`

**Step 1 : Ajouter les données exercices dans `prisma/seed.ts`**

Après le tableau `muscleGroups`, ajouter le tableau `exercises` et la logique de seed. Remplacer le fichier complet :

```typescript
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function getTcpConnectionString(url: string): string {
  if (!url.startsWith("prisma+postgres://")) return url
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get("api_key")!
  const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"))
  return decoded.databaseUrl
}

const connectionString = getTcpConnectionString(process.env.DATABASE_URL!)
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const muscleGroups = [
  { name: "Pectoraux", slug: "pectoraux", image: "💪" },
  { name: "Dos", slug: "dos", image: "🔙" },
  { name: "Épaules", slug: "epaules", image: "🏔️" },
  { name: "Biceps", slug: "biceps", image: "💪" },
  { name: "Triceps", slug: "triceps", image: "🦾" },
  { name: "Abdominaux", slug: "abdominaux", image: "🎯" },
  { name: "Jambes", slug: "jambes", image: "🦵" },
  { name: "Fessiers", slug: "fessiers", image: "🍑" },
]

const exercises = [
  // PECTORAUX
  { slug: "pectoraux", name: "Développé couché", description: "Allongé sur un banc, descendez la barre jusqu'à la poitrine puis poussez.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre, Banc", image: "🏋️" },
  { slug: "pectoraux", name: "Développé couché haltères", description: "Même mouvement qu'avec barre mais avec haltères pour une plus grande amplitude.", difficulty: "INTERMEDIAIRE" as const, equipment: "Haltères, Banc", image: "🏋️" },
  { slug: "pectoraux", name: "Pompes", description: "En appui sur les mains et les pieds, fléchissez les coudes pour descendre la poitrine vers le sol.", difficulty: "DEBUTANT" as const, equipment: null, image: "💪" },
  { slug: "pectoraux", name: "Écarté couché", description: "Allongé sur banc, ouvrez les bras en arc de cercle avec haltères jusqu'à l'horizontal.", difficulty: "INTERMEDIAIRE" as const, equipment: "Haltères, Banc", image: "🦅" },
  { slug: "pectoraux", name: "Dips pectoraux", description: "Aux barres parallèles, penchez-vous en avant et descendez jusqu'à 90° aux coudes.", difficulty: "AVANCE" as const, equipment: "Barres parallèles", image: "⬇️" },
  { slug: "pectoraux", name: "Développé incliné", description: "Sur banc incliné à 30-45°, développez la barre pour cibler le haut des pectoraux.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre, Banc incliné", image: "📐" },
  { slug: "pectoraux", name: "Pullover", description: "Allongé transversalement sur un banc, tenez un haltère à deux mains au-dessus de la poitrine.", difficulty: "AVANCE" as const, equipment: "Haltère, Banc", image: "🔄" },
  // DOS
  { slug: "dos", name: "Tractions", description: "Suspendu à une barre, tirez votre corps vers le haut jusqu'à ce que le menton dépasse la barre.", difficulty: "AVANCE" as const, equipment: "Barre de traction", image: "⬆️" },
  { slug: "dos", name: "Rowing barre", description: "Penché en avant à 45°, tirez la barre vers votre abdomen en serrant les omoplates.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre", image: "🚣" },
  { slug: "dos", name: "Tirage vertical", description: "Assis à la machine, tirez la barre vers la poitrine en gardant le dos droit.", difficulty: "DEBUTANT" as const, equipment: "Machine tirage", image: "⬇️" },
  { slug: "dos", name: "Rowing haltère", description: "Un genou et une main sur le banc, tirez l'haltère vers la hanche.", difficulty: "DEBUTANT" as const, equipment: "Haltère, Banc", image: "🚣" },
  { slug: "dos", name: "Soulevé de terre", description: "Pieds écartés largeur épaules, saisissez la barre et redressez-vous en gardant le dos droit.", difficulty: "AVANCE" as const, equipment: "Barre", image: "🏋️" },
  { slug: "dos", name: "Tirage horizontal", description: "Assis face à la poulie basse, tirez les poignées vers l'abdomen en serrant les omoplates.", difficulty: "DEBUTANT" as const, equipment: "Poulie basse", image: "↔️" },
  { slug: "dos", name: "Good morning", description: "Barre sur les épaules, fléchissez le buste en avant jusqu'à l'horizontal en gardant les jambes quasi-tendues.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre", image: "🌅" },
  // ÉPAULES
  { slug: "epaules", name: "Développé militaire", description: "Debout ou assis, poussez la barre au-dessus de la tête en partant des épaules.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre", image: "🏋️" },
  { slug: "epaules", name: "Élévations latérales", description: "Debout, montez les haltères sur les côtés jusqu'à hauteur des épaules.", difficulty: "DEBUTANT" as const, equipment: "Haltères", image: "🦅" },
  { slug: "epaules", name: "Élévations frontales", description: "Debout, montez les haltères en avant jusqu'à hauteur des épaules.", difficulty: "DEBUTANT" as const, equipment: "Haltères", image: "⬆️" },
  { slug: "epaules", name: "Oiseau (Rear delt fly)", description: "Penché en avant, ouvrez les bras sur les côtés pour cibler l'arrière des épaules.", difficulty: "INTERMEDIAIRE" as const, equipment: "Haltères", image: "🦅" },
  { slug: "epaules", name: "Développé Arnold", description: "Partez avec les paumes face à vous, ouvrez et poussez simultanément vers le haut.", difficulty: "INTERMEDIAIRE" as const, equipment: "Haltères", image: "💪" },
  { slug: "epaules", name: "Upright row", description: "Tirez la barre verticalement jusqu'au menton en gardant les coudes au-dessus des mains.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre ou Haltères", image: "⬆️" },
  { slug: "epaules", name: "Face pull", description: "À la poulie haute, tirez la corde vers votre visage en écartant les mains.", difficulty: "DEBUTANT" as const, equipment: "Poulie haute, Corde", image: "🎯" },
  // BICEPS
  { slug: "biceps", name: "Curl barre", description: "Debout, fléchissez les coudes pour monter la barre jusqu'aux épaules, coudes collés au corps.", difficulty: "DEBUTANT" as const, equipment: "Barre EZ ou droite", image: "💪" },
  { slug: "biceps", name: "Curl haltères alterné", description: "Debout, fléchissez un bras puis l'autre en supinant le poignet en montant.", difficulty: "DEBUTANT" as const, equipment: "Haltères", image: "💪" },
  { slug: "biceps", name: "Curl concentré", description: "Assis, coude posé sur la cuisse, fléchissez lentement l'haltère jusqu'à l'épaule.", difficulty: "DEBUTANT" as const, equipment: "Haltère", image: "🎯" },
  { slug: "biceps", name: "Curl marteau", description: "Poignets neutres (pouces vers le haut), fléchissez les coudes pour monter les haltères.", difficulty: "DEBUTANT" as const, equipment: "Haltères", image: "🔨" },
  { slug: "biceps", name: "Curl poulie basse", description: "Face à la poulie basse, tirez la barre ou la corde en fléchissant les coudes.", difficulty: "DEBUTANT" as const, equipment: "Poulie basse", image: "⬆️" },
  { slug: "biceps", name: "Curl incliné", description: "Sur banc incliné à 45°, laissez les bras pendre et fléchissez pour une étirement maximal.", difficulty: "INTERMEDIAIRE" as const, equipment: "Haltères, Banc incliné", image: "📐" },
  { slug: "biceps", name: "Chin-up", description: "Tractions en prise supination (paumes vers vous), excellent pour les biceps.", difficulty: "AVANCE" as const, equipment: "Barre de traction", image: "⬆️" },
  // TRICEPS
  { slug: "triceps", name: "Dips triceps", description: "Aux barres parallèles ou sur une chaise, fléchissez et étendez les coudes en gardant le corps droit.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barres parallèles", image: "⬇️" },
  { slug: "triceps", name: "Extension nuque", description: "Bras tendus au-dessus de la tête, fléchissez les coudes pour descendre l'haltère derrière la tête.", difficulty: "DEBUTANT" as const, equipment: "Haltère", image: "🔙" },
  { slug: "triceps", name: "Pushdown poulie", description: "À la poulie haute, tendez les bras vers le bas en gardant les coudes fixes.", difficulty: "DEBUTANT" as const, equipment: "Poulie haute", image: "⬇️" },
  { slug: "triceps", name: "Barre au front (Skullcrusher)", description: "Allongé sur banc, descendez la barre vers le front en fléchissant les coudes.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre EZ, Banc", image: "💀" },
  { slug: "triceps", name: "Kickback", description: "Penché en avant, coude fixe au niveau de la hanche, tendez l'avant-bras vers l'arrière.", difficulty: "DEBUTANT" as const, equipment: "Haltère", image: "🦵" },
  { slug: "triceps", name: "Développé couché prise serrée", description: "Développé couché avec prise serrée (mains à 30 cm) pour cibler les triceps.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre, Banc", image: "🏋️" },
  { slug: "triceps", name: "Pompes diamant", description: "Pompes avec les mains formant un diamant sous la poitrine.", difficulty: "INTERMEDIAIRE" as const, equipment: null, image: "💎" },
  // ABDOMINAUX
  { slug: "abdominaux", name: "Crunch", description: "Allongé sur le dos, genoux fléchis, relevez les épaules sans décoller le bas du dos.", difficulty: "DEBUTANT" as const, equipment: null, image: "🎯" },
  { slug: "abdominaux", name: "Planche", description: "En appui sur les avant-bras et les pieds, gardez le corps droit pendant 30-60 secondes.", difficulty: "DEBUTANT" as const, equipment: null, image: "📏" },
  { slug: "abdominaux", name: "Relevé de jambes", description: "Allongé sur le dos, montez les jambes tendues jusqu'à la verticale puis descendez lentement.", difficulty: "INTERMEDIAIRE" as const, equipment: null, image: "⬆️" },
  { slug: "abdominaux", name: "Russian twist", description: "Assis, pieds décollés, tournez le buste de gauche à droite en tenant un poids.", difficulty: "INTERMEDIAIRE" as const, equipment: "Haltère ou Médecine-ball", image: "🔄" },
  { slug: "abdominaux", name: "Mountain climber", description: "En position de pompe, ramenez alternativement les genoux vers la poitrine rapidement.", difficulty: "INTERMEDIAIRE" as const, equipment: null, image: "🏃" },
  { slug: "abdominaux", name: "Ab wheel (Roue abdominale)", description: "À genoux, faites rouler la roue en avant en gardant le dos droit, puis revenez.", difficulty: "AVANCE" as const, equipment: "Roue abdominale", image: "⭕" },
  { slug: "abdominaux", name: "Dragon flag", description: "Accroché à un banc, tendez tout le corps et descendez-le horizontalement.", difficulty: "AVANCE" as const, equipment: "Banc", image: "🐉" },
  // JAMBES
  { slug: "jambes", name: "Squat", description: "Pieds écartés largeur épaules, descendez jusqu'à ce que les cuisses soient parallèles au sol.", difficulty: "DEBUTANT" as const, equipment: "Poids du corps ou Barre", image: "🦵" },
  { slug: "jambes", name: "Squat bulgare", description: "Pied arrière sur un banc, descendez le genou avant vers le sol.", difficulty: "AVANCE" as const, equipment: "Haltères, Banc", image: "🦵" },
  { slug: "jambes", name: "Fentes", description: "Faites un grand pas en avant et descendez le genou arrière vers le sol.", difficulty: "DEBUTANT" as const, equipment: "Poids du corps ou Haltères", image: "🚶" },
  { slug: "jambes", name: "Leg press", description: "Assis dans la machine, poussez la plateforme avec les pieds en étendant les jambes.", difficulty: "DEBUTANT" as const, equipment: "Machine leg press", image: "🏋️" },
  { slug: "jambes", name: "Leg curl (Ischio)", description: "Allongé sur la machine, fléchissez les jambes vers les fessiers.", difficulty: "DEBUTANT" as const, equipment: "Machine leg curl", image: "🔄" },
  { slug: "jambes", name: "Leg extension (Quadriceps)", description: "Assis sur la machine, étendez les jambes jusqu'à l'horizontal.", difficulty: "DEBUTANT" as const, equipment: "Machine leg extension", image: "⬆️" },
  { slug: "jambes", name: "Mollets debout", description: "Sur une marche, montez sur la pointe des pieds puis redescendez lentement.", difficulty: "DEBUTANT" as const, equipment: "Marche ou Machine", image: "⬆️" },
  { slug: "jambes", name: "Soulevé de terre jambes tendues", description: "Pieds parallèles, descendez la barre le long des jambes en gardant le dos droit.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre", image: "🏋️" },
  // FESSIERS
  { slug: "fessiers", name: "Hip thrust", description: "Dos sur un banc, poussez les hanches vers le haut avec une barre sur les hanches.", difficulty: "INTERMEDIAIRE" as const, equipment: "Barre, Banc", image: "⬆️" },
  { slug: "fessiers", name: "Pont fessier", description: "Allongé sur le dos, montez les hanches en contractant les fessiers.", difficulty: "DEBUTANT" as const, equipment: null, image: "🌉" },
  { slug: "fessiers", name: "Kick-back câble", description: "À la poulie basse, attachez la cheville et poussez la jambe vers l'arrière.", difficulty: "DEBUTANT" as const, equipment: "Poulie basse", image: "🦵" },
  { slug: "fessiers", name: "Abducteur machine", description: "Assis sur la machine, écartez les jambes contre la résistance.", difficulty: "DEBUTANT" as const, equipment: "Machine abducteur", image: "↔️" },
  { slug: "fessiers", name: "Squat sumo", description: "Pieds très écartés et orteils tournés vers l'extérieur, descendez en squat.", difficulty: "DEBUTANT" as const, equipment: "Haltère ou Barre", image: "🤼" },
  { slug: "fessiers", name: "Fentes latérales", description: "Faites un grand pas sur le côté et pliez le genou, l'autre jambe reste tendue.", difficulty: "INTERMEDIAIRE" as const, equipment: "Poids du corps ou Haltères", image: "↔️" },
  { slug: "fessiers", name: "Good morning", description: "Barre sur les épaules, penchez le buste en avant en gardant le dos droit pour étirer les fessiers.", difficulty: "AVANCE" as const, equipment: "Barre", image: "🌅" },
]

async function main() {
  console.log("Seeding muscle groups...")
  for (const group of muscleGroups) {
    await prisma.muscleGroup.upsert({
      where: { slug: group.slug },
      update: {},
      create: group,
    })
  }
  console.log("✅ Muscle groups seeded")

  console.log("Seeding exercises...")
  for (const ex of exercises) {
    const { slug, ...data } = ex
    const group = await prisma.muscleGroup.findUnique({ where: { slug } })
    if (!group) throw new Error(`Groupe musculaire introuvable: ${slug}`)
    await prisma.exercise.upsert({
      where: { id: `${slug}-${data.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: { ...data, muscleGroupId: group.id, id: `${slug}-${data.name.toLowerCase().replace(/\s+/g, "-")}` },
    })
  }
  console.log(`✅ ${exercises.length} exercises seeded`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
```

**Step 2 : Lancer le seed**

```bash
pnpm db:seed
```

Expected output:
```
Seeding muscle groups...
✅ Muscle groups seeded
Seeding exercises...
✅ 60 exercises seeded
```

**Step 3 : Vérifier dans Prisma Studio**

```bash
pnpm db:studio
```

Table `Exercise` → ~60 lignes.

**Step 4 : Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed 60 exercises across 8 muscle groups"
```

---

## Task 3 : Page `/musculation` — Grille des groupes

**Files:**
- Create: `src/app/(app)/musculation/page.tsx`

**Step 1 : Créer la page**

```tsx
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export default async function Musculation Page() {
  const groups = await prisma.muscleGroup.findMany({
    include: { _count: { select: { exercises: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Musculation</h1>
        <p className="text-muted-foreground mt-1">Choisissez un groupe musculaire</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <Link key={group.id} href={`/musculation/${group.slug}`}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-background/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="text-4xl mb-2">{group.image}</div>
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{group._count.exercises} exercices</p>
              </CardHeader>
              <CardContent>
                <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "#3F5EFB" }}>
                  Voir les exercices <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

**Step 2 : Vérifier dans le navigateur**

Lancer `pnpm dev` → aller sur `http://localhost:3000/musculation` → 8 cartes visibles.

**Step 3 : Commit**

```bash
git add src/app/\(app\)/musculation/page.tsx
git commit -m "feat: page /musculation — grille des groupes musculaires"
```

---

## Task 4 : Page `/musculation/[slug]` — Liste des exercices

**Files:**
- Create: `src/app/(app)/musculation/[slug]/page.tsx`

**Step 1 : Créer le dossier et la page**

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"

const difficultyConfig = {
  DEBUTANT: { label: "Débutant", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  INTERMEDIAIRE: { label: "Intermédiaire", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  AVANCE: { label: "Avancé", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
}

export default async function MuscleGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const group = await prisma.muscleGroup.findUnique({
    where: { slug },
    include: { exercises: { orderBy: { name: "asc" } } },
  })

  if (!group) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/musculation" className="hover:text-foreground transition-colors">
          Musculation
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{group.name}</span>
      </nav>

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{group.image}</span>
          <h1 className="text-3xl font-bold">{group.name}</h1>
        </div>
        <p className="text-muted-foreground mt-1">{group.exercises.length} exercices disponibles</p>
      </div>

      {/* Grille exercices */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.exercises.map((exercise) => {
          const diff = difficultyConfig[exercise.difficulty]
          return (
            <Card key={exercise.id} className="bg-background/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-2xl">{exercise.image ?? "🏋️"}</div>
                  <Badge className={diff.className}>{diff.label}</Badge>
                </div>
                <CardTitle className="text-base mt-2">{exercise.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>
                {exercise.equipment && (
                  <p className="text-xs text-muted-foreground mt-2">
                    🔧 {exercise.equipment}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2 : Vérifier dans le navigateur**

Aller sur `http://localhost:3000/musculation/pectoraux` → 7 exercices affichés avec badges colorés.

Tester une route invalide : `http://localhost:3000/musculation/inexistant` → page 404 Next.js.

**Step 3 : Commit**

```bash
git add src/app/\(app\)/musculation/
git commit -m "feat: page /musculation/[slug] — liste des exercices avec badges difficulté"
```

---

## Task 5 : Mettre à jour la sidebar (lien Musculation)

**Files:**
- Read: `src/components/layout/sidebar.tsx`
- Modify si nécessaire pour ajouter le lien `/musculation`

**Step 1 : Lire la sidebar**

Ouvrir `src/components/layout/sidebar.tsx` et vérifier si `/musculation` est déjà dans les liens de navigation.

**Step 2 : Ajouter si absent**

Si le lien n'est pas là, l'ajouter dans le tableau `navLinks` de la sidebar avec l'icône `Dumbbell` de lucide-react.

**Step 3 : Vérifier visuellement**

Naviguer dans la sidebar → clic sur "Musculation" → arrive sur `/musculation`.

**Step 4 : Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: lien Musculation actif dans la sidebar"
```

---

## Vérification finale

1. `pnpm dev` → pas d'erreur TypeScript en console
2. `/musculation` → 8 cartes de groupes musculaires
3. `/musculation/pectoraux` → 7 exercices avec badges verts/oranges/rouges
4. `/musculation/inexistant` → 404
5. Sidebar → lien Musculation fonctionnel
