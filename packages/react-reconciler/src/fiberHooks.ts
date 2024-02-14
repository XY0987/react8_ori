import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
// internals是数据共享层中shared的引入(指向的是react的数据共享层)
import internals from 'shared/internals';
import currentBatchConfig from 'react/src/currentBatchConfig';
import {
	Update,
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue
} from './updateQueue';
import { Action, ReactContext } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLane } from './fiberLanes';
import { Flags, PassiveEffect } from './fiberFlags';
import { HookHasEffect, Passive } from './hookEffectTags';

// 当前正在处理的fiber树（函数组件）
let currentlyRenderingFiber: FiberNode | null = null;
// 指向当前正在执行的hook
let workInProgressHook: Hook | null = null;

// 更新时用于获取hook数据的全局变量
let currentHook: Hook | null = null;

const { currentDispatcher } = internals;

let renderLane: Lane = NoLane;
interface Hook {
	// fiber中的memoizedState保存的是hook链表，而hook中的memoizedState是保存的对应的值
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
	baseState: any;
	baseQueue: Update<any> | null;
}

/* 
除了hook会形成一个链表，为了更好的遍历
useEffect也会单独形成一个链表
这里的next字段指向的是下一个effect
而hook中的next字段指向的是下一个hook
*/
export interface Effect {
	tag: Flags;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	// 指向effect链表中的最后一个
	lastEffect: Effect | null;
}

type EffectCallback = () => void;

type EffectDeps = any[] | null;

export function renderWithHooks(wip: FiberNode, lane: Lane) {
	// 赋值操作
	currentlyRenderingFiber = wip;
	// 重置hooks链表
	wip.memoizedState = null;
	// 重置effect链表
	wip.updateQueue = null;
	renderLane = lane;

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
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;

	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect,
	useTransition: mountTransition,
	useRef: mountRef,
	useContext: readContext
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
	useTransition: updateTransition,
	useRef: updateRef,
	useContext: readContext
};

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	// 找到第一个hook
	const hook = mountWorkInProgresHook();
	const nextDeps = deps === undefined ? null : deps;
	// mount需要执行回调
	(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
	hook.memoizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	// 找到第一个hook
	const hook = updateWorkInProgresHook();
	const nextDeps = deps === undefined ? null : deps;
	let destroy: EffectCallback | void;
	if (currentHook !== null) {
		const prevEffect = currentHook.memoizedState as Effect;
		destroy = prevEffect.destroy;
		if (nextDeps !== null) {
			// 进行浅比较依赖
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				// 依赖值没有改变
				hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
				return;
			}
		}
		(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
		hook.memoizedState = pushEffect(
			Passive | HookHasEffect,
			create,
			destroy,
			nextDeps
		);
	}
}

// 比较依赖值是否改变，返回false表示改变了
function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
	if (prevDeps === null || nextDeps === null) {
		return false;
	}
	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (Object.is(prevDeps[i], nextDeps[i])) {
			continue;
		}
		return false;
	}
	return true;
}

// function pushEffect(
// 	hookFlags: Flags,
// 	create: EffectCallback | void,
// 	destroy: EffectCallback | void,
// 	deps: EffectDeps
// ): Effect {
// 	const effect: Effect = {
// 		tag: hookFlags,
// 		create,
// 		destroy,
// 		deps,
// 		next: null
// 	};
// 	const fiber = currentlyRenderingFiber as FiberNode;
// 	// useEffect的链表保存在fiber的updateQueue
// 	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
// 	if (updateQueue === null) {
// 		const updateQueue = createFCUpdateQueue();
// 		fiber.updateQueue = updateQueue;
// 		// next指向自己，形成环状链表
// 		effect.next = effect;
// 		updateQueue.lastEffect = effect;
// 	} else {
// 		// 插入effect操作
// 		const lastEffect = updateQueue.lastEffect;
// 		if (lastEffect === null) {
// 			effect.next = effect;
// 			updateQueue.lastEffect = effect;
// 		} else {
// 			const firstEffect = lastEffect.next;
// 			lastEffect.next = effect;
// 			effect.next = firstEffect;
// 			updateQueue.lastEffect = effect;
// 		}
// 	}
// 	console.log(effect);

// 	return effect;
// }

function pushEffect(
	hookFlags: Flags,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag: hookFlags,
		create,
		destroy,
		deps,
		next: null
	};
	const fiber = currentlyRenderingFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue === null) {
		const updateQueue = createFCUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		// 插入effect
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}

function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}

function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前useState对应的Hook数据
	const hook = updateWorkInProgresHook();
	// 计算新state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>;

	const baseState = hook.baseState;

	const pending = queue.shared.pending;

	const current = currentHook as Hook;
	let baseQueue = current.baseQueue;

	// 将pending置空, 这里因为更新可能被中断，所以不能直接赋值为null
	// queue.shared.pending = null;

	if (pending !== null) {
		// pending baseQueue update保存在current中
		if (baseQueue !== null) {
			const baseFirst = baseQueue.next;
			const pengdingFirst = pending.next;
			baseQueue.next = pengdingFirst;
			pending.next = baseFirst;
		}
		baseQueue = pending;
		// 保存在current中
		current.baseQueue = pending;
		queue.shared.pending = null;
	}
	if (baseQueue !== null) {
		const {
			memoizedState,
			baseQueue: newBaseQueue,
			baseState: newBaseState
		} = processUpdateQueue(baseState, baseQueue, renderLane);
		hook.memoizedState = memoizedState;
		hook.baseState = newBaseState;
		hook.baseQueue = newBaseQueue;
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
		next: null,
		baseQueue: currentHook.baseQueue,
		baseState: currentHook.baseState
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
	hook.baseState = memoizedState;

	//@ts-ignore
	const dispatch = disPatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = dispatch;
	return [memoizedState, dispatch];
}

// 返回第一个参数是是否在更新中，第二个是一个函数
function mountTransition(): [boolean, (callback: () => void) => void] {
	const [isPending, setPending] = mountState(false);
	const hook = mountWorkInProgresHook();
	const start = startTransition.bind(null, setPending);
	hook.memoizedState = start;
	return [isPending, start];
}

function updateTransition(): [boolean, (callback: () => void) => void] {
	const [isPending] = updateState();
	const hook = updateWorkInProgresHook();
	const start = hook.memoizedState;
	return [isPending as boolean, start];
}
/* 
setPenging本质是创建一个update
*/
function startTransition(setPenging: Dispatch<boolean>, callback: () => void) {
	// 触发一个优先级
	setPenging(true);
	const prevTransition = currentBatchConfig.transition;
	currentBatchConfig.transition = 1;
	// 触发另一个优先级,currentBatchConfig.transition不为null
	callback();
	setPenging(false);
	currentBatchConfig.transition = prevTransition;
}

function mountRef<T>(initialValue: T): { current: T } {
	const hook = mountWorkInProgresHook();
	const ref = { current: initialValue };
	hook.memoizedState = ref;
	return ref;
}

function updateRef<T>(): { current: T } {
	const hook = updateWorkInProgresHook();
	return hook.memoizedState;
}

// 触发更新
function disPatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);
	enqueueUpdate(updateQueue, update);
	// 触发更新流程(scheduleUpdateOnFiber该函数会先找到根节点)
	scheduleUpdateOnFiber(fiber, lane);
}

// 生成一个hook链表
function mountWorkInProgresHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null,
		baseState: null,
		baseQueue: null
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

function readContext<T>(context: ReactContext<T>): T {
	const consumer = currentlyRenderingFiber;
	if (consumer === null) {
		// 脱离了函数组件
		throw new Error('只能在函数组件中调用');
	}
	const value = context._currentValue;
	return value;
}
