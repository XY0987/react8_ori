// 需要调度的函数的数组
let syncQueue: ((...args: any) => void)[] | null = null;

// 当前是否正在调度
let isFlushingSyncQueue: boolean = false;

export function scheduleSyncCallback(callback: (...args: any) => void) {
	if (syncQueue === null) {
		syncQueue = [callback];
	} else {
		syncQueue.push(callback);
	}
}

export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true;
		try {
			syncQueue.forEach((callback) => callback());
		} catch (error) {
			if (__DEV__) {
				console.warn('flushSyncCallbacks出错了', error);
			}
		} finally {
			isFlushingSyncQueue = false;
			syncQueue = null;
		}
	}
}
