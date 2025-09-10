# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# copy source code
COPY . .

# run the app
USER bun
EXPOSE 5173/tcp
ENTRYPOINT [ "bun", "run", "dev", "--host", "0.0.0.0", "--port", "5173" ]
