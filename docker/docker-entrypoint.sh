#!/bin/sh
set -e
 
echo "Starting ws-scrcpy(2026-3-31 10:35:00)..."
 
# 启动 ADB server
adb start-server
 
# 单设备连接
if [ -n "$ADB_DEVICE_IP" ] && [ -n "$ADB_DEVICE_PORT" ]; then
    echo "Connecting to $ADB_DEVICE_IP:$ADB_DEVICE_PORT..."
    adb connect $ADB_DEVICE_IP:$ADB_DEVICE_PORT
fi
 
# 多设备连接（逗号分隔）
if [ -n "$ADB_DEVICES" ]; then
    echo "Connecting to multiple devices..."
    IFS=','
    for device in $ADB_DEVICES; do
        echo "Connecting to $device..."
        adb connect $device
    done
    unset IFS
fi
 
# 从文件连接
if [ -f /ws-scrcpy/adb-devices.txt ]; then
    echo "Connecting devices from file..."
    while IFS= read -r device || [ -n "$device" ]; do
        # 跳过空行和注释
        [[ "$device" =~ ^[[:space:]]*#.*$ ]] && continue
        [ -z "$(echo "$device" | tr -d '[:space:]')" ] && continue
        
        echo "Connecting to $device..."
        adb connect "$device"
    done < /ws-scrcpy/adb-devices.txt
fi
 
# 显示已连接的设备
echo "=== Connected Devices ==="
adb devices -l
 
# 启动 ws-scrcpy
echo "Starting ws-scrcpy server..."
exec node dist/index.js
