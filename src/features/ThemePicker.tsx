import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { themes, useUI } from "@/store"

export function ThemePicker() {
  const theme = useUI((state) => state.theme)
  const set = useUI((state) => state.set)
  return (
    <section className="theme-setting" aria-labelledby="theme-setting-title">
      <Label id="theme-setting-title">主题配色</Label>
      <p>一键切换，深浅色均可用，自动保存在当前浏览器。</p>
      <RadioGroup
        aria-labelledby="theme-setting-title"
        value={theme}
        orientation="horizontal"
        className="theme-picker"
        onValueChange={(value) => set({ theme: value })}
      >
        {themes.map((option) => (
          <Label
            key={option.value}
            htmlFor={`theme-${option.value}`}
            className="theme-choice"
            data-selected={theme === option.value}
          >
            <span
              className="theme-preview"
              data-palette={option.value}
              aria-hidden="true"
            >
              <span className="preview-sidebar">
                <i />
                <i />
                <i />
              </span>
              <span className="preview-content">
                <i />
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <b />
                <b />
              </span>
            </span>
            <span className="theme-choice-footer">
              {option.label}
              <RadioGroupItem
                id={`theme-${option.value}`}
                value={option.value}
                aria-label={option.label}
              />
            </span>
          </Label>
        ))}
      </RadioGroup>
    </section>
  )
}
