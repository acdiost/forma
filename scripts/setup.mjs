import { createHash, randomBytes } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from "node:fs"
import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
const root = resolve(import.meta.dirname, "..")
const lock = JSON.parse(
  readFileSync(resolve(root, "backend/version.json"), "utf8")
)
const platform = `${process.platform}_${process.arch === "x64" ? "amd64" : process.arch}`
if (!lock.sha256[platform])
  throw new Error(`暂不支持本机平台 ${platform}，请使用 Docker。`)
const bin = resolve(root, "backend/.bin")
mkdirSync(bin, { recursive: true })
if (
  !existsSync(resolve(bin, "pocketbase")) ||
  execFileSync(resolve(bin, "pocketbase"), ["--version"], {
    encoding: "utf8",
  }).trim() !== `pocketbase version ${lock.version}`
) {
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${lock.version}/pocketbase_${lock.version}_${platform}.zip`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`PocketBase 下载失败：${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (
    createHash("sha256").update(bytes).digest("hex") !== lock.sha256[platform]
  )
    throw new Error("PocketBase 校验失败，拒绝运行。")
  const zip = resolve(bin, "pocketbase.zip")
  writeFileSync(zip, bytes)
  execFileSync("unzip", ["-oq", zip, "pocketbase", "-d", bin])
  chmodSync(resolve(bin, "pocketbase"), 0o755)
}
if (!existsSync(resolve(root, ".env"))) {
  writeFileSync(
    resolve(root, ".env"),
    `FORMA_SETUP_TOKEN=${randomBytes(32).toString("hex")}\nFORMA_BIND=127.0.0.1\nFORMA_PORT=8090\n`,
    { mode: 0o600 }
  )
  console.log("已生成 .env（包含首次初始化密钥），请勿提交或共享。")
}
console.log(
  `PocketBase ${lock.version} 已就绪。运行 npm run dev；首次访问需使用 .env 中的初始化密钥。`
)
