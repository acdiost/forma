import { useState } from "react"
import {
  Check,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { IconButton, Person } from "@/components/app/shared"
import { useActions, useComments } from "@/hooks/use-workspace"
import { errorMessage } from "@/lib/api"
import {
  displayDate,
  priorities,
  statuses,
  type Member,
  type Project,
  type Status,
  type Task,
} from "@/lib/types"
import { TaskProgress } from "./TaskProgress"
import { FormSelect } from "./Forms"
export function TaskDetail({
  task,
  members,
  projects,
  onEdit,
  onDelete,
  onClose,
}: {
  task: Task
  members: Member[]
  projects: Project[]
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const actions = useActions(),
    { comments, create } = useComments(task)
  const [body, setBody] = useState("")
  return (
    <div className="task-detail-content">
      <div className="detail-heading">
        <span>任务详情</span>
        <IconButton label="关闭任务详情" onClick={onClose}>
          <X size={14} />
        </IconButton>
      </div>
      <span className="detail-id">{task.id.toUpperCase()}</span>
      <h3>{task.title}</h3>
      <p className="detail-description">
        {task.description || "暂无描述。点击编辑补充任务背景与交付要求。"}
      </p>
      <Label>进度</Label>
      <TaskProgress
        task={task}
        readOnly={!!task.deleted_at}
        disabled={actions.taskUpdate.isPending}
        onSave={(progress) =>
          actions.taskUpdate.mutateAsync({ task, patch: { progress } })
        }
      />
      {task.deleted_at ? (
        <div className="demo-info">
          此任务已移入回收站，可从回收站列表恢复。
        </div>
      ) : (
        <>
          <Label>状态</Label>
          <FormSelect
            label="修改任务状态"
            value={task.status}
            onChange={(v) =>
              actions.taskUpdate.mutate({
                task,
                patch: { status: v as Status },
              })
            }
            options={statuses}
            disabled={actions.taskUpdate.isPending}
          />
          <Label>负责人</Label>
          <FormSelect
            label="修改任务负责人"
            value={task.assignee || "none"}
            onChange={(v) =>
              actions.taskUpdate.mutate({
                task,
                patch: { assignee: v === "none" ? "" : v },
              })
            }
            options={[
              { value: "none", label: "未分配" },
              ...members
                .filter((m) => m.active || m.id === task.assignee)
                .map((m) => ({
                  value: m.id,
                  label: m.name + (m.active ? "" : "（停用）"),
                })),
            ]}
            disabled={actions.taskUpdate.isPending}
          />
          <Label>优先级</Label>
          <FormSelect
            label="修改任务优先级"
            value={task.priority}
            onChange={(v) =>
              actions.taskUpdate.mutate({
                task,
                patch: { priority: v as Task["priority"] },
              })
            }
            options={priorities}
            disabled={actions.taskUpdate.isPending}
          />
        </>
      )}
      <div className="detail-meta">
        {displayDate(task.due)}
        <span>{projects.find((p) => p.id === task.project)?.name}</span>
      </div>
      {!task.deleted_at && (
        <div className="detail-actions">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil size={13} />
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              actions.taskUpdate.mutate(
                {
                  task,
                  patch: { status: task.status === "done" ? "todo" : "done" },
                },
                { onSuccess: () => toast.success("任务已更新") }
              )
            }
            disabled={actions.taskUpdate.isPending}
          >
            <Check size={13} />
            {task.status === "done" ? "重新打开" : "完成"}
          </Button>
          <IconButton label="移入回收站" onClick={onDelete}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      )}
      <div className="comments-heading">
        <MessageSquare size={14} />
        任务讨论 <span>{comments.data?.length || 0}</span>
      </div>
      {comments.isPending && <p className="muted-small">正在加载评论…</p>}
      {comments.error && (
        <p className="form-error">{errorMessage(comments.error)}</p>
      )}
      {comments.data?.map((comment) => (
        <div className="comment" key={comment.id}>
          <Person member={members.find((m) => m.id === comment.author)} />
          <div>
            <strong>
              {members.find((m) => m.id === comment.author)?.name || "成员"}
            </strong>
            <p>{comment.body}</p>
            <time>
              {new Date(comment.created).toLocaleString("zh-CN", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        </div>
      ))}
      {!task.deleted_at && (
        <form
          className="comment-form"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!body.trim()) return
            try {
              await create.mutateAsync(body.trim())
              setBody("")
            } catch {
              /* Preserve the unsent comment. */
            }
          }}
        >
          <Textarea
            aria-label="评论内容"
            maxLength={5000}
            placeholder="记录进展，或补充你的想法…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            size="sm"
            type="submit"
            disabled={create.isPending || !body.trim()}
          >
            {create.isPending ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            发送评论
          </Button>
        </form>
      )}
    </div>
  )
}
