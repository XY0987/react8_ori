import { beginWork } from './beginWork';
import { commitMutationEffects } from './commitWork';
import { completeWork } from './completeWork';
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { MutationMask, NoFlags } from './fiberFlags';
import { HostRoot } from './workTags';

// 定义一个指针，指向当前正在工作的fiber树
let workInProgress: FiberNode | null;
// 用于初始化的操作
function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorkInProgress(root.current, {});
}

/* 
用于连接container方法和renderRoot方法
在fiber中调度update
*/
export function scheduleUpdateOnFiber(fiber: FiberNode) {
	// 调度功能
	// fiberRootNode
	const root = markUpdateFromFiberToRoot(fiber);
	// 更新流程
	renderRoot(root);
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

// 渲染根节点
function renderRoot(root: FiberRootNode) {
	// 初始化
	prepareFreshStack(root);
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
	// wip finberNode树，树中的flags,执行具体的flags
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
	// 重置
	root.finishedWork = null;
	// 判断是否存在3个子阶段需要执行的操作
	// 判断root flags root subtreeFlags
	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;

	const rootHasEffect = (finishedWork.flgs & MutationMask) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		// beforeMutation阶段
		// mutation阶段

		commitMutationEffects(finishedWork);
		root.current = finishedWork; //切换双缓冲树

		// layout阶段
	} else {
		root.current = finishedWork;
	}
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
	const next = beginWork(fiber);
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
