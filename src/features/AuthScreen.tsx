import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Layers, LoaderCircle, LockKeyhole, RefreshCw } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage, pb, queryClient } from "@/lib/api"
const schema = z.object({
  email: z.email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
  name: z.string(),
  token: z.string(),
})
export function AuthScreen() {
  const status = useQuery({
    queryKey: ["status"],
    queryFn: () =>
      pb.send<{
        version: string
        setupRequired: boolean
        setupEnabled: boolean
      }>("/api/forma/status", {}),
    refetchInterval: false,
  })
  const setup = status.data?.setupRequired
  const [error, setError] = useState("")
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", name: "", token: "" },
  })
  const submit = form.handleSubmit(async (values) => {
    setError("")
    try {
      if (setup) {
        if (values.password.length < 12) {
          form.setError("password", { message: "初始化密码至少 12 位" })
          return
        }
        if (!values.name.trim()) {
          form.setError("name", { message: "请输入姓名" })
          return
        }
        await pb.send("/api/forma/setup", {
          method: "POST",
          headers: { "X-Forma-Setup-Token": values.token.trim() },
          body: {
            email: values.email,
            name: values.name,
            password: values.password,
          },
        })
        void queryClient.invalidateQueries({ queryKey: ["status"] })
      }
      await pb
        .collection("members")
        .authWithPassword(values.email, values.password)
    } catch (e) {
      setError(errorMessage(e))
    }
  })
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <span className="brand-mark">
          <Layers size={23} />
        </span>
        <strong>Forma</strong>
      </div>
      <Card className="auth-card">
        <CardContent>
          <span className="eyebrow">YOUR SPACE TO MAKE THINGS HAPPEN</span>
          <h1>{setup ? "建立你的工作空间。" : "欢迎回来。"}</h1>
          <p className="auth-intro">
            {setup
              ? "创建第一个管理员账号，让每一步工作清晰可见。"
              : "登录，继续推进值得投入的工作。"}
          </p>
          {status.isPending ? (
            <div className="loading-inline">
              <LoaderCircle className="animate-spin" size={18} />
              正在连接工作空间…
            </div>
          ) : status.error ? (
            <div className="form-error">
              <p>无法连接服务器，请确认 PocketBase 已启动。</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void status.refetch()}
              >
                <RefreshCw size={13} />
                重试
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="form-fields">
              {setup && (
                <>
                  <div>
                    <Label htmlFor="setup-token">初始化密钥</Label>
                    <Input
                      id="setup-token"
                      type="password"
                      required
                      autoComplete="off"
                      {...form.register("token")}
                    />
                    <small>
                      由服务器部署者提供，位于 .env 的 FORMA_SETUP_TOKEN。
                    </small>
                  </div>
                  <div>
                    <Label htmlFor="user-name">你的姓名</Label>
                    <Input
                      id="user-name"
                      maxLength={50}
                      {...form.register("name")}
                    />
                    <FieldError text={form.formState.errors.name?.message} />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="login-email">邮箱</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  {...form.register("email")}
                />
                <FieldError text={form.formState.errors.email?.message} />
              </div>
              <div>
                <Label htmlFor="login-password">密码</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete={setup ? "new-password" : "current-password"}
                  {...form.register("password")}
                />
                <FieldError text={form.formState.errors.password?.message} />
              </div>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              {setup && !status.data?.setupEnabled && (
                <p className="form-error">
                  服务端未配置初始化密钥，请先完成部署配置。
                </p>
              )}
              <Button
                disabled={
                  form.formState.isSubmitting ||
                  (setup && !status.data?.setupEnabled)
                }
                type="submit"
              >
                {form.formState.isSubmitting ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <LockKeyhole size={15} />
                )}{" "}
                {setup ? "创建工作空间" : "登录工作空间"}
              </Button>
              {!setup && (
                <small className="auth-help">
                  需要账号或重置密码？请联系工作空间管理员。
                </small>
              )}
            </form>
          )}
        </CardContent>
      </Card>
      <p className="auth-footer">
        私有部署 · 数据由你掌握 <span>v0.0.1</span>
      </p>
    </div>
  )
}
export function FieldError({ text }: { text?: string }) {
  return text ? (
    <p className="field-error" role="alert">
      {text}
    </p>
  ) : null
}
