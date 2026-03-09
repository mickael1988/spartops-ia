"use client"

import { createContext, useContext, useState, useCallback } from "react"

type CartItem = {
  id: string
  name: string
  image: string | null
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clear: () => void
  hasItem: (id: string) => boolean
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => prev.some((i) => i.id === item.id) ? prev : [...prev, item])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const hasItem = useCallback((id: string) => items.some((i) => i.id === id), [items])

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, hasItem }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside CartProvider")
  return ctx
}
