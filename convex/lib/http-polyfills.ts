if (!('MessageChannel' in globalThis)) {
    class MockMessagePort {
        onmessage: ((ev: MessageEvent) => void) | undefined;
        onmessageerror: ((ev: MessageEvent) => void) | undefined;

        addEventListener() {}
        close() {}

        dispatchEvent(_event: Event): boolean {
            return false;
        }

        postMessage(_message: string | object | null, _transfer: Transferable[] = []) {}
        removeEventListener() {}
        start() {}
    }

    class MockMessageChannel {
        port1: MockMessagePort;
        port2: MockMessagePort;

        constructor() {
            this.port1 = new MockMessagePort();
            this.port2 = new MockMessagePort();
        }
    }

    Object.assign(globalThis, { MessageChannel: MockMessageChannel });
}
