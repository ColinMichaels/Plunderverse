// src/lib/input/InputRouter.ts

export const INPUT_KEY_EVENT = 'pv.input.key';
export const INPUT_POINTER_EVENT = 'pv.input.pointer';

export class InputRouter {
    private static _instance: InputRouter | null = null;
    private attached = false;

    static instance(): InputRouter {
        if (!InputRouter._instance) InputRouter._instance = new InputRouter();
        return InputRouter._instance;
    }

    attach() {
        if (this.attached || typeof window === 'undefined') return;
        this.attached = true;

        // Re-broadcast keydown as a cancelable CustomEvent
        window.addEventListener(
            'keydown',
            (e) => {
                const evt = new CustomEvent(INPUT_KEY_EVENT, {
                    detail: {
                        key: e.key,
                        code: e.code,
                        altKey: e.altKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        domEvent: e,
                    },
                    cancelable: true,
                });
                const notCancelled = window.dispatchEvent(evt);
                if (!notCancelled) {
                    try {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    } catch {
                    }
                }
            },
            true
        );

        // Re-broadcast pointer interactions
        const pointerHandler = (type: string) => (e: MouseEvent) => {
            const evt = new CustomEvent(INPUT_POINTER_EVENT, {
                detail: {type, x: e.clientX, y: e.clientY, button: e.button, domEvent: e},
                cancelable: true,
            });
            const notCancelled = window.dispatchEvent(evt);
            if (!notCancelled) {
                try {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                } catch {
                }
            }
        };

        window.addEventListener('mousedown', pointerHandler('mousedown'), true);
        window.addEventListener('click', pointerHandler('click'), true);
    }
}
