import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LoaderCircle, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useActions } from "@/hooks/use-workspace"
import {
  dateInput,
  priorities,
  statuses,
  type Member,
  type Project,
  type Status,
  type Task,
} from "@/lib/types"
import { FieldError } from "./AuthScreen"
const taskSchema = z.object({
  title: z.string().trim().min(1, "请输入任务名称").max(200),
  description: z.string().max(10000),
  project: z.string().min(1, "请选择项目"),
  status: z.enum(["todo", "progress", "review", "done"]),
  priority: z.enum(["high", "medium", "low"]),
  assignee: z.string(),
  due: z.string(),
  label: z.string().max(30, "标签最多 30 个字符"),
})
export function TaskDialog({
  task,
  projects,
  members,
  initialProject,
  initialStatus = "todo",
  close,
}: {
  task?: Task
  projects: Project[]
  members: Member[]
  initialProject?: string
  initialStatus?: Status
  close: () => void
}) {
  const actions = useActions()
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      project:
        task?.project ||
        initialProject ||
        projects.find((p) => !p.archived)?.id ||
        "",
      status: task?.status || initialStatus,
      priority: task?.priority || "medium",
      assignee: task?.assignee || "",
      due: dateInput(task?.due || ""),
      label: task?.label || "",
    },
  })
  const pending = actions.taskCreate.isPending || actions.taskUpdate.isPending
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
    >
      <DialogContent className="task-dialog">
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const data = {
              ...values,
              due: values.due ? `${values.due} 00:00:00.000Z` : "",
            }
            try {
              if (task)
                await actions.taskUpdate.mutateAsync({ task, patch: data })
              else await actions.taskCreate.mutateAsync(data)
              close()
            } catch {
              /* Mutation reports the error; keep the draft open. */
            }
          })}
        >
          <DialogHeader>
            <DialogTitle>
              {task ? "编辑任务" : "让一个好想法，开始发生。"}
            </DialogTitle>
            <DialogDescription>
              {task
                ? "补充信息，让下一步更加清晰。"
                : "明确目标、负责人和截止日期。"}
            </DialogDescription>
          </DialogHeader>
          <div className="form-fields">
            <div>
              <Label htmlFor="task-title">任务名称</Label>
              <Input
                id="task-title"
                autoFocus
                maxLength={200}
                placeholder="接下来，我们要完成什么？"
                {...form.register("title")}
              />
              <FieldError text={form.formState.errors.title?.message} />
            </div>
            <div>
              <Label htmlFor="task-description">描述</Label>
              <Textarea
                id="task-description"
                placeholder="背景、目标与交付内容…"
                {...form.register("description")}
              />
            </div>
            <div className="form-grid">
              <div>
                <Label>所属项目</Label>
                <Controller
                  control={form.control}
                  name="project"
                  render={({ field }) => (
                    <FormSelect
                      label="所属项目"
                      value={field.value}
                      onChange={field.onChange}
                      options={projects
                        .filter((p) => !p.archived || p.id === task?.project)
                        .map((p) => ({
                          value: p.id,
                          label: p.name + (p.archived ? "（已归档）" : ""),
                        }))}
                    />
                  )}
                />
                <FieldError text={form.formState.errors.project?.message} />
              </div>
              <div>
                <Label>负责人</Label>
                <Controller
                  control={form.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormSelect
                      label="负责人"
                      value={field.value || "none"}
                      onChange={(v) => field.onChange(v === "none" ? "" : v)}
                      options={[
                        { value: "none", label: "未分配" },
                        ...members
                          .filter((m) => m.active || m.id === task?.assignee)
                          .map((m) => ({
                            value: m.id,
                            label: m.name + (m.active ? "" : "（已停用）"),
                          })),
                      ]}
                    />
                  )}
                />
              </div>
              <div>
                <Label>状态</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormSelect
                      label="状态"
                      value={field.value}
                      onChange={field.onChange}
                      options={statuses}
                    />
                  )}
                />
              </div>
              <div>
                <Label>优先级</Label>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormSelect
                      label="优先级"
                      value={field.value}
                      onChange={field.onChange}
                      options={priorities}
                    />
                  )}
                />
              </div>
              <div>
                <Label htmlFor="task-due">截止日期</Label>
                <Input id="task-due" type="date" {...form.register("due")} />
              </div>
              <div>
                <Label htmlFor="task-label">标签</Label>
                <Input
                  id="task-label"
                  placeholder="例如：设计、开发"
                  {...form.register("label")}
                />
                <FieldError text={form.formState.errors.label?.message} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={close}
              disabled={pending}
            >
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : task ? (
                <Save size={14} />
              ) : (
                <Plus size={14} />
              )}{" "}
              {task ? "保存修改" : "创建任务"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
const projectSchema = z.object({
  name: z.string().trim().min(1, "请输入项目名称").max(100),
  description: z.string().max(3000),
  color: z.enum(["orange", "green", "blue", "purple"]),
})
export function ProjectDialog({
  project,
  close,
}: {
  project?: Project
  close: () => void
}) {
  const actions = useActions()
  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      color: project?.color || "orange",
    },
  })
  const pending =
    actions.projectCreate.isPending || actions.projectUpdate.isPending
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
    >
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            try {
              if (project)
                await actions.projectUpdate.mutateAsync({
                  project,
                  patch: values,
                })
              else await actions.projectCreate.mutateAsync(values)
              close()
            } catch {
              /* Keep values for correction. */
            }
          })}
        >
          <DialogHeader>
            <DialogTitle>{project ? "编辑项目" : "创建一个新项目"}</DialogTitle>
            <DialogDescription>把目标和相关任务放在一起。</DialogDescription>
          </DialogHeader>
          <div className="form-fields">
            <div>
              <Label htmlFor="project-name">项目名称</Label>
              <Input id="project-name" autoFocus {...form.register("name")} />
              <FieldError text={form.formState.errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="project-description">项目描述</Label>
              <Textarea
                id="project-description"
                {...form.register("description")}
              />
            </div>
            <div>
              <Label>项目颜色</Label>
              <Controller
                name="color"
                control={form.control}
                render={({ field }) => (
                  <FormSelect
                    label="项目颜色"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "orange", label: "暖橙" },
                      { value: "green", label: "苔绿" },
                      { value: "blue", label: "雾蓝" },
                      { value: "purple", label: "浅紫" },
                    ]}
                  />
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={pending}
            >
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle size={14} className="animate-spin" />}
              {project ? "保存项目" : "创建项目"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
const memberSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名").max(50),
  email: z.email("请输入有效邮箱"),
  password: z.string(),
  role: z.enum(["admin", "member"]),
})
export function MemberDialog({
  member,
  close,
}: {
  member?: Member
  close: () => void
}) {
  const actions = useActions()
  const form = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: member?.name || "",
      email: member?.email || "",
      password: "",
      role: member?.role || "member",
    },
  })
  const pending =
    actions.memberCreate.isPending || actions.memberUpdate.isPending
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
    >
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            if ((!member || values.password) && values.password.length < 12) {
              form.setError("password", { message: "密码至少 12 位" })
              return
            }
            try {
              if (member)
                await actions.memberUpdate.mutateAsync({
                  member,
                  patch: {
                    name: values.name,
                    role: values.role,
                    ...(values.password
                      ? {
                          password: values.password,
                          passwordConfirm: values.password,
                        }
                      : {}),
                  },
                })
              else await actions.memberCreate.mutateAsync(values)
              close()
            } catch {
              /* Keep values for correction. */
            }
          })}
        >
          <DialogHeader>
            <DialogTitle>
              {member ? "管理成员" : "添加工作空间成员"}
            </DialogTitle>
            <DialogDescription>
              所有启用成员都能协作管理工作空间内的项目和任务。
            </DialogDescription>
          </DialogHeader>
          <div className="form-fields">
            <div>
              <Label htmlFor="member-name">姓名</Label>
              <Input id="member-name" {...form.register("name")} />
              <FieldError text={form.formState.errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="member-email">登录邮箱</Label>
              <Input
                id="member-email"
                type="email"
                disabled={!!member}
                autoComplete="off"
                {...form.register("email")}
              />
              <FieldError text={form.formState.errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="member-password">
                {member ? "新密码（留空保持不变）" : "初始密码"}
              </Label>
              <Input
                id="member-password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              <FieldError text={form.formState.errors.password?.message} />
            </div>
            <div>
              <Label>角色</Label>
              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <FormSelect
                    label="角色"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "member", label: "普通成员" },
                      { value: "admin", label: "管理员" },
                    ]}
                  />
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={close}
              disabled={pending}
            >
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle size={14} className="animate-spin" />}
              {member ? "保存成员" : "添加成员"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export function FormSelect({
  value,
  onChange,
  options,
  label,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label: string
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
