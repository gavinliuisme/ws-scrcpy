let savedPosition = localStorage.getItem('deviceViewPosition') || 'left';
setstyleProperty('--device-view', savedPosition);
setstyleProperty('--rotate-angle', savedPosition === 'right' ? '180deg' : '0deg');
const checkbgcolor = getComputedStyle(document.documentElement).getPropertyValue('--svg-checkbox-bg-color').trim();
setstyleProperty('--svg-checkbox-bg-color', "var(--svg-button-fill)");

function setstyleProperty(name, value) {
    document.documentElement.style.setProperty(name, value);
}

function executeActions() {
    const checkExist = setInterval(() => {
        const video = document.querySelector('.video');
        if (video && video.querySelector('video')?.src) {
            setstyleProperty('--svg-checkbox-bg-color', checkbgcolor);
            clearInterval(checkExist);
            document.querySelector('.control-button[title="Screen Power"]')?.click();
            video.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                clickElementCenter('.control-button[title="Back"]');
            });
            const alignbtn = document.querySelector('.control-button[title="Align"]');
            alignbtn?.addEventListener('click', function() {
                savedPosition = savedPosition === 'right' ? 'left' : 'right';
                setstyleProperty('--device-view', savedPosition);
                setstyleProperty('--rotate-angle', savedPosition === 'right' ? '180deg' : '0deg');
                localStorage.setItem('deviceViewPosition', savedPosition);
            });
        }        
    }, 50);
    setTimeout(() => {
        setstyleProperty('--svg-checkbox-bg-color', checkbgcolor);
        clearInterval(checkExist);
    }, 2000);
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
    target.dispatchEvent(new MouseEvent('mousedown', eventInit));
    target.dispatchEvent(new MouseEvent('mouseup', eventInit));
    target.dispatchEvent(new MouseEvent('click', eventInit));
}
