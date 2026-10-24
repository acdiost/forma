import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Check,
  CheckCircle2,
  Circle,
  Ellipsis,
  GripVertical,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TaskProgress } from "./TaskProgress"
import { TaskChoice, TaskDue, TaskPriority } from "./TaskQuickFields"
import { useActions } from "@/hooks/use-workspace"
import { useUI } from "@/store"
import {
  displayDate,
  isOverdue,
  statuses,
  type Member,
  type Project,
  type Status,
  type Task,
} from "@/lib/types"
import {
  EmptyState,
  IconButton,
  Person,
  StatusBadge,
  statusIcons,
} from "@/components/app/shared"
type Props = {
  tasks: Task[]
  projects: Project[]
  members: Member[]
  onCreate: (status?: Status) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  trash: boolean
}
export function TaskViews(props: Props) {
  const { tasks, members, view, set } = { ...props, ...useUI() }
  const actions = useActions()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const activeTask = tasks.find((t) => t.id === activeId)
  if (!tasks.length)
    return (
      <EmptyState
        title={props.trash ? "回收站是空的" : "这里还没有任务"}
        description={
          props.trash
            ? "移入回收站的任务可在这里恢复。"
            : "创建新任务，或调整搜索和筛选条件。"
        }
        icon={<Search size={27} />}
        action={
          !props.trash && (
            <Button variant="outline" onClick={() => props.onCreate()}>
              <Plus size={14} />
              创建任务
            </Button>
          )
        }
      />
    )
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={
        view === "board" && !props.trash
          ? (args) => {
              const candidates = {
                ...args,
                droppableContainers: args.droppableContainers.filter((c) =>
                  statuses.some((s) => s.value === c.id)
                ),
              }
              const pointer = pointerWithin(candidates)
              return pointer.length ? pointer : closestCenter(candidates)
            }
          : closestCorners
      }
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={(e) => {
        setActiveId(null)
        const task = tasks.find((t) => t.id === e.active.id)
        if (!task || !e.over || task.deleted_at) return
        const target = String(e.over.id)
        if (view === "board") {
          if (
            statuses.some((s) => s.value === target) &&
            task.status !== target
          )
            actions.taskUpdate.mutate({
              task,
              patch: { status: target as Status },
            })
        } else {
          const from = tasks.findIndex((t) => t.id === task.id),
            to = tasks.findIndex((t) => t.id === target)
          if (to < 0 || from === to) return
          const reordered = arrayMove(tasks, from, to),
            before = reordered[to - 1],
            after = reordered[to + 1]
          const position =
            before && after
              ? (before.position + after.position) / 2
              : before
                ? before.position + 1024
                : after
                  ? after.position - 1024
                  : 0
          actions.taskUpdate.mutate({ task, patch: { position } })
        }
      }}
    >
      {view === "list" || props.trash ? (
        <div className="task-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="grip-cell" />
                <TableHead>任务名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>截止日期</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    {...props}
                    task={task}
                    pending={actions.taskUpdate.isPending}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
          {!props.trash && (
            <Button
              className="add-table-row"
              variant="ghost"
              onClick={() => props.onCreate()}
            >
              <Plus size={14} />
              新建任务
            </Button>
          )}
        </div>
      ) : (
        <div className="board">
          {statuses.map((status) => (
            <BoardColumn
              key={status.value}
              status={status.value}
              tasks={tasks.filter((t) => t.status === status.value)}
              {...{ members }}
              pending={actions.taskUpdate.isPending}
              onCreate={props.onCreate}
              onOpen={(task) => set({ selected: task.id, showDetails: true })}
            />
          ))}
        </div>
      )}
      <DragOverlay>
        {activeTask && view === "board" && (
          <Card className="board-card drag-overlay">
            <CardContent>
              <span className="board-card-top">{activeTask.id}</span>
              <p className="board-title">{activeTask.title}</p>
              <Person
                member={members.find((m) => m.id === activeTask.assignee)}
              />
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
}
function TaskRow({
  task,
  pending,
  ...props
}: Props & { task: Task; pending: boolean }) {
  const actions = useActions()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: props.trash || pending || actions.taskUpdate.isPending,
  })
  const set = useUI((s) => s.set)
  const saving = pending || actions.taskUpdate.isPending
  const assignee = props.members.find((m) => m.id === task.assignee)
  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="task-row"
    >
      <TableCell className="grip-cell">
        {!props.trash && (
          <Button
            variant="ghost"
            size="icon"
            className="grip"
            aria-label={`拖动任务 ${task.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </Button>
        )}
      </TableCell>
      <TableCell>
        <div className="task-name-cell">
          {!props.trash && (
            <Button
              variant="ghost"
              size="icon"
              className="task-complete"
              aria-label={`${task.status === "done" ? "重新打开" : "完成"}：${task.title}`}
              aria-pressed={task.status === "done"}
              disabled={saving}
              onClick={() =>
                actions.taskUpdate.mutate({
                  task,
                  patch: { status: task.status === "done" ? "todo" : "done" },
                })
              }
            >
              {task.status === "done" ? (
                <CheckCircle2 size={16} />
              ) : (
                <Circle size={16} />
              )}
            </Button>
          )}
          <div className="task-title">
            <Button
              variant="link"
              onClick={() => set({ selected: task.id, showDetails: true })}
            >
              {task.title}
            </Button>
            <span>
              {task.id.slice(0, 7).toUpperCase()} <i>·</i>{" "}
              {props.projects.find((p) => p.id === task.project)?.name ||
                "项目"}
              {task.label && ` · ${task.label}`}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {props.trash ? (
          <StatusBadge status={task.status} />
        ) : (
          <TaskChoice
            label={`修改状态：${task.title}`}
            value={task.status}
            options={statuses}
            disabled={saving}
            onChange={(status) =>
              actions.taskUpdate.mutate({
                task,
                patch: { status: status as Status },
              })
            }
          >
            <StatusBadge status={task.status} />
          </TaskChoice>
        )}
      </TableCell>
      <TableCell>
        <TaskProgress
          task={task}
          disabled={saving}
          readOnly={props.trash}
          onSave={(progress) =>
            actions.taskUpdate.mutateAsync({ task, patch: { progress } })
          }
        />
      </TableCell>
      <TableCell>
        <TaskPriority
          task={task}
          disabled={props.trash || saving}
          onChange={(priority) =>
            actions.taskUpdate.mutate({ task, patch: { priority } })
          }
        />
      </TableCell>
      <TableCell>
        {props.trash ? (
          <Person member={assignee} />
        ) : (
          <TaskChoice
            label={`修改负责人：${task.title}`}
            value={task.assignee || "none"}
            options={[
              { value: "none", label: "未分配" },
              ...props.members
                .filter((m) => m.active || m.id === task.assignee)
                .map((m) => ({
                  value: m.id,
                  label: m.name + (m.active ? "" : "（已停用）"),
                })),
            ]}
            disabled={saving}
            onChange={(value) =>
              actions.taskUpdate.mutate({
                task,
                patch: { assignee: value === "none" ? "" : value },
              })
            }
          >
            <Person member={assignee} />
          </TaskChoice>
        )}
      </TableCell>
      <TableCell className={`due-cell ${isOverdue(task) ? "overdue" : ""}`}>
        {props.trash ? (
          displayDate(task.due)
        ) : (
          <TaskDue
            task={task}
            disabled={saving}
            onSave={(due) =>
              actions.taskUpdate.mutateAsync({ task, patch: { due } })
            }
          />
        )}
      </TableCell>
      <TableCell>
        {props.trash ? (
          <IconButton
            label={`恢复 ${task.title}`}
            disabled={actions.taskUpdate.isPending}
            onClick={() =>
              actions.taskUpdate.mutate(
                { task, patch: { deleted_at: "" } },
                { onSuccess: () => toast.success("任务已恢复") }
              )
            }
          >
            <RotateCcw size={14} />
          </IconButton>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="more"
                disabled={saving}
                aria-label={`${task.title}操作`}
              >
                <Ellipsis size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => props.onEdit(task)}>
                编辑任务
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  actions.taskUpdate.mutate({
                    task,
                    patch: { status: task.status === "done" ? "todo" : "done" },
                  })
                }
              >
                <Check size={14} />
                {task.status === "done" ? "重新打开" : "标记完成"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => props.onDelete(task)}
              >
                <Trash2 size={14} />
                移入回收站
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}
function BoardColumn({
  status,
  tasks,
  members,
  pending,
  onCreate,
  onOpen,
}: {
  status: Status
  tasks: Task[]
  members: Member[]
  pending: boolean
  onCreate: (status: Status) => void
  onOpen: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const Icon = statusIcons[status]
  return (
    <section
      ref={setNodeRef}
      className={`board-column ${isOver ? "over" : ""}`}
    >
      <header>
        <div>
          <Icon size={14} />
          {statuses.find((s) => s.value === status)?.label}
          <span>{tasks.length}</span>
        </div>
        <IconButton
          label={`在${statuses.find((s) => s.value === status)?.label}中添加任务`}
          onClick={() => onCreate(status)}
        >
          <Plus size={14} />
        </IconButton>
      </header>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <BoardCard
            key={task.id}
            task={task}
            member={members.find((m) => m.id === task.assignee)}
            pending={pending}
            open={() => onOpen(task)}
          />
        ))}
      </SortableContext>
      <Button
        variant="ghost"
        className="board-add"
        onClick={() => onCreate(status)}
      >
        <Plus size={14} />
        添加任务
      </Button>
    </section>
  )
}
function BoardCard({
  task,
  member,
  pending,
  open,
}: {
  task: Task
  member?: Member
  pending: boolean
  open: () => void
}) {
  const actions = useActions()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: pending || actions.taskUpdate.isPending,
  })
  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
      }}
      className="board-card"
    >
      <CardContent>
        <div className="board-card-top">
          <span>{task.id.slice(0, 7).toUpperCase()}</span>
          <TaskPriority
            task={task}
            disabled={pending || actions.taskUpdate.isPending}
            onChange={(priority) =>
              actions.taskUpdate.mutate({ task, patch: { priority } })
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="grip"
            aria-label={`拖动任务 ${task.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </Button>
        </div>
        <Button className="board-title" variant="link" onClick={open}>
          {task.title}
        </Button>
        <p className={isOverdue(task) ? "overdue" : ""}>
          {displayDate(task.due)}
        </p>
        <TaskProgress
          task={task}
          disabled={pending || actions.taskUpdate.isPending}
          onSave={(progress) =>
            actions.taskUpdate.mutateAsync({ task, patch: { progress } })
          }
        />
        <div className="board-bottom">
          {task.label ? (
            <Badge variant="secondary">{task.label}</Badge>
          ) : (
            <span />
          )}
          <Person member={member} />
        </div>
      </CardContent>
    </Card>
  )
}
