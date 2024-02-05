import { Container, appendChildToContainer } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { MutationMask, NoFlags, Placement } from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './workTags';

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		// 向下遍历
		const child: FiberNode | null = nextEffect.child;
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			// 子节点存在，并且包含mutation阶段执行的操作
			nextEffect = child;
		} else {
			// 向上遍历
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
};

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flgs;
	if ((flags & Placement) !== NoFlags) {
		// 当前节点存在placement操作
		commitPlacement(finishedWork);
		// 将placement标记移除
		finishedWork.flgs &= ~Placement;
	}
	// 是否有Update
	// 是否有ChildDeletion
};

const commitPlacement = (finishedWork: FiberNode) => {
	// 找到父节点（插入到哪里）
	// 找到对应的节点
	if (__DEV__) {
		console.warn('执行Placement操作', finishedWork);
	}
	const hostParent = getHostParent(finishedWork);
	// 将dom插入到对应的节点中
	appendPlacementNodeIntoContainer(finishedWork, hostParent);
};

// 获取到当前节点的原生父节点
function getHostParent(fiber: FiberNode) {
	let parent = fiber.return;
	while (parent) {
		const parentTag = parent.tag;
		// HostComponent
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		}
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('未找到host parent');
	}
}

// 将当前节点和兄弟节点都执行对应的操作
function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		// 是HostComponent节点或text节点，就插入
		appendChildToContainer(finishedWork.stateNode, hostParent);
		return;
	}
	// 操作兄弟节点
	const child = finishedWork.child;
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent);
		let sibling = child.sibling;
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
