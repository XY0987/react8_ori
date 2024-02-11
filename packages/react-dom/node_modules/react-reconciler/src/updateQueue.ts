import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLanes';

export interface Update<State> {
	action: Action<State>;
	lane: Lane;
	next: Update<any> | null;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	// dispatch用于hook的更新
	dispatch: Dispatch<State> | null;
}

// 创建update
export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return {
		action,
		lane,
		next: null
	};
};

// 创建updateQueue
export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<State>;
};

// 往updateQueue添加update
export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	// 这种是覆盖操作，多次调用每次都会重新赋值
	// updateQueue.shared.pending = update;
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		// 会形成一个环状链表,a->a
		update.next = update;
	} else {
		// b.next=b
		update.next = pending.next;
		// a.next=b
		pending.next = update;
	}
	// pending=b=>a=>b
	updateQueue.shared.pending = update;
};

// 消费upodate的方法
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	};
	if (pendingUpdate !== null) {
		// 第一个update
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;
		do {
			const updateLane = pending.lane;
			if (updateLane === renderLane) {
				// 传递的一种是值，另一种是一个函数
				const action = pending.action;
				if (action instanceof Function) {
					/* 
					setState传函数和传值不同的点就在这里，多次更新传函数时
					baseState的值一直都会改变，而传值时只会赋值
					*/
					baseState = action(baseState);
				} else {
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.error('不应该进入');
				}
			}
			pending = pending?.next as Update<any>;
		} while (pending !== first);
	}
	result.memoizedState = baseState;
	return result;
};
