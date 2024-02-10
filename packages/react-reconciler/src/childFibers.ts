import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createFiberFromElement,
	createWorkInProgress
} from './fiber';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostText } from './workTags';
import { ChildDeletion, Placement } from './fiberFlags';

// shouldTrackEffects是否追踪副作用
function ChildReconciler(shouldTrackEffects: boolean) {
	// 删除旧的节点
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		// 不需要追踪副作用
		if (!shouldTrackEffects) {
			return;
		}
		// 需要追踪副作用
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDelete];
			// 未要删除的父节点添加删除标记
			returnFiber.flgs |= ChildDeletion;
		} else {
			deletions.push(childToDelete);
		}
	}

	function reconcileSingElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		// 尝试复用Fiber
		const key = element.key;
		work: if (currentFiber !== null) {
			// update
			if (currentFiber.key === key) {
				// key相同，比较type
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						//type相同
						const existing = useFiber(currentFiber, element.props);
						// 更新子项
						existing.return = returnFiber;
						return existing;
					}
					// 类型不同，删掉旧的
					deleteChild(returnFiber, currentFiber);
					break work;
				} else {
					if (__DEV__) {
						console.warn('还未实现的react类型', element);
						break work;
					}
				}
			} else {
				// key不同，删掉旧的
				deleteChild(returnFiber, currentFiber);
			}
		}
		// 根据element创建fiber
		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileSingTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		if (currentFiber !== null) {
			// update
			if (currentFiber.tag === HostText) {
				// 类型没有变，可以复用
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				return existing;
			}
			//
			deleteChild(returnFiber, currentFiber);
		}
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	// 追踪副作用
	function placeSingleChild(fiber: FiberNode) {
		// 性能优化，首屏渲染的情况
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flgs |= Placement;
		}
		return fiber;
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		// 判断当前fiber类型
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('未实现的reconcile类型', newChild);
					}
					break;
			}
		}
		// 多节点的情况

		// HostText情况
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingTextNode(returnFiber, currentFiber, newChild)
			);
		}

		if (currentFiber !== null) {
			// 兜底的情况，标记删除
			deleteChild(returnFiber, currentFiber);
		}

		if (__DEV__) {
			console.warn('未实现的reconcile类型', newChild);
		}
		return null;
	};
}

// 复用fiber
function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	// 创建复用节点
	const clone = createWorkInProgress(fiber, pendingProps);
	// 只处理了单节点的情况
	clone.index = 0;
	clone.sibling = null;
	return clone;
}

export const reconcileChildFibers = ChildReconciler(true);

// 对节点进行标记处理
export const mountcileChildFibers = ChildReconciler(false);
