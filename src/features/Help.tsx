import {
  ArrowRight,
  BookOpen,
  CheckCheck,
  Download,
  FolderKanban,
  Keyboard,
  LayoutGrid,
  List,
  Search,
  Settings2,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import pocketbaseGuideUrl from "../../docs/pocketbase-basics.md?url"
import operationsGuideUrl from "../../docs/operations.md?url"

const shortcuts = [
  {
    keys: ["⌘ / Ctrl", "K"],
    action: "搜索任务、跳转页面",
    scope: "工作空间内",
  },
  {
    keys: ["⌘ / Ctrl", "B"],
    action: "展开或收起左侧导航",
    scope: "工作空间内",
  },
  {
    keys: ["↑", "↓", "Enter"],
    action: "选择并打开搜索结果",
    scope: "搜索弹窗内",
  },
  { keys: ["Enter / Tab"], action: "保存截止日期", scope: "日期输入框内" },
  { keys: ["Esc"], action: "取消当前日期修改", scope: "日期输入框内" },
  {
    keys: ["Space", "↑ / ↓", "Space"],
    action: "拿起、移动、放下任务",
    scope: "列表拖动手柄获得焦点后；Esc 取消",
  },
]

const questions = [
  {
    question: "“我的任务”为什么是空的？",
    answer:
      "这里只显示负责人是你的任务。先在工作概览中找到任务，把负责人改成自己；如果仍没找到，清空搜索并把状态、项目筛选切回全部。",
  },
  {
    question: "任务该在哪里编辑，什么时候会保存？",
    answer:
      "点击任务标题查看详情，点击“编辑”修改完整信息。列表中的状态、优先级和负责人选择后立即保存；截止日期在按 Enter 或离开输入框时保存，Esc 取消。创建或编辑表单需要点击提交按钮。",
  },
  {
    question: "误删任务或归档项目后怎么恢复？",
    answer:
      "删除任务后的提示会保留 8 秒，可点击“撤销”；错过提示后，到回收站点击任务右侧的恢复按钮。项目空间中点击“查看已归档项目”，再选择恢复项目。当前没有永久删除任务的操作。",
  },
  {
    question: "提示记录被其他成员修改，怎么办？",
    answer:
      "先保留自己尚未提交的内容，重新打开编辑窗口查看最新记录，核对后再保存。连接异常时可点击右上角刷新，恢复连接后重试；没有成功提示前，不要把修改当作已经保存。",
  },
  {
    question: "谁能看到我的项目、任务和评论？",
    answer:
      "同一工作空间内的所有启用成员都可以查看和编辑项目、任务，也能查看回收站和发表评论。选择负责人用于分工，不会让任务变为私有。只有管理员可以添加、停用和管理其他成员。",
  },
]

export function Help({
  isAdmin,
  hasProjects,
  loading,
  onCreateProject,
  onCreateTask,
  onNavigate,
  onShowTasks,
  onSearch,
  onSettings,
}: {
  isAdmin: boolean
  hasProjects: boolean
  loading: boolean
  onCreateProject: () => void
  onCreateTask: () => void
  onNavigate: (page: string) => void
  onShowTasks: (view: "list" | "board") => void
  onSearch: () => void
  onSettings: () => void
}) {
  const steps = [
    {
      icon: FolderKanban,
      title: "为目标建一个项目",
      description:
        "项目用来放同一个目标下的任务。写清名称和背景，后面查找更方便。",
      action: "创建项目",
      onClick: onCreateProject,
    },
    {
      icon: CheckCheck,
      title: "把下一步写成任务",
      description:
        "选择项目，写下具体要做的事，再分配负责人、优先级和截止日期。",
      action: hasProjects ? "创建任务" : "先创建项目",
      onClick: hasProjects ? onCreateTask : onCreateProject,
    },
    {
      icon: Users,
      title: isAdmin ? "让团队一起推进" : "找到自己的工作",
      description: isAdmin
        ? "在团队成员中添加账号，再把任务分配给同事。大家共用一个工作空间。"
        : "在“我的任务”查看分配给你的工作，点开任务，在讨论中留下进展。",
      action: isAdmin ? "管理团队" : "查看我的任务",
      onClick: () => onNavigate(isAdmin ? "team" : "tasks"),
    },
  ]
  const actions = [
    {
      icon: List,
      title: "在列表中快速处理",
      description:
        "点字段修改状态、优先级和负责人；点标题旁的圆圈完成任务，再点可重新打开。拖动手柄可调整顺序。",
      action: "打开任务列表",
      onClick: () => onShowTasks("list"),
    },
    {
      icon: LayoutGrid,
      title: "用看板推进状态",
      description:
        "按待开始、进行中、审核中、已完成查看任务。用卡片手柄拖到另一列修改状态，也可直接修改优先级。",
      action: "打开任务看板",
      onClick: () => onShowTasks("board"),
    },
    {
      icon: Search,
      title: "找到需要的任务",
      description:
        "全局搜索支持任务名称、编号、标签和项目名。任务列表还能按项目、状态、今天到期和逾期筛选。",
      action: "搜索工作空间",
      onClick: onSearch,
    },
    {
      icon: Trash2,
      title: "找回移除的任务",
      description:
        "删除会把任务移入回收站。恢复后，任务回到原来的项目和状态，已有讨论也会保留。",
      action: "打开回收站",
      onClick: () => onNavigate("trash"),
    },
  ]

  return (
    <div className="help-page">
      <section aria-labelledby="help-start-title">
        <div className="help-section-heading">
          <div>
            <span className="help-eyebrow">从这里开始</span>
            <h2 id="help-start-title">三步，把想法变成进展</h2>
            <p>先建项目，再拆任务，最后和团队一起推进。</p>
          </div>
          <BookOpen size={25} strokeWidth={1.4} aria-hidden="true" />
        </div>
        <ol className="help-start-grid">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="help-step">
                <CardContent>
                  <div className="help-step-top">
                    <span className="help-icon">
                      <step.icon size={20} />
                    </span>
                    <span className="help-step-number">0{index + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <Button
                    variant="outline"
                    onClick={step.onClick}
                    disabled={loading}
                  >
                    {step.action}
                    <ArrowRight size={14} />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <div className="help-columns">
        <section aria-labelledby="help-actions-title">
          <div className="help-section-heading">
            <div>
              <h2 id="help-actions-title">常用操作，直接试一试</h2>
              <p>这些入口会带你到实际页面，按需要开始。</p>
            </div>
          </div>
          <div className="help-actions-grid">
            {actions.map((action) => (
              <Card key={action.title} className="help-action">
                <CardContent>
                  <action.icon size={20} className="help-action-icon" />
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                  <Button variant="link" onClick={action.onClick}>
                    {action.action}
                    <ArrowRight size={13} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="help-shortcuts-title">
          <div className="help-section-heading">
            <div>
              <h2 id="help-shortcuts-title">少点几次，快一点</h2>
              <p>Mac 用 ⌘，Windows / Linux 用 Ctrl。</p>
            </div>
            <Keyboard size={21} aria-hidden="true" />
          </div>
          <Card className="help-shortcuts">
            <CardContent>
              <dl>
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.action}>
                    <dt>
                      {shortcut.action}
                      <span>{shortcut.scope}</span>
                    </dt>
                    <dd>
                      {shortcut.keys.map((key, index) => (
                        <kbd key={`${key}-${index}`}>{key}</kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="help-keyboard-note">
                用 Tab
                移到按钮或拖动手柄，焦点边框会提示当前的位置。看板跨列移动可使用鼠标拖动，或在任务详情中修改状态。
              </p>
            </CardContent>
          </Card>
          <Button
            variant="outline"
            className="help-settings"
            onClick={onSettings}
          >
            <Settings2 size={15} />
            调整字体、主题与侧边详情
            <ArrowRight size={14} />
          </Button>
        </section>
      </div>

      <section aria-labelledby="help-questions-title">
        <div className="help-section-heading">
          <div>
            <h2 id="help-questions-title">遇到问题，从这里找答案</h2>
            <p>关于查找、保存、恢复与团队协作的几个说明。</p>
          </div>
        </div>
        <Card className="help-questions">
          <CardContent>
            {questions.map((question) => (
              <details key={question.question}>
                <summary>{question.question}</summary>
                <p>{question.answer}</p>
              </details>
            ))}
          </CardContent>
        </Card>
      </section>

      <section
        className="help-resources"
        aria-labelledby="help-resources-title"
      >
        <div>
          <h2 id="help-resources-title">开发与维护资料</h2>
          <p>维护这个私有工作空间时，可下载文档查阅。</p>
        </div>
        <div className="help-resource-links">
          <Button variant="outline" asChild>
            <a href={pocketbaseGuideUrl} download="pocketbase-basics.md">
              <Download size={14} />
              PocketBase 基础用法
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={operationsGuideUrl} download="operations.md">
              <Download size={14} />
              备份、恢复与升级
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
