import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function getTcpConnectionString(url: string): string {
  if (!url.startsWith("prisma+postgres://")) return url
  const parsed = new URL(url)
  const apiKey = parsed.searchParams.get("api_key")
  if (!apiKey) throw new Error("api_key manquant dans DATABASE_URL")
  try {
    const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString("utf8"))
    return decoded.databaseUrl
  } catch {
    throw new Error("Impossible de décoder la DATABASE_URL prisma+postgres://")
  }
}

const connectionString = getTcpConnectionString(process.env.DATABASE_URL!)
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const muscleGroups = [
  { name: "Pectoraux", slug: "pectoraux", image: "/groups/pectoraux.png" },
  { name: "Dos", slug: "dos", image: "/groups/dos.png" },
  { name: "Épaules", slug: "epaules", image: "/groups/epaule.png" },
  { name: "Biceps", slug: "biceps", image: "/groups/biceps.png" },
  { name: "Triceps", slug: "triceps", image: "/groups/triceps.png" },
  { name: "Abdominaux", slug: "abdominaux", image: "/groups/abdominaux.png" },
  { name: "Jambes", slug: "jambes", image: "/groups/Jambes.png" },
  { name: "Fessiers", slug: "fessiers", image: "/groups/fessiers.png" },
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

function slugifyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

type CardioExerciseSeed = {
  name: string
  description: string
  image: string
  equipment: string | null
  difficulty: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"
}

const cardioExercises: CardioExerciseSeed[] = [
  { name: "Burpees", description: "Descendez en position de pompe, effectuez une pompe, ramenez les pieds sous vous et sautez en l'air.", image: "🔥", equipment: null, difficulty: "INTERMEDIAIRE" },
  { name: "Jumping jacks", description: "Sautez en écartant bras et jambes, puis revenez en position de départ.", image: "⭐", equipment: null, difficulty: "DEBUTANT" },
  { name: "Mountain climbers", description: "En position de planche, ramenez alternativement les genoux vers la poitrine à un rythme soutenu.", image: "🏃", equipment: null, difficulty: "DEBUTANT" },
  { name: "Squats sautés", description: "Descendez en squat puis explosez vers le haut en sautant.", image: "🦵", equipment: null, difficulty: "INTERMEDIAIRE" },
  { name: "Fentes sautées", description: "Alternez les jambes en sautant entre chaque fente.", image: "🦵", equipment: null, difficulty: "INTERMEDIAIRE" },
  { name: "Corde à sauter", description: "Sautez à la corde à un rythme régulier.", image: "🪢", equipment: "Corde à sauter", difficulty: "DEBUTANT" },
  { name: "Gainage", description: "Maintenez une position de planche, corps aligné, abdominaux gainés.", image: "🧘", equipment: null, difficulty: "DEBUTANT" },
  { name: "Sit-ups", description: "Allongé sur le dos, genoux pliés, relevez le buste jusqu'aux genoux.", image: "🎯", equipment: null, difficulty: "DEBUTANT" },
  { name: "Pompes", description: "En appui sur les mains et les pieds, fléchissez les coudes pour descendre la poitrine vers le sol.", image: "💪", equipment: null, difficulty: "INTERMEDIAIRE" },
  { name: "High knees", description: "Courez sur place en montant les genoux le plus haut possible.", image: "🏃", equipment: null, difficulty: "DEBUTANT" },
  { name: "Wall balls", description: "Lancez un medicine ball contre un mur en sortant d'un squat, rattrapez et recommencez.", image: "🏀", equipment: "Medicine ball", difficulty: "AVANCE" },
  { name: "Kettlebell swings", description: "Balancez le kettlebell entre les jambes puis jusqu'à hauteur d'épaules grâce à la poussée des hanches.", image: "🏋️", equipment: "Kettlebell", difficulty: "INTERMEDIAIRE" },
  { name: "Box jumps", description: "Sautez pieds joints sur une plateforme surélevée.", image: "📦", equipment: "Box", difficulty: "AVANCE" },
  { name: "Double-unders", description: "Faites passer la corde deux fois sous les pieds à chaque saut.", image: "🪢", equipment: "Corde à sauter", difficulty: "AVANCE" },
  { name: "Thrusters", description: "Enchaînez un squat avant et une poussée de la barre au-dessus de la tête.", image: "🏋️", equipment: "Barre", difficulty: "AVANCE" },
  { name: "Rowing", description: "Ramez à intensité soutenue sur la machine.", image: "🚣", equipment: "Rameur", difficulty: "INTERMEDIAIRE" },
  { name: "Vélo", description: "Pédalez à intensité soutenue sur le vélo d'appartement.", image: "🚴", equipment: "Vélo d'appartement", difficulty: "INTERMEDIAIRE" },
  { name: "Tractions", description: "Suspendu à la barre, tirez le corps vers le haut jusqu'à ce que le menton dépasse la barre.", image: "💪", equipment: "Barre de traction", difficulty: "AVANCE" },
  { name: "Air squats", description: "Descendez en squat poids du corps puis remontez complètement.", image: "🦵", equipment: null, difficulty: "DEBUTANT" },
  { name: "Dips", description: "Aux barres parallèles, descendez en pliant les coudes puis repoussez.", image: "💪", equipment: "Barres parallèles", difficulty: "INTERMEDIAIRE" },
  { name: "Repos", description: "Pause active ou passive entre deux efforts.", image: "💤", equipment: null, difficulty: "DEBUTANT" },
  { name: "Soulevé de terre", description: "Barre au sol, dos droit, redressez-vous en poussant dans les jambes puis reposez la barre.", image: "🏋️", equipment: "Barre", difficulty: "INTERMEDIAIRE" },
  { name: "Handstand push-ups", description: "En équilibre sur les mains contre un mur, fléchissez les bras puis repoussez.", image: "🤸", equipment: "Mur", difficulty: "AVANCE" },
  { name: "Clean and jerk", description: "Montez la barre du sol jusqu'aux épaules, puis au-dessus de la tête en deux temps.", image: "🏋️", equipment: "Barre", difficulty: "AVANCE" },
  { name: "Pistol squats", description: "Squat sur une jambe, l'autre tendue devant vous, puis remontez.", image: "🦵", equipment: null, difficulty: "AVANCE" },
]

type CardioStepSeed = {
  exercise: string
  durationSec?: number
  reps?: number
  intensity: "FAIBLE" | "MOYENNE" | "HAUTE"
}

type CardioProgramSeed = {
  name: string
  description: string
  format: "CIRCUIT" | "AMRAP" | "EMOM" | "FOR_TIME"
  level: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"
  durationMin: number
  equipment: string | null
  calories: number
  isBenchmark?: boolean
  steps: CardioStepSeed[]
}

const cardioPrograms: CardioProgramSeed[] = [
  // CIRCUIT
  {
    name: "Réveil Cardio", description: "Un circuit doux pour se mettre en route, sans matériel.",
    format: "CIRCUIT", level: "DEBUTANT", durationMin: 6, equipment: null, calories: 80,
    steps: [
      { exercise: "Jumping jacks", durationSec: 40, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "High knees", durationSec: 40, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "Mountain climbers", durationSec: 40, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "Air squats", durationSec: 40, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "Jumping jacks", durationSec: 40, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "High knees", durationSec: 40, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
    ],
  },
  {
    name: "Tabata Total", description: "Huit intervalles courts et intenses, sans matériel.",
    format: "CIRCUIT", level: "INTERMEDIAIRE", durationMin: 4, equipment: null, calories: 70,
    steps: [
      { exercise: "Burpees", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 10, intensity: "FAIBLE" },
      { exercise: "Mountain climbers", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 10, intensity: "FAIBLE" },
      { exercise: "Squats sautés", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 10, intensity: "FAIBLE" },
      { exercise: "High knees", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 10, intensity: "FAIBLE" },
      { exercise: "Burpees", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 10, intensity: "FAIBLE" },
      { exercise: "Mountain climbers", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 10, intensity: "FAIBLE" },
      { exercise: "Squats sautés", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 10, intensity: "FAIBLE" },
      { exercise: "High knees", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 10, intensity: "FAIBLE" },
    ],
  },
  {
    name: "Corde en Feu", description: "Un circuit centré sur la corde à sauter.",
    format: "CIRCUIT", level: "DEBUTANT", durationMin: 6, equipment: "Corde à sauter", calories: 90,
    steps: [
      { exercise: "Corde à sauter", durationSec: 60, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 30, intensity: "FAIBLE" },
      { exercise: "Corde à sauter", durationSec: 60, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 30, intensity: "FAIBLE" },
      { exercise: "Corde à sauter", durationSec: 60, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 30, intensity: "FAIBLE" },
      { exercise: "Corde à sauter", durationSec: 60, intensity: "MOYENNE" },
      { exercise: "Repos", durationSec: 30, intensity: "FAIBLE" },
    ],
  },
  {
    name: "Feu Kettlebell", description: "Un circuit exigeant centré sur le kettlebell.",
    format: "CIRCUIT", level: "AVANCE", durationMin: 6, equipment: "Kettlebell", calories: 140,
    steps: [
      { exercise: "Kettlebell swings", durationSec: 45, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 15, intensity: "FAIBLE" },
      { exercise: "Kettlebell swings", durationSec: 45, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 15, intensity: "FAIBLE" },
      { exercise: "Kettlebell swings", durationSec: 45, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 15, intensity: "FAIBLE" },
      { exercise: "Kettlebell swings", durationSec: 45, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 15, intensity: "FAIBLE" },
      { exercise: "Kettlebell swings", durationSec: 45, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 15, intensity: "FAIBLE" },
      { exercise: "Kettlebell swings", durationSec: 45, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 15, intensity: "FAIBLE" },
    ],
  },
  {
    name: "Rameur Intervalles", description: "Un circuit long à base de rameur.",
    format: "CIRCUIT", level: "AVANCE", durationMin: 8, equipment: "Rameur", calories: 170,
    steps: [
      { exercise: "Rowing", durationSec: 60, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "Rowing", durationSec: 60, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "Rowing", durationSec: 60, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "Rowing", durationSec: 60, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "Rowing", durationSec: 60, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
      { exercise: "Rowing", durationSec: 60, intensity: "HAUTE" },
      { exercise: "Repos", durationSec: 20, intensity: "FAIBLE" },
    ],
  },
  // AMRAP
  {
    name: "Trio Express", description: "Un enchaînement simple à répéter le plus de fois possible.",
    format: "AMRAP", level: "DEBUTANT", durationMin: 10, equipment: null, calories: 90,
    steps: [
      { exercise: "Pompes", reps: 6, intensity: "MOYENNE" },
      { exercise: "Sit-ups", reps: 12, intensity: "MOYENNE" },
      { exercise: "Air squats", reps: 18, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Corps de Fer", description: "Un tour rapide et exigeant, sans matériel.",
    format: "AMRAP", level: "INTERMEDIAIRE", durationMin: 12, equipment: null, calories: 130,
    steps: [
      { exercise: "Burpees", reps: 8, intensity: "HAUTE" },
      { exercise: "Mountain climbers", reps: 20, intensity: "MOYENNE" },
      { exercise: "Fentes sautées", reps: 12, intensity: "MOYENNE" },
    ],
  },
  {
    name: "AMRAP Boîte", description: "Un tour explosif avec une box et un medicine ball.",
    format: "AMRAP", level: "AVANCE", durationMin: 15, equipment: "Box, Medicine ball", calories: 180,
    steps: [
      { exercise: "Box jumps", reps: 10, intensity: "HAUTE" },
      { exercise: "Wall balls", reps: 12, intensity: "HAUTE" },
      { exercise: "Sit-ups", reps: 15, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Fer et Sueur", description: "Un tour de force avec barre, kettlebell et barre de traction.",
    format: "AMRAP", level: "AVANCE", durationMin: 18, equipment: "Kettlebell, Barre, Barre de traction", calories: 210,
    steps: [
      { exercise: "Thrusters", reps: 8, intensity: "HAUTE" },
      { exercise: "Kettlebell swings", reps: 15, intensity: "HAUTE" },
      { exercise: "Tractions", reps: 6, intensity: "HAUTE" },
    ],
  },
  {
    name: "Débutant Motivé", description: "Un tour accessible pour démarrer en douceur.",
    format: "AMRAP", level: "DEBUTANT", durationMin: 8, equipment: null, calories: 70,
    steps: [
      { exercise: "Jumping jacks", reps: 20, intensity: "MOYENNE" },
      { exercise: "Air squats", reps: 10, intensity: "MOYENNE" },
      { exercise: "High knees", reps: 20, intensity: "MOYENNE" },
    ],
  },
  // EMOM
  {
    name: "Minute Choc", description: "Deux exercices à enchaîner chaque minute.",
    format: "EMOM", level: "DEBUTANT", durationMin: 10, equipment: null, calories: 80,
    steps: [
      { exercise: "Jumping jacks", durationSec: 30, intensity: "MOYENNE" },
      { exercise: "Air squats", durationSec: 30, intensity: "MOYENNE" },
    ],
  },
  {
    name: "EMOM Kettlebell", description: "Un exercice kettlebell suivi de mountain climbers, chaque minute.",
    format: "EMOM", level: "INTERMEDIAIRE", durationMin: 12, equipment: "Kettlebell", calories: 120,
    steps: [
      { exercise: "Kettlebell swings", durationSec: 30, intensity: "MOYENNE" },
      { exercise: "Mountain climbers", durationSec: 30, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Sprint Minute", description: "Trois exercices intenses à répartir sur chaque minute.",
    format: "EMOM", level: "AVANCE", durationMin: 15, equipment: null, calories: 160,
    steps: [
      { exercise: "Burpees", durationSec: 20, intensity: "HAUTE" },
      { exercise: "High knees", durationSec: 20, intensity: "HAUTE" },
      { exercise: "Air squats", durationSec: 20, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Corde Minutée", description: "Une minute de corde à sauter, minute après minute.",
    format: "EMOM", level: "INTERMEDIAIRE", durationMin: 10, equipment: "Corde à sauter", calories: 100,
    steps: [
      { exercise: "Corde à sauter", durationSec: 60, intensity: "MOYENNE" },
    ],
  },
  {
    name: "EMOM Force", description: "Deux mouvements de force à haute intensité, chaque minute.",
    format: "EMOM", level: "AVANCE", durationMin: 16, equipment: "Barre, Barre de traction", calories: 190,
    steps: [
      { exercise: "Thrusters", durationSec: 30, intensity: "HAUTE" },
      { exercise: "Tractions", durationSec: 30, intensity: "HAUTE" },
    ],
  },
  // FOR_TIME
  {
    name: "Sprint Final", description: "Une liste courte à enchaîner le plus vite possible.",
    format: "FOR_TIME", level: "DEBUTANT", durationMin: 5, equipment: null, calories: 50,
    steps: [
      { exercise: "Jumping jacks", reps: 30, intensity: "MOYENNE" },
      { exercise: "Air squats", reps: 20, intensity: "MOYENNE" },
      { exercise: "Sit-ups", reps: 20, intensity: "MOYENNE" },
    ],
  },
  {
    name: "La Descente", description: "Une échelle descendante de burpees et squats, sans matériel.",
    format: "FOR_TIME", level: "INTERMEDIAIRE", durationMin: 12, equipment: null, calories: 130,
    steps: [
      { exercise: "Burpees", reps: 21, intensity: "HAUTE" },
      { exercise: "Air squats", reps: 21, intensity: "MOYENNE" },
      { exercise: "Burpees", reps: 15, intensity: "HAUTE" },
      { exercise: "Air squats", reps: 15, intensity: "MOYENNE" },
      { exercise: "Burpees", reps: 9, intensity: "HAUTE" },
      { exercise: "Air squats", reps: 9, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Box Express", description: "Un enchaînement à base de box jumps, à terminer le plus vite possible.",
    format: "FOR_TIME", level: "INTERMEDIAIRE", durationMin: 6, equipment: "Box", calories: 70,
    steps: [
      { exercise: "Box jumps", reps: 15, intensity: "HAUTE" },
      { exercise: "Mountain climbers", reps: 30, intensity: "MOYENNE" },
      { exercise: "Fentes sautées", reps: 20, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Fer & Chrono", description: "Un chrono exigeant à base de barre et kettlebell.",
    format: "FOR_TIME", level: "AVANCE", durationMin: 8, equipment: "Barre, Kettlebell, Barre de traction", calories: 90,
    steps: [
      { exercise: "Thrusters", reps: 15, intensity: "HAUTE" },
      { exercise: "Kettlebell swings", reps: 20, intensity: "HAUTE" },
      { exercise: "Tractions", reps: 10, intensity: "HAUTE" },
    ],
  },
  {
    name: "La Complète", description: "Le chrono le plus complet du catalogue, à réserver aux plus aguerris.",
    format: "FOR_TIME", level: "AVANCE", durationMin: 10, equipment: "Barre, Kettlebell, Box, Barre de traction", calories: 110,
    steps: [
      { exercise: "Thrusters", reps: 12, intensity: "HAUTE" },
      { exercise: "Kettlebell swings", reps: 20, intensity: "HAUTE" },
      { exercise: "Box jumps", reps: 15, intensity: "HAUTE" },
      { exercise: "Tractions", reps: 10, intensity: "HAUTE" },
    ],
  },
  // CLASSIQUES (benchmarks historiques du CrossFit)
  {
    name: "Fran", description: "Le classique des classiques : 21-15-9 thrusters et tractions, le plus vite possible. Charge de référence : 43 kg (hommes) / 30 kg (femmes).",
    format: "FOR_TIME", level: "AVANCE", durationMin: 8, equipment: "Barre, Barre de traction", calories: 90, isBenchmark: true,
    steps: [
      { exercise: "Thrusters", reps: 21, intensity: "HAUTE" },
      { exercise: "Tractions", reps: 21, intensity: "HAUTE" },
      { exercise: "Thrusters", reps: 15, intensity: "HAUTE" },
      { exercise: "Tractions", reps: 15, intensity: "HAUTE" },
      { exercise: "Thrusters", reps: 9, intensity: "HAUTE" },
      { exercise: "Tractions", reps: 9, intensity: "HAUTE" },
    ],
  },
  {
    name: "Cindy", description: "20 minutes, autant de tours que possible : 5 tractions, 10 pompes, 15 air squats.",
    format: "AMRAP", level: "INTERMEDIAIRE", durationMin: 20, equipment: "Barre de traction", calories: 200, isBenchmark: true,
    steps: [
      { exercise: "Tractions", reps: 5, intensity: "HAUTE" },
      { exercise: "Pompes", reps: 10, intensity: "MOYENNE" },
      { exercise: "Air squats", reps: 15, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Annie", description: "50-40-30-20-10 double-unders et sit-ups, le plus vite possible.",
    format: "FOR_TIME", level: "AVANCE", durationMin: 10, equipment: "Corde à sauter", calories: 100, isBenchmark: true,
    steps: [
      { exercise: "Double-unders", reps: 50, intensity: "HAUTE" },
      { exercise: "Sit-ups", reps: 50, intensity: "MOYENNE" },
      { exercise: "Double-unders", reps: 40, intensity: "HAUTE" },
      { exercise: "Sit-ups", reps: 40, intensity: "MOYENNE" },
      { exercise: "Double-unders", reps: 30, intensity: "HAUTE" },
      { exercise: "Sit-ups", reps: 30, intensity: "MOYENNE" },
      { exercise: "Double-unders", reps: 20, intensity: "HAUTE" },
      { exercise: "Sit-ups", reps: 20, intensity: "MOYENNE" },
      { exercise: "Double-unders", reps: 10, intensity: "HAUTE" },
      { exercise: "Sit-ups", reps: 10, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Angie", description: "100 tractions, 100 pompes, 100 sit-ups, 100 air squats, dans cet ordre, le plus vite possible.",
    format: "FOR_TIME", level: "INTERMEDIAIRE", durationMin: 30, equipment: "Barre de traction", calories: 250, isBenchmark: true,
    steps: [
      { exercise: "Tractions", reps: 100, intensity: "HAUTE" },
      { exercise: "Pompes", reps: 100, intensity: "HAUTE" },
      { exercise: "Sit-ups", reps: 100, intensity: "MOYENNE" },
      { exercise: "Air squats", reps: 100, intensity: "MOYENNE" },
    ],
  },
  {
    name: "Karen", description: "150 wall balls, le plus vite possible. Charge de référence : 9 kg (hommes) / 6 kg (femmes).",
    format: "FOR_TIME", level: "INTERMEDIAIRE", durationMin: 15, equipment: "Medicine ball", calories: 150, isBenchmark: true,
    steps: [
      { exercise: "Wall balls", reps: 150, intensity: "HAUTE" },
    ],
  },
  {
    name: "Diane", description: "21-15-9 soulevés de terre et handstand push-ups, le plus vite possible. Charge de référence : 102 kg (hommes) / 70 kg (femmes).",
    format: "FOR_TIME", level: "AVANCE", durationMin: 10, equipment: "Barre, Mur", calories: 100, isBenchmark: true,
    steps: [
      { exercise: "Soulevé de terre", reps: 21, intensity: "HAUTE" },
      { exercise: "Handstand push-ups", reps: 21, intensity: "HAUTE" },
      { exercise: "Soulevé de terre", reps: 15, intensity: "HAUTE" },
      { exercise: "Handstand push-ups", reps: 15, intensity: "HAUTE" },
      { exercise: "Soulevé de terre", reps: 9, intensity: "HAUTE" },
      { exercise: "Handstand push-ups", reps: 9, intensity: "HAUTE" },
    ],
  },
  {
    name: "Grace", description: "30 clean and jerk, le plus vite possible. Charge de référence : 61 kg (hommes) / 43 kg (femmes).",
    format: "FOR_TIME", level: "AVANCE", durationMin: 8, equipment: "Barre", calories: 90, isBenchmark: true,
    steps: [
      { exercise: "Clean and jerk", reps: 30, intensity: "HAUTE" },
    ],
  },
  {
    name: "Mary", description: "20 minutes, autant de tours que possible : 5 handstand push-ups, 10 pistol squats, 15 tractions.",
    format: "AMRAP", level: "AVANCE", durationMin: 20, equipment: "Barre de traction, Mur", calories: 200, isBenchmark: true,
    steps: [
      { exercise: "Handstand push-ups", reps: 5, intensity: "HAUTE" },
      { exercise: "Pistol squats", reps: 10, intensity: "HAUTE" },
      { exercise: "Tractions", reps: 15, intensity: "HAUTE" },
    ],
  },
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
    const id = `${slug}-${data.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}`
    await prisma.exercise.upsert({
      where: { id },
      update: {},
      create: { ...data, muscleGroupId: group.id, id },
    })
  }
  console.log(`✅ ${exercises.length} exercises seeded`)

  console.log("Seeding cardio exercises...")
  const cardioExerciseIds = new Map<string, string>()
  for (const ex of cardioExercises) {
    const id = `cardio-ex-${slugifyName(ex.name)}`
    await prisma.cardioExercise.upsert({
      where: { id },
      update: {},
      create: { id, ...ex },
    })
    cardioExerciseIds.set(ex.name, id)
  }
  console.log(`✅ ${cardioExercises.length} cardio exercises seeded`)

  console.log("Seeding cardio programs (WOD)...")
  for (const program of cardioPrograms) {
    const { steps, ...programData } = program
    const programId = `cardio-wod-${slugifyName(program.name)}`
    await prisma.cardioProgram.upsert({
      where: { id: programId },
      update: {},
      create: { id: programId, ...programData },
    })
    for (const [index, step] of steps.entries()) {
      const exerciseId = cardioExerciseIds.get(step.exercise)
      if (!exerciseId) throw new Error(`Exercice cardio introuvable: ${step.exercise}`)
      const stepId = `${programId}-step-${index + 1}`
      await prisma.cardioStep.upsert({
        where: { id: stepId },
        update: {},
        create: {
          id: stepId,
          programId,
          order: index + 1,
          cardioExerciseId: exerciseId,
          durationSec: step.durationSec ?? null,
          reps: step.reps ?? null,
          intensity: step.intensity,
        },
      })
    }
  }
  console.log(`✅ ${cardioPrograms.length} cardio WOD seeded`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
