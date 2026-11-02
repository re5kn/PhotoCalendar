# PhotoCalendar 開発環境
# .NET 10 SDK と Node.js 22 を 1 つのイメージに入れ、
# docker-compose.yml の api (dotnet watch) と web (Vite) の両方で使う。
# ソースはビルド時にコピーせず、docker-compose.yml でバインドマウントする。

FROM node:22-bookworm-slim AS node

FROM mcr.microsoft.com/dotnet/sdk:10.0

# ホスト (WSL2) のユーザーと UID/GID を合わせ、
# バインドマウント先に作られるファイルが root 所有にならないようにする
ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=1000

# Node.js は公式イメージからバイナリを持ってくる
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && node --version && npm --version

RUN apt-get update \
 && apt-get install -y --no-install-recommends git less procps sudo \
 && rm -rf /var/lib/apt/lists/*

# ベースイメージの ubuntu ユーザー (UID 1000) などと重なる場合は置き換える
RUN set -eux; \
    existing_user="$(getent passwd "$USER_UID" | cut -d: -f1 || true)"; \
    if [ -n "$existing_user" ]; then userdel -r "$existing_user" 2>/dev/null || userdel "$existing_user"; fi; \
    existing_group="$(getent group "$USER_GID" | cut -d: -f1 || true)"; \
    if [ -n "$existing_group" ]; then groupdel "$existing_group"; fi; \
    groupadd --gid "$USER_GID" "$USERNAME"; \
    useradd --uid "$USER_UID" --gid "$USER_GID" -m -s /bin/bash "$USERNAME"; \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$USERNAME"; \
    chmod 0440 "/etc/sudoers.d/$USERNAME"

# 名前付きボリュームのマウント先。空のボリュームはここの所有者を引き継ぐので、
# 先に作っておくことで root 所有になるのを防ぐ
RUN mkdir -p \
      /workspace/frontend/node_modules \
      /workspace/backend/PhotoCalendar.Api/bin \
      /workspace/backend/PhotoCalendar.Api/obj \
      /home/$USERNAME/.nuget/packages \
 && chown -R "$USER_UID:$USER_GID" /workspace /home/$USERNAME

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    NUGET_PACKAGES=/home/$USERNAME/.nuget/packages \
    NPM_CONFIG_UPDATE_NOTIFIER=false

USER $USERNAME
WORKDIR /workspace
