import type { Metadata } from "next"
import { Geist, Fredoka } from "next/font/google"
import { Providers } from "@/app/providers"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "SpartOps — Application Fitness",
  description: "Gérez vos entraînements et votre nutrition",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${fredoka.variable} antialiased`}>
          <Providers>{children}</Providers>
        </body>
    </html>
  )
}
