import { CartProvider } from "./cart-context"
import { CartBar } from "./cart-bar"

export default function MusculationLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartBar />
    </CartProvider>
  )
}
