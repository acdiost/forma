import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useActions } from "@/hooks/use-workspace"
import type { Member } from "@/lib/types"
import { FieldError } from "./AuthScreen"
const schema = z
  .object({
    oldPassword: z.string().min(1, "请输入当前密码"),
    password: z
      .string()
      .min(12, "新密码至少 12 位")
      .max(72, "密码最多 72 个字符"),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "两次输入的密码不一致",
  })
export function PasswordForm({ member }: { member: Member }) {
  const { memberUpdate } = useActions()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: "", password: "", passwordConfirm: "" },
  })
  return (
    <form
      className="password-form"
      onSubmit={form.handleSubmit(async (patch) => {
        try {
          await memberUpdate.mutateAsync({ member, patch })
        } catch {
          /* Retain values so the user can correct the password. */
        }
      })}
    >
      <h3>修改登录密码</h3>
      <div className="form-grid">
        <div>
          <Label htmlFor="old-password">当前密码</Label>
          <Input
            type="password"
            id="old-password"
            autoComplete="current-password"
            {...form.register("oldPassword")}
          />
          <FieldError text={form.formState.errors.oldPassword?.message} />
        </div>
        <div>
          <Label htmlFor="new-password">新密码</Label>
          <Input
            type="password"
            id="new-password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          <FieldError text={form.formState.errors.password?.message} />
        </div>
      </div>
      <div>
        <Label htmlFor="confirm-password">确认新密码</Label>
        <Input
          type="password"
          id="confirm-password"
          autoComplete="new-password"
          {...form.register("passwordConfirm")}
        />
        <FieldError text={form.formState.errors.passwordConfirm?.message} />
      </div>
      <Button variant="outline" type="submit" disabled={memberUpdate.isPending}>
        {memberUpdate.isPending && (
          <LoaderCircle size={13} className="animate-spin" />
        )}
        更新密码并重新登录
      </Button>
    </form>
  )
}
