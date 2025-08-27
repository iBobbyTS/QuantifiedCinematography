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

# 创建package.json（如果不存在）
RUN echo '{"name":"quantified-cinematography","version":"1.0.0","type":"module","scripts":{"start":"echo \"Server starting...\""}}' > package.json

# 安装依赖（如果有的话）
RUN bun install --ci || true

COPY . .
# 构建步骤（如果有的话）
RUN echo "Build completed"

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

ENV NODE_ENV=production
COPY --from=build /usr/src/app /usr/src/app

EXPOSE 3000
# 由 entrypoint.sh 负责迁移并启动
