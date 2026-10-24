import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import type { Task } from "@/lib/types"

export function TaskProgress({
  task,
  disabled = false,
  readOnly = false,
  onSave,
}: {
  task: Task
  disabled?: boolean
  readOnly?: boolean
  onSave?: (progress: number) => Promise<unknown>
}) {
  const value = task.progress ?? (task.status === "done" ? 100 : 0)
  return (
    <div className="task-progress">
      <Progress value={value} aria-label={`${task.title}进度`} />
      {readOnly ? (
        <span className="task-progress-value">{value}%</span>
      ) : (
        <div className="task-progress-number">
          <Input
            key={value}
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={value}
            disabled={disabled}
            aria-label={`修改进度：${task.title}`}
            title="输入 0–100，按 Enter 或离开输入框保存；Esc 取消"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.value = String(value)
                event.currentTarget.blur()
              } else if (event.key === "Enter") event.currentTarget.blur()
            }}
            onBlur={async (event) => {
              const input = event.currentTarget
              const next = input.valueAsNumber
              if (
                !input.validity.valid ||
                !Number.isInteger(next) ||
                next < 0 ||
                next > 100
              ) {
                input.value = String(value)
                toast.error("进度请输入 0–100 的整数")
                return
              }
              if (next === value) return
              try {
                await onSave?.(next)
              } catch {
                input.value = String(value)
              }
            }}
          />
          <span aria-hidden="true">%</span>
        </div>
      )}
    </div>
  )
}
