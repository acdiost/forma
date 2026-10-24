import type { RecordModel } from "pocketbase"
export type Status = "todo" | "progress" | "review" | "done"
export type Priority = "high" | "medium" | "low"
export type Member = RecordModel & {
  name: string
  email: string
  role: "admin" | "member"
  active: boolean
}
export type Project = RecordModel & {
  name: string
  description: string
  color: "orange" | "green" | "blue" | "purple"
  archived: boolean
  created_by: string
  version: number
}
export type Task = RecordModel & {
  title: string
  description: string
  project: string
  status: Status
  priority: Priority
  progress: number
  assignee: string
  due: string
  completed_at: string
  deleted_at: string
  label: string
  position: number
  created_by: string
  version: number
}
export type TaskInput = Pick<
  Task,
  | "title"
  | "description"
  | "project"
  | "status"
  | "priority"
  | "progress"
  | "assignee"
  | "due"
  | "label"
>
export type Comment = RecordModel & {
  task: string
  author: string
  body: string
}
export type Activity = RecordModel & {
  actor: string
  entity: string
  action: string
  title: string
  task: string
  project: string
}
export const statuses: { value: Status; label: string }[] = [
  { value: "todo", label: "待开始" },
  { value: "progress", label: "进行中" },
  { value: "review", label: "审核中" },
  { value: "done", label: "已完成" },
]
export const priorities: { value: Priority; label: string }[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
]
export const colors = {
  orange: "#ce895a",
  green: "#829b70",
  blue: "#789eae",
  purple: "#9d8cbb",
}
export function dateInput(value: string) {
  return value ? value.slice(0, 10) : ""
}
export function displayDate(value: string) {
  if (!value) return "无截止日期"
  const [, m, d] = dateInput(value).split("-")
  return `${Number(m)}月${Number(d)}日`
}
export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
export function isOverdue(task: Task) {
  return !!task.due && dateInput(task.due) < today() && task.status !== "done"
}
