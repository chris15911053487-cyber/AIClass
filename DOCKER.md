# Docker 部署 AI 实践学堂

本项目现有两种构建目标：原 Sites/Cloudflare 版本与独立 Docker/Node 版本。Docker 版本使用 Node 24、SQLite 数据卷和独立管理员密码，不依赖 ChatGPT 登录或 Cloudflare D1。原托管站点的数据不会自动复制到本地 Docker。

## 快速启动

需要 Docker Engine / Docker Desktop 和 Docker Compose v2。先进入包含 `Dockerfile`、`compose.yaml` 的项目目录。

### 1. 生成配置

如果本机有 Node 22.13 以上：

```sh
npm run docker:configure
```

如果服务器只安装了 Docker：

```sh
docker run --rm -it -v "$PWD:/workspace" -w /workspace node:24-bookworm-slim node server/configure.mjs
```

按提示输入访问地址（本机默认 `http://127.0.0.1:8080`）和管理员账号。脚本生成 `.env.docker`，并显示一次随机初始密码，请保存。它不会覆盖已有配置。配置文件中的管理员密码仅以 scrypt 散列保存。

### 2. 构建与启动

```sh
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
```

默认首页：<http://127.0.0.1:8080>。后台：<http://127.0.0.1:8080/admin>。

首次启动自动执行数据库迁移，随后启动正式 Node 服务。健康检查通过后，状态显示 healthy。

### 3. 配置正式域名

在 `.env.docker` 中设置：

```dotenv
APP_ORIGIN=https://learn.example.com
BIND_ADDRESS=127.0.0.1
PORT=8080
```

APP_ORIGIN 必须与浏览器实际使用的协议、域名和端口完全一致，不包含路径或尾部 `/`，用于请求来源验证和安全 Cookie。

建议让服务器已有的 Nginx/Caddy 在 HTTPS 域名下代理到 `127.0.0.1:8080`。例如已有 Caddy 可添加：

```caddy
learn.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

默认端口只绑定本机。若仅需临时在局域网访问，可把 BIND_ADDRESS 改为 `0.0.0.0`，并同步把 APP_ORIGIN 改成实际 IP 地址；正式使用应配置 HTTPS。

修改配置后执行：

```sh
docker compose --env-file .env.docker up -d
```

## 账号与外部服务

- 老师：通过 `/admin` 使用独立管理员账号和密码，登录有效期 8 小时；修改密码散列后旧管理员会话失效。
- 学员：仍使用中国大陆手机号与短信验证码，首次验证自动注册。
- 未接通短信时无法注册；没有测试验证码或公开管理后门。
- 容器忽略访客自行提供的 ChatGPT 身份请求头。
- 独立版本采用服务端全局频率限制，不信任客户端伪造的转发 IP；高并发运营时可在反向代理层补充分 IP 限流。

短信需配置 `.env.docker`：

```dotenv
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=
SMS_TEMPLATE_CODE=
```

需要已审核的阿里云短信签名与验证码模板，模板参数为 `code`。OTP_SECRET 已在初始化时随机生成。不要在公网发送真实测试短信前遗漏频率与费用限制。

AI 问答需配置：

```dotenv
AI_API_KEY=
AI_MODEL=
```

当前连接 OpenAI API；模型名填账号实际可用的模型。密钥仅供服务器使用。修改后重新运行 compose up -d。真正的短信投递和模型响应仍需配置服务后验收。

## 数据、更新与备份

课程、草稿、学员、作业、会话、对话保存在 Compose 的 `academy_data` 命名数据卷，容器内文件是 `/data/academy.sqlite`，采用 WAL。单实例运行，不能把同一个 SQLite 卷挂给多台服务器共同写入。

更新源码后：

```sh
docker compose --env-file .env.docker up -d --build
```

停止服务不会删除数据：

```sh
docker compose --env-file .env.docker down
```

**不要使用 `down -v`，它会删除数据卷。**

一致性备份（短暂停止服务，将数据库目录整体备份）：

```sh
mkdir -p backups
docker compose --env-file .env.docker stop academy
docker compose --env-file .env.docker cp academy:/data/. ./backups/
docker compose --env-file .env.docker start academy
```

恢复前先备份当前数据并停止服务，把备份目录中的 SQLite 及其配套文件复制回 `/data`，确保用户 `node`（UID 1000）具有读写权限。不要只复制运行中的主数据库文件而遗漏 WAL。

查看日志：

```sh
docker compose --env-file .env.docker logs --tail=100 academy
```

## 管理员密码重置

通过 stdin 生成新散列，避免把密码直接写在命令参数里。以下示例使用 Bash：

```bash
read -r -s -p '新密码（至少12位）: ' new_admin_password
printf '\n'
printf '%s' "$new_admin_password" | docker compose --env-file .env.docker exec -T academy node server/password.mjs
unset new_admin_password
```

把输出的 scrypt 散列写入 `.env.docker` 的 ADMIN_PASSWORD_HASH，再运行 `docker compose --env-file .env.docker up -d`。旧管理员会话将无法继续使用。

## 当前范围

支持课程、题目、Skills 和资源的后台编辑，学习进度、文本实战、规则预检与老师复核。短信和 AI 需要自行开通服务；文件上传、在线代码沙箱、付费课程仍未实现。Docker 版与原私有托管版的数据独立，迁移现有内容需另行导入。
