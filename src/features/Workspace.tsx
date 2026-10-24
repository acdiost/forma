import { useEffect, useState } from "react"
import { useIsMutating } from "@tanstack/react-query"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCheck,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  List,
  LoaderCircle,
  LogOut,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { useActions, useWorkspace } from "@/hooks/use-workspace"
import { useAuth } from "@/lib/auth"
import { errorMessage } from "@/lib/api"
import {
  colors,
  dateInput,
  isOverdue,
  priorities,
  statuses,
  today,
  type Member,
  type Project,
  type Status,
  type Task,
} from "@/lib/types"
import { fontSizes, useUI } from "@/store"
import { EmptyState, IconButton, Person } from "@/components/app/shared"
import { PasswordForm } from "@/features/PasswordForm"
import { Dashboard, ActivityFeed } from "@/features/Dashboard"
import {
  TaskDialog,
  ProjectDialog,
  MemberDialog,
  FormSelect,
} from "@/features/Forms"
import { TaskViews } from "@/features/TaskViews"
import { TaskDetail } from "@/features/TaskDetail"

const nav = [
  { id: "overview", label: "工作概览", icon: LayoutDashboard },
  { id: "projects", label: "项目空间", icon: FolderKanban },
  { id: "tasks", label: "我的任务", icon: CheckCheck },
  { id: "team", label: "团队成员", icon: Users },
  { id: "trash", label: "回收站", icon: Trash2 },
]
export default function Workspace() {
  const { user, logout } = useAuth()
  const ui = useUI(),
    { page, view, query, filter, selected, showDetails, dark, fontSize, set } =
      ui
  const workspace = useWorkspace(),
    actions = useActions(),
    isMobile = useIsMobile(),
    mutating = useIsMutating()
  const { tasks, projects, members, activities } = workspace
  const [taskForm, setTaskForm] = useState<{
    task?: Task
    status?: Status
  } | null>(null)
  const [projectForm, setProjectForm] = useState<{ project?: Project } | null>(
    null
  )
  const [memberForm, setMemberForm] = useState<{ member?: Member } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [showArchived, setShowArchived] = useState(false)
  const [confirm, setConfirm] = useState<{
      title: string
      description: string
      run: () => Promise<void>
    } | null>(null),
    [confirming, setConfirming] = useState(false)
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [])
  const currentUser = members.find((m) => m.id === user?.id) || user!
  const liveTasks = tasks.filter((t) => !t.deleted_at)
  const active = tasks.find((t) => t.id === selected)
  const activeProjects = projects.filter((p) => !p.archived)
  const navigate = (id: string) =>
    set({ page: id, project: "all", filter: "all", query: "", selected: null })
  const openProject = (id: string) =>
    set({
      page: "overview",
      project: id,
      filter: "all",
      query: "",
      selected: null,
    })
  const newTask = (status: Status = "todo") => {
    if (!activeProjects.length) {
      toast.info("先创建一个项目，再添加任务。")
      setProjectForm({})
      return
    }
    setTaskForm({ status })
  }
  const removeTask = (task: Task) => {
    actions.taskUpdate.mutate(
      { task, patch: { deleted_at: new Date().toISOString() } },
      {
        onSuccess: (deleted) => {
          if (useUI.getState().selected === task.id) set({ selected: null })
          toast.success("任务已移入回收站", {
            description: task.title,
            duration: 8000,
            action: {
              label: "撤销",
              onClick: () => {
                actions.taskUpdate.mutate(
                  { task: deleted, patch: { deleted_at: "" } },
                  {
                    onSuccess: () => toast.success("任务已恢复"),
                  }
                )
              },
            },
          })
        },
      }
    )
  }
  const filtered = tasks.filter((task) => {
    if (page === "trash" ? !task.deleted_at : !!task.deleted_at) return false
    if (page === "tasks" && task.assignee !== user?.id) return false
    if (ui.project !== "all" && task.project !== ui.project) return false
    if (
      filter === "overdue"
        ? !isOverdue(task)
        : filter === "today"
          ? dateInput(task.due) !== today()
          : filter !== "all" && task.status !== filter
    )
      return false
    const projectName = projects.find((p) => p.id === task.project)?.name || ""
    return (
      !query ||
      `${task.title} ${task.id} ${projectName} ${task.label}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
  })
  const exportTasks = () => {
    const cell = (v: string) =>
      `"${(/^[=+@-]/.test(v) ? "'" + v : v).replaceAll('"', '""')}"`
    const rows = [
      [
        "任务编号",
        "任务名称",
        "项目",
        "状态",
        "优先级",
        "负责人",
        "截止日期",
        "标签",
      ],
      ...filtered.map((t) => [
        t.id,
        t.title,
        projects.find((p) => p.id === t.project)?.name || "",
        statuses.find((s) => s.value === t.status)?.label || "",
        priorities.find((p) => p.value === t.priority)?.label || "",
        members.find((m) => m.id === t.assignee)?.name || "",
        dateInput(t.due),
        t.label,
      ]),
    ]
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" }
      )
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `Forma-任务-${today()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${filtered.length} 个任务`)
  }
  const detail = active ? (
    <TaskDetail
      key={active.id}
      task={active}
      members={members}
      projects={projects}
      onEdit={() => setTaskForm({ task: active })}
      onDelete={() => removeTask(active)}
      onClose={() => set({ selected: null })}
    />
  ) : (
    <ActivityFeed
      activities={activities}
      members={members}
      onOpen={(id) => set({ selected: id, showDetails: true })}
    />
  )
  return (
    <>
      <SidebarProvider
        defaultOpen
        style={{ "--sidebar-width": "220px" } as React.CSSProperties}
      >
        <Sidebar className="app-sidebar">
          <SidebarHeader>
            <div className="workspace-switch">
              <span className="brand-mark">
                <Layers size={20} />
              </span>
              <span>
                <strong>Forma</strong>
                <small>团队工作空间</small>
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <div className="sidebar-search">
              <Button variant="outline" onClick={() => setSearchOpen(true)}>
                <Search size={14} />
                <span>搜索工作空间</span>
                <kbd>⌘ K</kbd>
              </Button>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel>工作空间</SidebarGroupLabel>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={page === item.id}
                      onClick={() => navigate(item.id)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      {item.id === "tasks" && (
                        <span className="nav-count">
                          {
                            liveTasks.filter(
                              (t) =>
                                t.assignee === user?.id && t.status !== "done"
                            ).length
                          }
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>
                我的项目
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="创建项目"
                  onClick={() => setProjectForm({})}
                >
                  <Plus size={13} />
                </Button>
              </SidebarGroupLabel>
              <SidebarMenu>
                {activeProjects.slice(0, 6).map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      onClick={() => openProject(project.id)}
                      isActive={ui.project === project.id}
                    >
                      <span
                        className="project-dot"
                        style={{ background: colors[project.color] }}
                      />
                      <span>{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
              {!activeProjects.length && (
                <p className="sidebar-empty">尚无项目，从一个目标开始。</p>
              )}
            </SidebarGroup>
            <div className="sidebar-bottom-card">
              <span>
                <Sparkles size={15} />
                为创意留出更多空间
              </span>
              <p>
                把目标拆成清晰的下一步。
                <br />
                让每一份投入，都留下进展。
              </p>
              <Button variant="outline" size="sm" onClick={() => newTask()}>
                创建一个任务
                <ArrowRight size={13} />
              </Button>
            </div>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setSettingsOpen(true)}>
                  <Settings2 />
                  <span>设置与偏好</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() =>
                    toast.info(
                      "⌘K / Ctrl+K 搜索；列表可直接修改状态、优先级、负责人和日期；点击圆圈完成任务；日期按 Enter 或离开后保存、Esc 取消；拖动手柄排序，看板支持跨列移动。"
                    )
                  }
                >
                  <CircleHelp />
                  <span>帮助与快捷操作</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="sidebar-profile">
              <Person member={currentUser} />
              <div>
                <strong>{currentUser.name}</strong>
                <span>
                  {currentUser.role === "admin"
                    ? "工作空间管理员"
                    : "工作空间成员"}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="个人菜单">
                    <ChevronsUpDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings2 size={14} />
                    偏好设置
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut size={14} />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="topbar">
            <div>
              <SidebarTrigger />
              <span className="topbar-divider" />
              <span>工作空间</span>
              <ChevronRight size={13} />
              <strong>
                {nav.find((n) => n.id === page)?.label || "工作概览"}
              </strong>
            </div>
            <div>
              <span className="sync-label">
                <span />
                {mutating
                  ? "正在保存…"
                  : workspace.error
                    ? "连接异常"
                    : workspace.refreshing
                      ? "正在同步…"
                      : "已连接工作空间"}
              </span>
              <IconButton
                label="刷新数据"
                onClick={() => void workspace.refresh()}
              >
                <RefreshCw
                  size={15}
                  className={workspace.refreshing ? "animate-spin" : ""}
                />
              </IconButton>
              <IconButton label="切换主题" onClick={() => set({ dark: !dark })}>
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </IconButton>
              <Person member={currentUser} />
            </div>
          </header>
          <main className="main">
            <div className="page-heading">
              <div>
                <div className="eyebrow">YOUR SPACE TO MAKE THINGS HAPPEN</div>
                <h1>
                  {page === "overview"
                    ? "每一份进展，都值得看见。"
                    : nav.find((n) => n.id === page)?.label}
                  <Sparkles className="heading-dot" size={23} strokeWidth={1} />
                </h1>
                <p>
                  {page === "overview"
                    ? `你好，${currentUser.name}。这里是团队当前的工作动态。`
                    : page === "trash"
                      ? "让删除有余地，重要的任务随时可以找回。"
                      : "让协作更有条理，让创意持续发生。"}
                  <span className="heading-date">
                    {new Date().toLocaleDateString("zh-CN", {
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </span>
                </p>
              </div>
              <div className="heading-actions">
                {page === "projects" ? (
                  <Button onClick={() => setProjectForm({})}>
                    <Plus size={15} />
                    新建项目
                  </Button>
                ) : page === "team" ? (
                  currentUser.role === "admin" && (
                    <Button onClick={() => setMemberForm({})}>
                      <Plus size={15} />
                      添加成员
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={exportTasks}
                      disabled={!filtered.length}
                    >
                      <ArrowDownToLine size={14} />
                      导出
                    </Button>
                    {page !== "trash" && (
                      <Button onClick={() => newTask()}>
                        <Plus size={15} />
                        新建任务
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            {workspace.error && (
              <div role="alert" className="connection-error">
                <p>{errorMessage(workspace.error)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void workspace.refresh()}
                >
                  重新连接
                </Button>
              </div>
            )}
            {workspace.loading ? (
              <div className="startup inline-startup">
                <LoaderCircle className="animate-spin" size={20} />
                <p>正在加载工作空间…</p>
              </div>
            ) : (
              <>
                {page === "overview" && (
                  <Dashboard
                    tasks={liveTasks}
                    projects={projects}
                    onProject={openProject}
                    onCreateProject={() => setProjectForm({})}
                  />
                )}
                {page === "projects" ? (
                  <>
                    <div className="projects-toolbar">
                      <span>
                        {
                          projects.filter((p) => p.archived === showArchived)
                            .length
                        }{" "}
                        个{showArchived ? "已归档" : "进行中"}项目
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowArchived((v) => !v)}
                      >
                        {showArchived ? "查看进行中项目" : "查看已归档项目"}
                      </Button>
                    </div>
                    <div className="projects-grid">
                      {projects
                        .filter((p) => p.archived === showArchived)
                        .map((project) => {
                          const related = liveTasks.filter(
                            (t) => t.project === project.id
                          )
                          const progress = related.length
                            ? Math.round(
                                (related.filter((t) => t.status === "done")
                                  .length /
                                  related.length) *
                                  100
                              )
                            : 0
                          return (
                            <Card key={project.id} className="project-card">
                              <CardContent>
                                <div
                                  className="project-card-icon"
                                  style={{
                                    background: colors[project.color] + "20",
                                    color: colors[project.color],
                                  }}
                                >
                                  <Layers size={25} />
                                </div>
                                <Badge variant="outline">
                                  {project.archived ? "已归档" : "进行中"}
                                </Badge>
                                <h2>{project.name}</h2>
                                <p>
                                  {project.description ||
                                    "为这个项目添加清晰的目标与背景。"}
                                </p>
                                <div className="focus-progress">
                                  <span>
                                    {related.length} 个任务 ·{" "}
                                    {
                                      related.filter((t) => t.status === "done")
                                        .length
                                    }{" "}
                                    项完成
                                  </span>
                                  <strong>{progress}%</strong>
                                </div>
                                <Progress value={progress} />
                                <footer>
                                  <div className="project-actions">
                                    <IconButton
                                      label={`编辑项目 ${project.name}`}
                                      onClick={() =>
                                        setProjectForm({ project })
                                      }
                                    >
                                      <Pencil size={14} />
                                    </IconButton>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setConfirm({
                                          title: project.archived
                                            ? "恢复此项目？"
                                            : "归档此项目？",
                                          description: project.archived
                                            ? "项目将重新出现在进行中的项目列表。"
                                            : "已有任务将保留，项目将停止接收新任务。",
                                          run: async () => {
                                            await actions.projectUpdate.mutateAsync(
                                              {
                                                project,
                                                patch: {
                                                  archived: !project.archived,
                                                },
                                              }
                                            )
                                          },
                                        })
                                      }
                                    >
                                      {project.archived ? (
                                        <RotateCcw size={13} />
                                      ) : (
                                        <FolderKanban size={13} />
                                      )}{" "}
                                      {project.archived ? "恢复" : "归档"}
                                    </Button>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openProject(project.id)}
                                  >
                                    查看任务
                                    <ArrowRight size={14} />
                                  </Button>
                                </footer>
                              </CardContent>
                            </Card>
                          )
                        })}
                    </div>
                    {!projects.filter((p) => p.archived === showArchived)
                      .length && (
                      <EmptyState
                        title={
                          showArchived ? "尚无归档项目" : "建立你的第一个项目"
                        }
                        description="用项目组织目标，再将目标拆解为可执行的任务。"
                        icon={<FolderKanban size={30} />}
                        action={
                          !showArchived && (
                            <Button onClick={() => setProjectForm({})}>
                              <Plus size={14} />
                              创建项目
                            </Button>
                          )
                        }
                      />
                    )}
                  </>
                ) : page === "team" ? (
                  <Card>
                    <CardContent className="team-content">
                      <div className="section-heading">
                        <div>
                          <h2>一起，让好事发生</h2>
                          <p>
                            {members.filter((m) => m.active).length} 位启用成员
                            · 共 {members.length} 位成员
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {currentUser.role === "admin"
                            ? "管理员视图"
                            : "成员视图"}
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>成员</TableHead>
                            <TableHead>角色</TableHead>
                            <TableHead>未完成任务</TableHead>
                            <TableHead>状态</TableHead>
                            {currentUser.role === "admin" && (
                              <TableHead>操作</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="member">
                                  <Person member={member} />
                                  <strong>{member.name}</strong>
                                  <span>{member.email}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {member.role === "admin"
                                  ? "管理员"
                                  : "普通成员"}
                              </TableCell>
                              <TableCell>
                                {
                                  liveTasks.filter(
                                    (t) =>
                                      t.assignee === member.id &&
                                      t.status !== "done"
                                  ).length
                                }{" "}
                                项
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={member.active ? "online" : ""}
                                >
                                  {member.active ? "已启用" : "已停用"}
                                </Badge>
                              </TableCell>
                              {currentUser.role === "admin" && (
                                <TableCell>
                                  <div className="member-actions">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setMemberForm({ member })}
                                    >
                                      管理
                                    </Button>
                                    {member.id !== currentUser.id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setConfirm({
                                            title: `${member.active ? "停用" : "启用"}成员 ${member.name}？`,
                                            description: member.active
                                              ? "成员将无法继续访问工作空间，历史任务和评论会保留。"
                                              : "成员将重新获得工作空间访问权限。",
                                            run: async () => {
                                              await actions.memberUpdate.mutateAsync(
                                                {
                                                  member,
                                                  patch: {
                                                    active: !member.active,
                                                  },
                                                }
                                              )
                                            },
                                          })
                                        }
                                      >
                                        {member.active ? "停用" : "启用"}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <section className="work-section">
                    <div className="work-section-header">
                      <div>
                        <h2>
                          {page === "tasks"
                            ? "分配给我的任务"
                            : page === "trash"
                              ? "可恢复的任务"
                              : ui.project !== "all"
                                ? projects.find((p) => p.id === ui.project)
                                    ?.name
                                : "团队任务"}
                          <Badge variant="secondary">{filtered.length}</Badge>
                        </h2>
                        <p>
                          {page === "trash"
                            ? "恢复任务后，它会回到原来的项目与状态。"
                            : "每一个清晰的任务，都是前进的开始。"}
                        </p>
                      </div>
                      <div className="work-controls">
                        {page !== "trash" && (
                          <Tabs
                            value={view}
                            onValueChange={(value) => set({ view: value })}
                          >
                            <TabsList>
                              <TabsTrigger value="list">
                                <List size={14} />
                                列表
                              </TabsTrigger>
                              <TabsTrigger value="board">
                                <LayoutGrid size={14} />
                                看板
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        )}
                        {!isMobile && (
                          <IconButton
                            label={
                              showDetails ? "收起侧边面板" : "展开侧边面板"
                            }
                            onClick={() => set({ showDetails: !showDetails })}
                          >
                            {showDetails ? (
                              <PanelRightClose size={17} />
                            ) : (
                              <PanelRightOpen size={17} />
                            )}
                          </IconButton>
                        )}
                      </div>
                    </div>
                    <div className="workspace-frame">
                      <ResizablePanelGroup orientation="horizontal">
                        <ResizablePanel
                          defaultSize={
                            showDetails && !isMobile ? "76%" : "100%"
                          }
                          minSize="40%"
                        >
                          <div className="task-toolbar">
                            <div className="task-search">
                              <Search size={14} />
                              <Input
                                aria-label="搜索任务"
                                placeholder="搜索任务…"
                                value={query}
                                onChange={(e) => set({ query: e.target.value })}
                              />
                              {query && (
                                <IconButton
                                  label="清空搜索"
                                  onClick={() => set({ query: "" })}
                                >
                                  <X size={12} />
                                </IconButton>
                              )}
                            </div>
                            <div className="toolbar-filter">
                              <SlidersHorizontal size={13} />
                              <FormSelect
                                label="筛选任务状态"
                                value={filter}
                                onChange={(value) => set({ filter: value })}
                                options={[
                                  { value: "all", label: "全部状态" },
                                  { value: "today", label: "今天到期" },
                                  { value: "overdue", label: "已逾期" },
                                  ...statuses,
                                ]}
                              />
                            </div>
                            <div className="project-filter">
                              <FormSelect
                                label="筛选项目"
                                value={ui.project}
                                onChange={(value) => set({ project: value })}
                                options={[
                                  { value: "all", label: "全部项目" },
                                  ...projects.map((p) => ({
                                    value: p.id,
                                    label:
                                      p.name + (p.archived ? "（归档）" : ""),
                                  })),
                                ]}
                              />
                            </div>
                            <span className="toolbar-spacer" />
                            {page !== "trash" && (
                              <IconButton
                                label="添加任务"
                                onClick={() => newTask()}
                              >
                                <Plus size={16} />
                              </IconButton>
                            )}
                          </div>
                          <TaskViews
                            tasks={filtered}
                            projects={projects}
                            members={members}
                            onCreate={newTask}
                            onEdit={(task) => setTaskForm({ task })}
                            onDelete={removeTask}
                            trash={page === "trash"}
                          />
                          <div className="table-footer">
                            <span>
                              {page === "trash"
                                ? "数据保留在服务器，可随时恢复"
                                : view === "board"
                                  ? "直接修改优先级 · 拖动手柄跨列更改状态"
                                  : "点击字段直接修改 · 圆圈完成 · 手柄排序"}
                            </span>
                            <span>共 {filtered.length} 项</span>
                          </div>
                        </ResizablePanel>
                        {showDetails && !isMobile && (
                          <>
                            <ResizableHandle withHandle />
                            <ResizablePanel
                              defaultSize="24%"
                              minSize="240px"
                              maxSize="45%"
                            >
                              <AnimatePresence mode="wait">
                                <motion.aside
                                  className="detail-panel"
                                  key={active?.id || "activity"}
                                  initial={{ opacity: 0, x: 6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  {detail}
                                </motion.aside>
                              </AnimatePresence>
                            </ResizablePanel>
                          </>
                        )}
                      </ResizablePanelGroup>
                    </div>
                  </section>
                )}
              </>
            )}
            <footer className="page-footer">
              <span>
                <Layers size={13} />
                Forma Workspace <span>v0.0.1</span>
              </span>
              <span>专注于创造，余下的交给协作。</span>
            </footer>
          </main>
        </SidebarInset>
      </SidebarProvider>
      {taskForm && (
        <TaskDialog
          key={taskForm.task?.id || "new-task"}
          task={taskForm.task}
          projects={projects}
          members={members}
          initialProject={ui.project !== "all" ? ui.project : undefined}
          initialStatus={taskForm.status}
          close={() => setTaskForm(null)}
        />
      )}
      {projectForm && (
        <ProjectDialog
          project={projectForm.project}
          close={() => setProjectForm(null)}
        />
      )}
      {memberForm && (
        <MemberDialog
          member={memberForm.member}
          close={() => setMemberForm(null)}
        />
      )}
      <Sheet
        open={isMobile && !!active}
        onOpenChange={(open) => {
          if (!open) set({ selected: null })
        }}
      >
        <SheetContent className="mobile-detail-sheet" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>任务详情</SheetTitle>
            <SheetDescription>
              查看并更新任务状态、负责人和讨论。
            </SheetDescription>
          </SheetHeader>
          {detail}
        </SheetContent>
      </Sheet>
      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="搜索工作空间"
        description="搜索任务或跳转页面，使用方向键选择，按 Enter 打开。"
      >
        <CommandInput
          aria-label="搜索工作空间"
          placeholder="搜索任务或跳转页面…"
        />
        <CommandList>
          <CommandEmpty>没有找到相关结果。</CommandEmpty>
          <CommandGroup heading="页面">
            {nav.map((item) => (
              <CommandItem
                key={item.id}
                value={`page:${item.id}`}
                keywords={[item.label]}
                onSelect={() => {
                  navigate(item.id)
                  setSearchOpen(false)
                }}
              >
                <item.icon size={16} />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="任务">
            {liveTasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task:${task.id}`}
                keywords={[
                  task.title,
                  task.id,
                  task.label,
                  projects.find((p) => p.id === task.project)?.name || "",
                ]}
                onSelect={() => {
                  set({
                    page: "overview",
                    selected: task.id,
                    showDetails: true,
                    query: "",
                    filter: "all",
                    project: "all",
                  })
                  setSearchOpen(false)
                  requestAnimationFrame(() =>
                    document
                      .querySelector(".work-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  )
                }}
              >
                {task.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>工作空间偏好</DialogTitle>
            <DialogDescription>
              调整显示方式，找到适合自己的工作节奏。
            </DialogDescription>
          </DialogHeader>
          <div className="setting-row">
            <div>
              <Label htmlFor="dark-mode">深色模式</Label>
              <p>切换工作空间的外观主题</p>
            </div>
            <Switch
              id="dark-mode"
              checked={dark}
              onCheckedChange={(value) => set({ dark: value })}
            />
          </div>
          <div className="setting-row font-setting">
            <div>
              <Label>字体大小</Label>
              <p>立即应用到整个界面，并保存在当前浏览器</p>
            </div>
            <FormSelect
              label="字体大小"
              value={fontSize}
              options={fontSizes}
              onChange={(value) => set({ fontSize: value })}
            />
          </div>
          <div className="setting-row">
            <div>
              <Label htmlFor="side-details">侧边详情面板</Label>
              <p>显示任务详情与真实工作动态</p>
            </div>
            <Switch
              id="side-details"
              checked={showDetails}
              onCheckedChange={(value) => set({ showDetails: value })}
            />
          </div>
          <PasswordForm member={currentUser} />
          <div className="account-info">
            <p>当前账号：{currentUser.email}</p>
            <p>
              角色：{currentUser.role === "admin" ? "管理员" : "成员"} · Forma
              v0.0.1
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={logout}>
              <LogOut size={14} />
              退出登录
            </Button>
            <Button onClick={() => setSettingsOpen(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !confirming) setConfirm(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={confirming}
              onClick={() => setConfirm(null)}
            >
              取消
            </Button>
            <Button
              disabled={confirming}
              onClick={async () => {
                if (!confirm) return
                setConfirming(true)
                try {
                  await confirm.run()
                  setConfirm(null)
                } catch {
                  /* Keep the dialog open; mutation reports the error. */
                } finally {
                  setConfirming(false)
                }
              }}
            >
              {confirming && (
                <LoaderCircle size={14} className="animate-spin" />
              )}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
