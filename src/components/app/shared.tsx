import { CheckCircle2, Circle, CircleDashed, LoaderCircle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { statuses, type Member, type Status } from "@/lib/types"
export const statusIcons = {
  todo: CircleDashed,
  progress: LoaderCircle,
  review: Circle,
  done: CheckCircle2,
}
export function StatusBadge({ status }: { status: Status }) {
  const Icon = statusIcons[status]
  return (
    <Badge
      variant="outline"
      className={`status status-${statuses.findIndex((s) => s.value === status)}`}
    >
      <Icon size={12} />
      {statuses.find((s) => s.value === status)?.label}
    </Badge>
  )
}
export function Person({ member }: { member?: Member }) {
  const n = member
    ? [...member.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 4
    : 0
  return (
    <Avatar
      className={`person ${["av-peach", "av-blue", "av-green", "av-purple"][n]}`}
      title={member?.name || "未分配"}
    >
      <AvatarFallback>{member?.name.slice(-1) || "—"}</AvatarFallback>
    </Avatar>
  )
}
export function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
