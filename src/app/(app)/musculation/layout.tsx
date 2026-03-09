import { CartProvider } from "./cart-context"

export default function MusculationLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  )
}
