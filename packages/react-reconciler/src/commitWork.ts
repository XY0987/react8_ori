import {
	Container,
	appendChildToContainer,
	commitUpdate,
	removeChild
} from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placement,
	Update
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';

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
	if ((flags & Update) !== NoFlags) {
		// 当前节点存在Update操作
		commitUpdate(finishedWork);
		// 将Update标记移除
		finishedWork.flgs &= ~Update;
	}
	// 是否有ChildDeletion
	if ((flags & ChildDeletion) !== NoFlags) {
		// 当前节点存在ChildDeletion操作
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			// 遍历数组执行删除操作
			deletions.forEach((childToDelete) => {
				commitDeletion(childToDelete);
			});
		}
		// 将ChildDeletion标记移除
		finishedWork.flgs &= ~ChildDeletion;
	}
};

// 递归处理，根据不同类型进行额外的处理
function commitDeletion(childToDelete: FiberNode) {
	let rootHostNode: FiberNode | null = null;
	// 递归子树
	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber;
				}
				// TODO: 解绑ref
				return;
			case HostText:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber;
				}
				return;
			case FunctionComponent:
				// TODO: useEffect unmount的处理
				return;
			default:
				if (__DEV__) {
					console.warn('未处理的unmount类型');
				}
				break;
		}
	});
	// 移除真实DOM
	if (rootHostNode !== null) {
		const hostParent = getHostParent(childToDelete);
		if (hostParent !== null) {
			removeChild((rootHostNode as FiberNode).stateNode, hostParent);
		}
	}
	// 删除之后重置标记
	childToDelete.return = null;
	childToDelete.child = null;
}

// 接收当前的一个节点和一个回调函数
function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void
) {
	let node = root;
	while (true) {
		onCommitUnmount(node);
		if (node.child !== null) {
			// 向下遍历
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === root) {
			// 终止条件
			return;
		}
		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}
			// 向上归
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

const commitPlacement = (finishedWork: FiberNode) => {
	// 找到父节点（插入到哪里）
	// 找到对应的节点
	if (__DEV__) {
		console.warn('执行Placement操作', finishedWork);
	}
	const hostParent = getHostParent(finishedWork);
	// 将dom插入到对应的节点中
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
};

// 获取到当前节点的原生父节点
function getHostParent(fiber: FiberNode): Container | null {
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
	return null;
}

// 将当前节点和兄弟节点都执行对应的操作
function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		// 是HostComponent节点或text节点，就插入
		appendChildToContainer(hostParent, finishedWork.stateNode);
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
