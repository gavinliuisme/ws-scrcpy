function executeActions() {
    const checkExist = setInterval(() => {
        const button = document.querySelector('.control-button[title="Screen Power"]');
        if (button) {
            clearInterval(checkExist);
            button.click();
            const canvas = document.querySelector('.video');
            console.log('canvas', canvas);
            if(canvas){
                canvas.addEventListener('contextmenu', function(e) {
                    e.preventDefault(); // 阻止默认的右键菜单
                    clickElementCenter('.control-button[title="Back"]');
                });
            }
        }
        
    }, 100);
    setTimeout(() => {
        clearInterval(checkExist);
    }, 5000);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeActions);
} else {
    executeActions();
}

function clickElementCenter(selector) {
    const target = document.querySelector(selector);
    
    if (!target) {
        return;
    }

    // 获取位置
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const eventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y
    };

    // 依次触发 mousedown -> mouseup -> click
    target.dispatchEvent(new MouseEvent('mousedown', eventInit));
    target.dispatchEvent(new MouseEvent('mouseup', eventInit));
    target.dispatchEvent(new MouseEvent('click', eventInit));
}
console.log('ws_scrcpy.js loaded');
