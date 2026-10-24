import PocketBase, { ClientResponseError } from "pocketbase"
import { QueryClient } from "@tanstack/react-query"
export const pb = new PocketBase(
  import.meta.env.VITE_API_URL || window.location.origin
)
pb.autoCancellation(false)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchInterval: 60_000,
      retry: (count, error) =>
        !(
          error instanceof ClientResponseError &&
          error.status >= 400 &&
          error.status < 500
        ) && count < 1,
    },
  },
})
export function errorMessage(error: unknown) {
  if (error instanceof ClientResponseError) {
    if (error.status === 409)
      return "记录已被其他成员修改，已刷新列表。请重新打开编辑窗口。"
    if (error.status === 0) return "无法连接服务器，请检查网络后重试。"
    const fields = Object.values(error.response.data || {}) as {
      message?: string
    }[]
    return (
      fields[0]?.message || error.response.message || "操作失败，请稍后重试。"
    )
  }
  return error instanceof Error ? error.message : "操作失败，请重试。"
}
