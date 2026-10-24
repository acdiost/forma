import { motion } from "motion/react"
import {
  Activity as ActivityIcon,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Layers,
  Target,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { EmptyState, Person } from "@/components/app/shared"
import {
  colors,
  isOverdue,
  type Activity,
  type Member,
  type Project,
  type Task,
} from "@/lib/types"
export function Dashboard({
  tasks,
  projects,
  onProject,
  onCreateProject,
}: {
  tasks: Task[]
  projects: Project[]
  onProject: (id: string) => void
  onCreateProject: () => void
}) {
  const done = tasks.filter((t) => t.status === "done").length
  const currentProject = projects.find((p) => !p.archived)
  const projectTasks = tasks.filter((t) => t.project === currentProject?.id)
  const progress = projectTasks.length
    ? Math.round(
        (projectTasks.filter((t) => t.status === "done").length /
          projectTasks.length) *
          100
      )
    : 0
  const chart = Array.from({ length: 7 }, (_, i) => {
    const day = new Date()
    day.setDate(day.getDate() - 6 + i)
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
    return {
      date: `${day.getMonth() + 1}/${day.getDate()}`,
      done: tasks.filter(
        (t) =>
          t.completed_at &&
          (() => {
            const d = new Date(t.completed_at.replace(" ", "T"))
            return (
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` ===
              key
            )
          })()
      ).length,
    }
  })
  return (
    <>
      <div className="metric-grid">
        {[
          {
            label: "任务总数",
            value: tasks.length,
            sub: "工作空间内未删除的任务",
            icon: FolderKanban,
          },
          {
            label: "进行中的任务",
            value: tasks.filter((t) => t.status === "progress").length,
            sub: "保持专注，稳步推进",
            icon: ActivityIcon,
          },
          {
            label: "已完成任务",
            value: done,
            sub: "每一步都离目标更近",
            icon: CheckCircle2,
          },
          {
            label: "逾期任务",
            value: tasks.filter(isOverdue).length,
            sub: "及时调整计划与优先级",
            icon: Clock3,
          },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="metric-card">
              <CardContent>
                <div className="metric-label">
                  {metric.label}
                  <metric.icon size={16} />
                </div>
                <div className="metric-value">
                  {metric.value}
                  <span className="metric-pill">实时</span>
                </div>
                <p>
                  <ArrowUpRight size={13} />
                  {metric.sub}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <div className="chart-grid">
        <Card className="chart-card">
          <CardContent>
            <div className="section-heading">
              <div>
                <h2>团队交付趋势</h2>
                <p>最近 7 天的已完成任务，来自真实工作记录。</p>
              </div>
              <Badge variant="outline">近 7 天</Badge>
            </div>
            <div className="chart-legend">
              <span>
                <i />
                完成任务数
              </span>
              <strong>
                {chart.reduce((sum, day) => sum + day.done, 0)}{" "}
                <small>项</small>
              </strong>
            </div>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chart}
                  margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#cf8958"
                        stopOpacity={0.25}
                      />
                      <stop offset="100%" stopColor="#cf8958" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 4"
                    stroke="var(--border)"
                  />
                  <XAxis
                    padding={{ left: 12, right: 12 }}
                    interval={0}
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    dy={8}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 7,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    name="已完成"
                    dataKey="done"
                    stroke="#cf8958"
                    fill="url(#fill)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="focus-card">
          <CardContent>
            {currentProject ? (
              <>
                <div className="focus-kicker">
                  <span>
                    <Target size={14} />
                    项目焦点
                  </span>
                  <Badge variant="outline">进行中</Badge>
                </div>
                <div className="focus-illustration">
                  <div className="focus-circle circle-one" />
                  <div className="focus-circle circle-two" />
                  <div
                    className="focus-symbol"
                    style={{ color: colors[currentProject.color] }}
                  >
                    <Layers size={34} strokeWidth={1.2} />
                  </div>
                </div>
                <h2>{currentProject.name}</h2>
                <p className="clamp-one">
                  {currentProject.description || "让目标清晰，让工作持续推进。"}
                </p>
                <div className="focus-progress">
                  <span>{projectTasks.length} 个任务</span>
                  <strong>{progress}%</strong>
                </div>
                <Progress value={progress} />
                <div className="focus-bottom">
                  <span className="muted-small">
                    {projectTasks.filter((t) => t.status === "done").length}{" "}
                    项已完成
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onProject(currentProject.id)}
                  >
                    查看任务
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                title="从一个项目开始"
                description="把相关任务放在一起，让工作更有方向。"
                icon={<Layers size={30} />}
                action={
                  <Button variant="outline" onClick={onCreateProject}>
                    创建第一个项目
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
const verbs: Record<string, string> = {
  created: "创建了",
  updated: "更新了",
  completed: "完成了",
  deleted: "移入了回收站",
  restored: "恢复了",
  archived: "归档了",
  commented: "评论了",
}
export function ActivityFeed({
  activities,
  members,
  onOpen,
}: {
  activities: Activity[]
  members: Member[]
  onOpen: (id: string) => void
}) {
  return (
    <>
      <div className="detail-heading">
        <span>最近动态</span>
        <ActivityIcon size={15} />
      </div>
      {!activities.length ? (
        <EmptyState
          title="工作，从这里开始"
          description="项目、任务和评论的真实进展会记录在这里。"
        />
      ) : (
        activities.slice(0, 7).map((activity) => (
          <div className="activity-item" key={activity.id}>
            <Person member={members.find((m) => m.id === activity.actor)} />
            <div>
              <p>
                <strong>
                  {members.find((m) => m.id === activity.actor)?.name || "成员"}
                </strong>
                {verbs[activity.action] || "更新了"}
                {activity.entity === "project" ? "项目" : "任务"}
              </p>
              {activity.task ? (
                <Button variant="link" onClick={() => onOpen(activity.task)}>
                  {activity.title}
                </Button>
              ) : (
                <p>{activity.title}</p>
              )}
              <time>
                {new Date(activity.created).toLocaleString("zh-CN", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        ))
      )}
    </>
  )
}
