FROM node:20-slim
 
MAINTAINER bygavin <bygavin>
 
ENV LANG C.UTF-8
WORKDIR /ws-scrcpy
 
# 2. 优化 apt 命令
# 使用 && 连接，确保 update 成功后才执行 install
# 安装必要的编译工具，ws-scrcpy 需要编译原生模块
RUN apt-get update && apt-get install -y \
    android-tools-adb \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
 
# 3. 全局安装 node-gyp
RUN npm install -g node-gyp
 
# 4. 复制项目文件
COPY . .
 
# 5. 安装依赖并构建
RUN npm ci --legacy-peer-deps
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run dist
 
# 6. 复制启动脚本到容器内
COPY docker/docker-entrypoint.sh /usr/local/bin/
 
# 7. 设置执行权限
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
 
EXPOSE 8000
 
# 8. 使用 ENTRYPOINT 启动（会自动执行 docker-entrypoint.sh）
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
