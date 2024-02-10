import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
// internals是数据共享层中shared的引入(指向的是react的数据共享层)
import internals from 'shared/internals';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

// 当前正在处理的fiber树（函数组件）
let currentlyRenderingFiber: FiberNode | null = null;
// 指向当前正在执行的hook
let workInProgressHook: Hook | null = null;

// 更新时用于获取hook数据的全局变量
let currentHook: Hook | null = null;

const { currentDispatcher } = internals;

interface Hook {
	// fiber中的memoizedState保存的是hook链表，而hook中的memoizedState是保存的对应的值
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}

export function renderWithHooks(wip: FiberNode) {
	// 赋值操作
	currentlyRenderingFiber = wip;
	// 重置
	wip.memoizedState = null;

	const current = wip.alternate;
	if (current !== null) {
		// update
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	// type表示函数组件
	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);

	// 重置操作
	currentlyRenderingFiber = null;

	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
};

function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前useState对应的Hook数据
	const hook = updateWorkInProgresHook();
	// 计算新state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>;
	const pending = queue.shared.pending;

	if (pending !== null) {
		const { memoizedState } = processUpdateQueue(hook.memoizedState, pending);
		hook.memoizedState = memoizedState;
	}

	return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function updateWorkInProgresHook(): Hook {
	// TODO: render阶段的更新
	let nextCurrentHook: Hook | null;
	if (currentHook === null) {
		// 这个时FC update时的第一个hook
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null) {
			nextCurrentHook = current?.memoizedState;
		} else {
			nextCurrentHook = null;
		}
	} else {
		// 这个FC update时后续的Hook
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook === null) {
		// hook的数量变了
		throw new Error(
			`组件${currentlyRenderingFiber?.type}本次执行时的Hook比上次执行的多`
		);
	}

	// 复用Hook
	currentHook = nextCurrentHook as Hook;
	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		updateQueue: currentHook.updateQueue,
		next: null
	};
	if (workInProgressHook === null) {
		// mount 并且是第一个hook
		if (currentlyRenderingFiber === null) {
			// 没有在函数组件内调用hook(当前指向的fiber树为null)
			throw new Error('请在函数组件内调用Hook');
		} else {
			workInProgressHook = newHook;
			// mount的第一个hook
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		}
	} else {
		// mount 后续的hook(使用链表的方式连接起来)
		workInProgressHook.next = newHook;
		// 更新hook的指向
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}

function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	// 找到当前useState对应的Hook数据
	const hook = mountWorkInProgresHook();
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}

	// dispatch可以触发更新，创建一个updateQueue
	const queue = createUpdateQueue<State>();
	hook.updateQueue = queue;
	hook.memoizedState = memoizedState;
	//@ts-ignore
	const dispatch = disPatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = dispatch;
	return [memoizedState, dispatch];
}

// 触发更新
function disPatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const update = createUpdate(action);
	enqueueUpdate(updateQueue, update);
	// 触发更新流程(scheduleUpdateOnFiber该函数会先找到根节点)
	scheduleUpdateOnFiber(fiber);
}

// 生成一个hook链表
function mountWorkInProgresHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null
	};
	if (workInProgressHook === null) {
		// mount 并且是第一个hook
		if (currentlyRenderingFiber === null) {
			// 没有在函数组件内调用hook(当前指向的fiber树为null)
			throw new Error('请在函数组件内调用Hook');
		} else {
			workInProgressHook = hook;
			// mount的第一个hook
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		}
	} else {
		// mount 后续的hook(使用链表的方式连接起来)
		workInProgressHook.next = hook;
		// 更新hook的指向
		workInProgressHook = hook;
	}
	return workInProgressHook;
}
