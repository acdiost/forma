import { lazy, Suspense, useEffect } from "react"
import { Layers, LoaderCircle } from "lucide-react"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import { fontSizes, useUI } from "@/store"
import { AuthScreen } from "@/features/AuthScreen"
import "./app.css"
import "./production.css"
const Workspace = lazy(() => import("@/features/Workspace"))
function Startup() {
  return (
    <div className="startup">
      <Layers size={30} />
      <LoaderCircle className="animate-spin" size={18} />
      <p>正在加载工作空间…</p>
    </div>
  )
}
export default function App() {
  const { user, ready } = useAuth()
  const dark = useUI((s) => s.dark)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])
  const fontSize = useUI((s) => s.fontSize)
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSizes.some((size) => size.value === fontSize) ? fontSize : "100"}%`
  }, [fontSize])
  return (
    <TooltipProvider>
      {!ready ? (
        <Startup />
      ) : user ? (
        <Suspense fallback={<Startup />}>
          <Workspace />
        </Suspense>
      ) : (
        <AuthScreen />
      )}
      <Toaster
        position="bottom-right"
        theme={dark ? "dark" : "light"}
        richColors
      />
    </TooltipProvider>
  )
}
