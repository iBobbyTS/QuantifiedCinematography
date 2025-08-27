# ===== build =====
FROM ubuntu:22.04 as build
WORKDIR /usr/src/app

# 安装必要的依赖和bun
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 安装bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# 复制 package.json 和依赖文件
COPY package.json bun.lock ./

# 安装依赖
RUN bun install --ci

# 复制源代码
COPY . .

# 构建应用
RUN bun run build

# ===== run =====
FROM ubuntu:22.04
WORKDIR /usr/src/app

# 安装运行时依赖和bun
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 安装bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 复制构建后的应用
COPY --from=build /usr/src/app /usr/src/app

# 暴露端口
EXPOSE 3000

# 设置默认启动命令（可以被 docker compose 覆盖）
CMD ["bun", "run", "preview"]
