import { scheduleMicroTask } from 'hostConfig';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWork';
import { completeWork } from './completeWork';
import {
	FiberNode,
	FiberRootNode,
	createWorkInProgress,
	PendingPassiveEffects
} from './fiber';
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags';
import {
	Lane,
	NoLane,
	SyncLane,
	getHighestPriorityLane,
	markRootFinished,
	mergeLanes
} from './fiberLanes';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';

import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

// 定义一个指针，指向当前正在工作的fiber树
let workInProgress: FiberNode | null;
// 本次更新的lane是什么
let wipRootRenderLane: Lane = NoLane;

// 定义一个变量，避免重复调用effect
let rootDoesHasPassiveEffects: boolean = false;

// 用于初始化的操作
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLane = lane;
}

/* 
用于连接container方法和renderRoot方法
在fiber中调度update
*/
export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// console.log('调度的fiber', fiber);
	// 调度功能
	// fiberRootNode
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdated(root, lane);
	// 更新流程
	// renderRoot(root);
	ensureRootIsSchedule(root);
}

// schedule阶段入口
function ensureRootIsSchedule(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	if (updateLane === NoLane) {
		// 当前没有更新
		return;
	}
	if (updateLane === SyncLane) {
		// 同步优先级,微任务调度
		if (__DEV__) {
			console.log('在微任务中调度，优先级:', updateLane);
		}
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		/* 
		当我们连续执行三次更新，由于有一个全局的变量，所以不会重复调度
		*/
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// 其他优先级，用宏任务调度
	}
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

// 找到根节点
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}

// 渲染根节点(同步更新的入口)
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	/* 
	连续更新大于三次时，虽然不会重复调度，但是该函数会被执行三次，所以在加一些判断，避免掉
	*/
	const nextLane = getHighestPriorityLane(root.pendingLanes);
	if (nextLane !== SyncLane) {
		ensureRootIsSchedule(root);
		return;
	}
	// 初始化
	prepareFreshStack(root, lane);
	do {
		try {
			workLoop();
			break;
		} catch (error) {
			if (__DEV__) {
				console.warn('workLoop发送错误', error);
			}
			workInProgress = null;
		}
	} while (true);
	// 该树中包含了部分依赖标记
	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	root.finishedLane = lane;
	// wip finberNode树，树中的flags,执行具体的flags
	// 重置优先级
	wipRootRenderLane = NoLane;

	commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
	// 表示有标记的fiber树
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		// commit阶段不存在
		return;
	}
	if (__DEV__) {
		console.warn('commit阶段开始', finishedWork);
	}

	const lane = root.finishedLane;

	if (lane === NoLane && __DEV__) {
		console.warn('commit阶段finishedLane不应该是NoLane');
	}

	// 重置
	root.finishedWork = null;
	root.finishedLane = NoLane;

	// 移除已经完成的lane
	markRootFinished(root, lane);

	// 判断是否要执行effect
	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		// 防止多次触发调度时，多次执行该操作
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			// 调度副作用
			scheduleCallback(NormalPriority, () => {
				console.log('root.pendingPassiveEffects', root.pendingPassiveEffects);
				// 执行副作用
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}

	// 判断是否存在3个子阶段需要执行的操作
	// 判断root flags root subtreeFlags
	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;

	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		// beforeMutation阶段
		// mutation阶段

		commitMutationEffects(finishedWork, root);
		root.current = finishedWork; //切换双缓冲树
		// layout阶段
	} else {
		root.current = finishedWork;
	}

	rootDoesHasPassiveEffects = false;
	ensureRootIsSchedule(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	console.log(pendingPassiveEffects);

	// 先执行destroy回调
	pendingPassiveEffects.unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];
	// 防止执行依赖过程还有更新
	flushSyncCallbacks();
}

// 执行调度(入口方法)
function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

// 递阶段
function performUnitOfWork(fiber: FiberNode) {
	// 可能是fiber的子fiber也可能是null
	const next = beginWork(fiber, wipRootRenderLane);
	fiber.memoizedProps = fiber.pendingProps;
	if (next === null) {
		// 没有子fiber了，开始执行归
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}

// 执行归阶段
function completeUnitOfWork(fiber: FiberNode) {
	// 如果有子节点就遍历子节点，没有子节点，就遍历兄弟节点
	let node: FiberNode | null = fiber;
	do {
		completeWork(node);
		const sibling = node.sibling;
		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}
		node = node.return;
		workInProgress = node;
	} while (node !== null);
}
