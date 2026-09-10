import type { Metadata, Viewport } from "next"
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
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SpartOps" },
}

export const viewport: Viewport = {
  themeColor: "#3F5EFB",
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
