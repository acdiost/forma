import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage, pb } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type {
  Activity,
  Comment,
  Member,
  Project,
  Task,
  TaskInput,
} from "@/lib/types"

export function useWorkspace() {
  const { user } = useAuth()
  const tasks = useQuery({
    queryKey: ["workspace", user?.id, "tasks"],
    queryFn: ({ signal }) =>
      pb
        .collection<Task>("tasks")
        .getFullList({ sort: "position,-created", signal }),
    enabled: !!user,
  })
  const projects = useQuery({
    queryKey: ["workspace", user?.id, "projects"],
    queryFn: ({ signal }) =>
      pb
        .collection<Project>("projects")
        .getFullList({ sort: "-created", signal }),
    enabled: !!user,
  })
  const members = useQuery({
    queryKey: ["workspace", user?.id, "members"],
    queryFn: ({ signal }) =>
      pb.collection<Member>("members").getFullList({ sort: "created", signal }),
    enabled: !!user,
  })
  const activities = useQuery({
    queryKey: ["workspace", user?.id, "activities"],
    queryFn: ({ signal }) =>
      pb
        .collection<Activity>("activities")
        .getList(1, 12, { sort: "-created", signal })
        .then((r) => r.items),
    enabled: !!user,
  })
  const client = useQueryClient()
  useEffect(() => {
    if (!user) return
    let disposed = false
    const unsubscribers: (() => Promise<void>)[] = []
    for (const name of [
      "tasks",
      "projects",
      "members",
      "activities",
      "comments",
    ]) {
      pb.collection(name)
        .subscribe("*", () => {
          void client.invalidateQueries({ queryKey: ["workspace"] })
        })
        .then((unsubscribe) => {
          if (disposed) void unsubscribe()
          else unsubscribers.push(unsubscribe)
        })
        .catch(() => {
          /* Focus and periodic refetch provide recovery if SSE is unavailable. */
        })
    }
    return () => {
      disposed = true
      for (const unsubscribe of unsubscribers) void unsubscribe()
    }
  }, [client, user])
  const error = tasks.error || projects.error || members.error
  return {
    tasks: tasks.data || [],
    projects: projects.data || [],
    members: members.data || [],
    activities: activities.data || [],
    loading: tasks.isPending || projects.isPending || members.isPending,
    error,
    refreshing: tasks.isFetching || projects.isFetching || members.isFetching,
    refresh: () => client.invalidateQueries({ queryKey: ["workspace"] }),
  }
}
export function useActions() {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: ["workspace"] })
  const failed = (error: unknown) => {
    toast.error(errorMessage(error))
    void refresh()
  }
  const taskCreate = useMutation({
    mutationFn: (data: TaskInput) => pb.collection<Task>("tasks").create(data),
    onSuccess: () => {
      void refresh()
      toast.success("任务已创建")
    },
    onError: failed,
  })
  const taskUpdate = useMutation({
    scope: { id: "task-writes" },
    mutationFn: ({
      task,
      patch,
    }: {
      task: Task
      patch: Partial<TaskInput & Pick<Task, "deleted_at" | "position">>
    }) =>
      pb.collection<Task>("tasks").update(task.id, patch, {
        headers: { "X-Record-Version": String(task.version) },
      }),
    // Keep quick controls disabled until the new version is available in cache.
    onSuccess: () => refresh(),
    onError: failed,
  })
  const projectCreate = useMutation({
    mutationFn: (data: Pick<Project, "name" | "description" | "color">) =>
      pb.collection<Project>("projects").create(data),
    onSuccess: () => {
      void refresh()
      toast.success("项目已创建")
    },
    onError: failed,
  })
  const projectUpdate = useMutation({
    mutationFn: ({
      project,
      patch,
    }: {
      project: Project
      patch: Partial<
        Pick<Project, "name" | "description" | "color" | "archived">
      >
    }) =>
      pb.collection<Project>("projects").update(project.id, patch, {
        headers: { "X-Record-Version": String(project.version) },
      }),
    onSuccess: () => {
      void refresh()
      toast.success("项目已更新")
    },
    onError: failed,
  })
  const memberCreate = useMutation({
    mutationFn: (data: {
      name: string
      email: string
      password: string
      role: string
    }) =>
      pb.collection<Member>("members").create({
        ...data,
        passwordConfirm: data.password,
        active: true,
        emailVisibility: true,
      }),
    onSuccess: () => {
      void refresh()
      toast.success("成员已创建")
    },
    onError: failed,
  })
  const memberUpdate = useMutation({
    mutationFn: ({
      member,
      patch,
    }: {
      member: Member
      patch: Partial<Pick<Member, "name" | "role" | "active">> & {
        password?: string
        passwordConfirm?: string
        oldPassword?: string
      }
    }) => pb.collection<Member>("members").update(member.id, patch),
    onSuccess: (_, variables) => {
      if (
        variables.patch.password &&
        variables.member.id === pb.authStore.record?.id
      ) {
        pb.authStore.clear()
        client.clear()
        toast.success("密码已更新，请重新登录")
      } else {
        void refresh()
        toast.success("成员已更新")
      }
    },
    onError: failed,
  })
  return {
    taskCreate,
    taskUpdate,
    projectCreate,
    projectUpdate,
    memberCreate,
    memberUpdate,
  }
}
export function useComments(task: Task) {
  const client = useQueryClient()
  const { user } = useAuth()
  const comments = useQuery({
    queryKey: ["workspace", user?.id, "comments", task.id],
    queryFn: () =>
      pb.collection<Comment>("comments").getFullList({
        filter: pb.filter("task = {:task}", { task: task.id }),
        sort: "created",
      }),
  })
  const create = useMutation({
    mutationFn: (body: string) =>
      pb.collection<Comment>("comments").create({ task: task.id, body }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["workspace"] })
      toast.success("评论已发送")
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return { comments, create }
}
