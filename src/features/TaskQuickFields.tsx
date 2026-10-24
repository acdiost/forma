import type { ReactNode } from "react"
import { Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { priorities, dateInput, type Priority, type Task } from "@/lib/types"

// All popup, focus and keyboard behavior comes from shadcn/Radix.
export function TaskChoice({
  label,
  value,
  options,
  disabled,
  onChange,
  children,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  disabled: boolean
  onChange: (value: string) => void
  children: ReactNode
}) {
  const current =
    options.find((option) => option.value === value)?.label || "未分配"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="task-choice"
          aria-label={label}
          aria-description={`当前：${current}`}
          title={`${label}（当前：${current}）`}
          disabled={disabled}
        >
          {children}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{label.split("：")[0]}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (next !== value) onChange(next)
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TaskPriority({
  task,
  disabled,
  onChange,
}: {
  task: Task
  disabled: boolean
  onChange: (priority: Priority) => void
}) {
  const priority = priorities.find((p) => p.value === task.priority)!
  return (
    <TaskChoice
      label={`修改优先级：${task.title}`}
      value={task.priority}
      options={priorities}
      disabled={disabled}
      onChange={(value) => onChange(value as Priority)}
    >
      <span className={`priority priority-${priority.label}`}>
        <Flag size={12} />
        {priority.label}
      </span>
    </TaskChoice>
  )
}

export function TaskDue({
  task,
  disabled,
  onSave,
}: {
  task: Task
  disabled: boolean
  onSave: (due: string) => Promise<unknown>
}) {
  return (
    <Input
      key={task.due}
      type="date"
      max="9999-12-31"
      className="task-due"
      aria-label={`修改截止日期：${task.title}`}
      title="选择日期，按 Enter 或离开输入框保存；Esc 取消"
      defaultValue={dateInput(task.due)}
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.value = dateInput(task.due)
          event.currentTarget.blur()
        } else if (event.key === "Enter") event.currentTarget.blur()
      }}
      onBlur={async (event) => {
        const input = event.currentTarget
        if (
          !input.validity.valid ||
          (input.value && !/^\d{4}-\d{2}-\d{2}$/.test(input.value))
        ) {
          input.value = dateInput(task.due)
          return
        }
        if (input.value === dateInput(task.due)) return
        try {
          await onSave(input.value ? `${input.value} 00:00:00.000Z` : "")
        } catch {
          input.value = dateInput(task.due)
          // useActions reports server errors, including concurrent changes.
        }
      }}
    />
  )
}
