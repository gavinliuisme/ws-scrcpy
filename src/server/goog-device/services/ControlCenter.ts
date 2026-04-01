import { TrackerChangeSet } from '@dead50f7/adbkit/lib/TrackerChangeSet';
import { Device } from '../Device';
import { Service } from '../../services/Service';
import AdbKitClient from '@dead50f7/adbkit/lib/adb/client';
import { AdbExtended } from '../adb';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import Tracker from '@dead50f7/adbkit/lib/adb/tracker';
import Timeout = NodeJS.Timeout;
import { BaseControlCenter } from '../../services/BaseControlCenter';
import { ControlCenterCommand } from '../../../common/ControlCenterCommand';
import * as os from 'os';
import * as crypto from 'crypto';
import { DeviceState } from '../../../common/DeviceState';
import * as fs from 'fs';
import * as path from 'path';

export class ControlCenter extends BaseControlCenter<GoogDeviceDescriptor> implements Service {
    private static readonly defaultWaitAfterError = 1000;
    private static instance?: ControlCenter;

    private static readonly ADB_DEVICES_FILE = 'adb-devices.txt';
    
    private initialized = false;
    private client: AdbKitClient = AdbExtended.createClient();
    private tracker?: Tracker;
    private waitAfterError = 1000;
    private restartTimeoutId?: Timeout;
    private deviceMap: Map<string, Device> = new Map();
    private descriptors: Map<string, GoogDeviceDescriptor> = new Map();
    private readonly id: string;

   // 获取设备列表文件的完整路径
    private getDevicesFilePath(): string {
        return path.resolve(process.cwd(), ControlCenter.ADB_DEVICES_FILE);
    }
 
    // 读取已有的设备列表
    private readDeviceList(): string[] {
        const filePath = this.getDevicesFilePath();
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                return content
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
            }
        } catch (error) {
            console.error(`Error reading device list: ${error}`);
        }
        return [];
    }
 
    // 写入设备列表（去重）
    private writeDeviceList(devices: string[]): void {
        const filePath = this.getDevicesFilePath();
        try {
            // 去重并过滤空行
            const uniqueDevices = [...new Set(devices.filter(d => d.length > 0))];
            const content = uniqueDevices.join('\n') + '\n';
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`Device list saved to ${filePath}`);
        } catch (error) {
            console.error(`Error writing device list: ${error}`);
        }
    }
 
    // 添加新设备到列表
    private addDeviceToList(deviceId: string): void {
        if (!deviceId) {
            return;
        }
        
        const currentList = this.readDeviceList();
        
        // 检查是否已存在（去重）
        if (currentList.includes(deviceId)) {
            console.log(`Device ${deviceId} already exists in the list`);
            return;
        }
        
        // 添加新设备并写入文件
        currentList.push(deviceId);
        this.writeDeviceList(currentList);
        console.log(`Device ${deviceId} added to the list`);
    }
 
    protected constructor() {
        super();
        const idString = `goog|${os.hostname()}|${os.uptime()}`;
        this.id = crypto.createHash('md5').update(idString).digest('hex');
    }

    public static getInstance(): ControlCenter {
        if (!this.instance) {
            this.instance = new ControlCenter();
        }
        return this.instance;
    }

    public static hasInstance(): boolean {
        return !!ControlCenter.instance;
    }

    private restartTracker = (): void => {
        if (this.restartTimeoutId) {
            return;
        }
        console.log(`Device tracker is down. Will try to restart in ${this.waitAfterError}ms`);
        this.restartTimeoutId = setTimeout(() => {
            this.stopTracker();
            this.waitAfterError *= 1.2;
            this.init();
        }, this.waitAfterError);
    };

    private onChangeSet = (changes: TrackerChangeSet): void => {
        this.waitAfterError = ControlCenter.defaultWaitAfterError;
        if (changes.added.length) {
            for (const item of changes.added) {
                const { id, type } = item;
                this.handleConnected(id, type);
            }
        }
        if (changes.removed.length) {
            for (const item of changes.removed) {
                const { id } = item;
                this.handleConnected(id, DeviceState.DISCONNECTED);
            }
        }
        if (changes.changed.length) {
            for (const item of changes.changed) {
                const { id, type } = item;
                this.handleConnected(id, type);
            }
        }
    };

    private onDeviceUpdate = (device: Device): void => {
        const { udid, descriptor } = device;
        this.descriptors.set(udid, descriptor);
        this.emit('device', descriptor);
    };

    private handleConnected(udid: string, state: string): void {
        let device = this.deviceMap.get(udid);
        if (device) {
            device.setState(state);
        } else {
            device = new Device(udid, state);
            device.on('update', this.onDeviceUpdate);
            this.deviceMap.set(udid, device);
        }
    }

    public async init(): Promise<void> {
        if (this.initialized) {
            return;
        }
        this.tracker = await this.startTracker();
        const list = await this.client.listDevices();
        list.forEach((device) => {
            const { id, type } = device;
            this.handleConnected(id, type);
        });
        this.initialized = true;
    }

    private async startTracker(): Promise<Tracker> {
        if (this.tracker) {
            return this.tracker;
        }
        const tracker = await this.client.trackDevices();
        tracker.on('changeSet', this.onChangeSet);
        tracker.on('end', this.restartTracker);
        tracker.on('error', this.restartTracker);
        return tracker;
    }

    private stopTracker(): void {
        if (this.tracker) {
            this.tracker.off('changeSet', this.onChangeSet);
            this.tracker.off('end', this.restartTracker);
            this.tracker.off('error', this.restartTracker);
            this.tracker.end();
            this.tracker = undefined;
        }
        this.tracker = undefined;
        this.initialized = false;
    }

    public getDevices(): GoogDeviceDescriptor[] {
        return Array.from(this.descriptors.values());
    }

    public getDevice(udid: string): Device | undefined {
        return this.deviceMap.get(udid);
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return `aDevice Tracker [${os.hostname()}]`;
    }

    public start(): Promise<void> {
        return this.init().catch((e) => {
            console.error(`Error: Failed to init "${this.getName()}". ${e.message}`);
        });
    }

    public release(): void {
        this.stopTracker();
    }

    public async runCommand(command: ControlCenterCommand): Promise<void> {
        const udid = command.getUdid();
        const device = this.getDevice(udid);
        const type = command.getType();
        if (!device && type !== ControlCenterCommand.ADB_CONNECT) {  // 允许在设备不存在时执行 ADB_CONNECT 命令
            console.error(`Device with udid:"${udid}" not found`);
            return;
        }
        const data = command.getData(); // 获取附加数据
        switch (type) {
            case ControlCenterCommand.KILL_SERVER:
                await device?.killServer(command.getPid());
                return;
            case ControlCenterCommand.START_SERVER:
                await device?.startServer();
                return;
            case ControlCenterCommand.UPDATE_INTERFACES:
                await device?.updateInterfaces();
                return;
            case ControlCenterCommand.ADB_CONNECT:  // ← 添加这个 case
                const ip = data?.ip;
                const port = data?.port || 5555;
                const deviceId = `${ip}:${port}`;                
                this.addDeviceToList(deviceId);
                
                if (!ip) {
                    console.error('IP address is required for ADB connect');
                    return;
                }
                try {
                    try {
                        await this.client.connect(ip, port);
                    } catch (err) {
                        // 如果两个参数方式失败，尝试连接字符串方式
                        await this.client.connect(`${ip}:${port}`);
                    }
                    console.log(`Successfully connected to ${ip}:${port}`);
                } catch (error) {
                    console.error(`Failed to connect to ${ip}:${port}`, error);
                    throw error;
                }
            default:
                throw new Error(`Unsupported command: "${type}"`);
        }
    }
}
