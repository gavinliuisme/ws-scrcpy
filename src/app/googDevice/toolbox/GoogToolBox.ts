import { ToolBox } from '../../toolbox/ToolBox';
import KeyEvent from '../android/KeyEvent';
import SvgImage from '../../ui/SvgImage';
import { KeyCodeControlMessage } from '../../controlMessage/KeyCodeControlMessage';
import { ToolBoxButton } from '../../toolbox/ToolBoxButton';
import { ToolBoxElement } from '../../toolbox/ToolBoxElement';
import { ToolBoxCheckbox } from '../../toolbox/ToolBoxCheckbox';
import { StreamClientScrcpy } from '../client/StreamClientScrcpy';
import { BasePlayer } from '../../player/BasePlayer';
import { CommandControlMessage } from '../../controlMessage/CommandControlMessage';
import VideoSettings from '../../VideoSettings';
import Size from '../../Size';

const BUTTONS = [
    {
        title: 'Power',
        code: KeyEvent.KEYCODE_POWER,
        icon: SvgImage.Icon.POWER,
    },
    {
        title: 'Volume up',
        code: KeyEvent.KEYCODE_VOLUME_UP,
        icon: SvgImage.Icon.VOLUME_UP,
    },
    {
        title: 'Volume down',
        code: KeyEvent.KEYCODE_VOLUME_DOWN,
        icon: SvgImage.Icon.VOLUME_DOWN,
    },
    {
        title: 'Back',
        code: KeyEvent.KEYCODE_BACK,
        icon: SvgImage.Icon.BACK,
    },
    {
        title: 'Home',
        code: KeyEvent.KEYCODE_HOME,
        icon: SvgImage.Icon.HOME,
    },
    {
        title: 'Overview',
        code: KeyEvent.KEYCODE_APP_SWITCH,
        icon: SvgImage.Icon.OVERVIEW,
    },
];

export class GoogToolBox extends ToolBox {
    protected constructor(list: ToolBoxElement<any>[]) {
        super(list);
    }

    public static createToolBox(
        udid: string,
        player: BasePlayer,
        client: StreamClientScrcpy,
        moreBox?: HTMLElement,
    ): GoogToolBox {
        const playerName = player.getName();
        const list = BUTTONS.slice();
        const handler = <K extends keyof HTMLElementEventMap, T extends HTMLElement>(
            type: K,
            element: ToolBoxElement<T>,
        ) => {
            if (!element.optional?.code) {
                return;
            }
            const { code } = element.optional;
            const action = type === 'mousedown' ? KeyEvent.ACTION_DOWN : KeyEvent.ACTION_UP;
            const event = new KeyCodeControlMessage(action, code, 0, 0);
            client.sendMessage(event);
        };
        const elements: ToolBoxElement<any>[] = list.map((item) => {
            const button = new ToolBoxButton(item.title, item.icon, {
                code: item.code,
            });
            button.addEventListener('mousedown', handler);
            button.addEventListener('mouseup', handler);
            return button;
        });
        if (player.supportsScreenshot) {
            const screenshot = new ToolBoxButton('Take screenshot', SvgImage.Icon.CAMERA);
            screenshot.addEventListener('click', () => {
                player.createScreenshot(client.getDeviceName());
            });
            elements.push(screenshot);
        }

        const keyboard = new ToolBoxCheckbox(
            'Capture keyboard',
            SvgImage.Icon.KEYBOARD,
            `capture_keyboard_${udid}_${playerName}`,
        );
        keyboard.addEventListener('click', (_, el) => {
            const element = el.getElement();
            client.setHandleKeyboardEvents(element.checked);
        });
        elements.push(keyboard);
        
        const screenpower = new ToolBoxCheckbox('Screen Power', SvgImage.Icon.SCREENPOWER);
        screenpower.addEventListener('click', (_, el) => {
            client.sendMessage(CommandControlMessage.createSetScreenPowerModeCommand(el.getElement().checked));
        });
        elements.push(screenpower);
        
        const createAlignButton = (): ToolBoxButton => {
            const button = new ToolBoxButton('Align', SvgImage.Icon.ALIGNRIGHT);
            const buttonElement = button.getElement();
            const displayId = player.getVideoSettings().displayId;
            const alignKey = `device_align_${udid}_${displayId}`;
            
            buttonElement.style.transformOrigin = 'center';
            buttonElement.style.transition = 'transform 0.3s ease';
            
            // 读取初始状态
            let isAlignedRight = localStorage.getItem(alignKey) === 'true';
            
            // 应用初始状态
            buttonElement.style.transform = isAlignedRight ? 'rotateY(0deg)' : 'rotateY(180deg)';
            document.documentElement.style.setProperty('--device-view', isAlignedRight ? "left" : "right");
            
            button.addEventListener('click', () => {
                isAlignedRight = !isAlignedRight;
                
                // 保存状态
                localStorage.setItem(alignKey, String(isAlignedRight));
                
                // 更新 UI
                buttonElement.style.transform = isAlignedRight ? 'rotateY(0deg)' : 'rotateY(180deg)';
                document.documentElement.style.setProperty('--device-view', isAlignedRight ? "left" : "right");
            });
            
            return button;
        };
         
        // 靠左靠右
        const alignRight = createAlignButton();
        elements.push(alignRight);

        // 最大化
        const maximize = new ToolBoxButton(
            'Maximize video',
            SvgImage.Icon.ALIGNRIGHT,
        );        
        maximize.addEventListener('click', () => {
            const maxSize = client.getMaxSize();
            if (maxSize) {
                const currentSettings = player.getVideoSettings();
                const newSettings = VideoSettings.copy(currentSettings);
                Object.assign(newSettings, { bounds: new Size(maxSize.width, maxSize.height) });
                player.setVideoSettings(newSettings, false, true);
                client.sendNewVideoSetting(newSettings);
            }
        });
        elements.push(maximize);
        
        if (moreBox) {
            const displayId = player.getVideoSettings().displayId;
            const id = `show_more_${udid}_${playerName}_${displayId}`;
            const more = new ToolBoxCheckbox('More', SvgImage.Icon.MORE, id);
            more.addEventListener('click', (_, el) => {
                const element = el.getElement();
                moreBox.style.display = element.checked ? 'block' : 'none';
            });
            elements.unshift(more);
        }
        return new GoogToolBox(elements);
    }
}
