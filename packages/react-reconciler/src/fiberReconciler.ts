import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate
} from './updateQueue';
import { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { requestUpdateLane } from './fiberLanes';

// 调用ReactDOM.createRoot时会调用该函数,创建根节点，并连接相关节点
export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	// 创建一个更新队列
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}
// 调用render的时候会调用该函数
export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	const hostRootFiber = root.current;
	const lane = requestUpdateLane();
	// 首屏渲染(创建update)
	const update = createUpdate<ReactElementType | null>(element, lane);
	// 将创建的uodate添加到队列中
	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
		update
	);
	scheduleUpdateOnFiber(hostRootFiber, lane);
	return element;
}
