import { create } from "zustand"
import { persist } from "zustand/middleware"
type UI = {
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
        showDetails: s.showDetails,
        view: s.view,
      }),
    }
  )
)
