import { create } from "zustand"
import { persist } from "zustand/middleware"
export const fontSizes = [
  { value: "100", label: "标准 · 100%" },
  { value: "112.5", label: "较大 · 112.5%" },
  { value: "125", label: "大 · 125%" },
  { value: "150", label: "特大 · 150%" },
]
export const themes = [
  { value: "sand", label: "暖砂" },
  { value: "indigo", label: "靛蓝" },
  { value: "jade", label: "青玉" },
]
type UI = {
  theme: string
  fontSize: string
  dark: boolean
  page: string
  view: string
  query: string
  filter: string
  project: string
  selected: string | null
  showDetails: boolean
  set: (value: Partial<Omit<UI, "set">>) => void
}
export const useUI = create<UI>()(
  persist(
    (set) => ({
      dark: false,
      theme: "sand",
      fontSize: "100",
      page: "overview",
      view: "list",
      query: "",
      filter: "all",
      project: "all",
      selected: null,
      showDetails: true,
      set,
    }),
    {
      name: "forma-ui-v001",
      partialize: (s) => ({
        dark: s.dark,
        theme: s.theme,
        fontSize: s.fontSize,
        showDetails: s.showDetails,
        view: s.view,
      }),
    }
  )
)
