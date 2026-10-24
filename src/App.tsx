import { lazy, Suspense, useEffect, type CSSProperties } from "react"
import { Layers, LoaderCircle } from "lucide-react"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import { fontSizes, themes, useUI } from "@/store"
import { AuthScreen } from "@/features/AuthScreen"
import "./app.css"
import "./production.css"
import "./themes.css"
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
  const theme = useUI((s) => s.theme)
  useEffect(() => {
    document.documentElement.dataset.colorTheme = themes.some(
      (option) => option.value === theme
    )
      ? theme
      : "sand"
  }, [theme])
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
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-bg-hover": "var(--accent)",
            "--normal-text": "var(--foreground)",
            "--normal-border": "var(--border)",
            "--success-bg": "var(--jade-3)",
            "--success-text": "var(--jade-11)",
            "--success-border": "var(--jade-6)",
            "--info-bg": "var(--blue-3)",
            "--info-text": "var(--blue-11)",
            "--info-border": "var(--blue-6)",
            "--warning-bg": "var(--amber-3)",
            "--warning-text": "var(--amber-11)",
            "--warning-border": "var(--amber-6)",
            "--error-bg": "var(--red-3)",
            "--error-text": "var(--red-11)",
            "--error-border": "var(--red-6)",
          } as CSSProperties
        }
      />
    </TooltipProvider>
  )
}
