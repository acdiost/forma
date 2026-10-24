import { createContext, useContext, useEffect, useState } from "react"
import { ClientResponseError } from "pocketbase"
import { pb, queryClient } from "./api"
import type { Member } from "./types"
const AuthContext = createContext<{
  user: Member | null
  ready: boolean
  logout: () => void
}>({ user: null, ready: false, logout: () => {} })
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(pb.authStore.record as Member | null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_, record) => {
      setUser(record as Member | null)
      if (!record) queryClient.removeQueries({ queryKey: ["workspace"] })
    })
    let alive = true
    const restore = async () => {
      if (
        pb.authStore.isValid &&
        pb.authStore.record?.collectionName === "members"
      ) {
        try {
          await pb.collection("members").authRefresh()
        } catch (error) {
          if (
            error instanceof ClientResponseError &&
            [400, 401, 403, 404].includes(error.status)
          )
            pb.authStore.clear()
        }
      } else pb.authStore.clear()
      if (alive) setReady(true)
    }
    void restore()
    const interval = window.setInterval(() => void restore(), 60_000)
    const focus = () => void restore()
    window.addEventListener("focus", focus)
    return () => {
      alive = false
      unsubscribe()
      clearInterval(interval)
      window.removeEventListener("focus", focus)
    }
  }, [])
  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        logout: () => {
          pb.authStore.clear()
          queryClient.clear()
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
