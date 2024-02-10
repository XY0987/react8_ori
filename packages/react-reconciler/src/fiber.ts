import { Props, Key, Ref, ReactElementType } from 'shared/ReactTypes';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	WorkTag
} from './workTags';
import { Flags, NoFlags } from './fiberFlags';
import { Container } from 'hostConfig';

/* 
协调器的工作方式：对于同一个节点，比较其React Element与FiberNode生成子fibrtnode
并根据比较的结果生成不同标记（插入、删除、移动....）
对应不同的宿主环境API执行 



JSX消费的顺序（采用DFS深度优先遍历的方式遍历React Element）
*/

export class FiberNode {
	tag: WorkTag;
	key: Key;
	stateNode: any;
	type: any;
	pendingProps: Props;

	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;

	ref: Ref;

	memoizedProps: Props | null;
	memoizedState: any;
	//两个FiberNode树切换的字段（current或workInProgress，用于切换两个树）
	alternate: FiberNode | null;
	// 保存对应的标记(删除、新增、更新...)
	flgs: Flags;
	subtreeFlags: Flags;

	updateQueue: unknown;
	deletions: FiberNode[] | null; //要删除的子节点

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag;
		this.key = key || null;
		// 如果是HostComponent 这个属性就相当于组件根节点的fiber
		this.stateNode = null;
		// 如果是FunctionComponent，它对应的就是函数本身
		this.type = null;

		// 定义一些字段用来保存节点之间的关系
		this.return = null; //指向父FiberNode
		this.sibling = null; //指向兄弟FiberNode
		this.child = null; //指向子节点的FiberNode
		this.index = 0; //同级的可能有多个节点用于表示第几个

		this.ref = null;

		// 作为工作单元
		this.pendingProps = pendingProps; //刚开始的时候Props是什么
		this.memoizedState = null;
		this.memoizedProps = null; //工作完成之后它的Props是什么
		this.updateQueue = null;

		// 双缓冲对应的fiberNode树
		this.alternate = null;

		// 副作用
		this.flgs = NoFlags;
		this.subtreeFlags = NoFlags; //用于标记子树是否有标记
		this.deletions = null;
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		// 当前为HostComponent,指向自身
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
	}
}

// 创建双缓存树
export const createWorkInProgress = (
	current: FiberNode,
	pendingProps: Props
): FiberNode => {
	let wip = current.alternate;
	// 首次渲染时是null
	if (wip === null) {
		// mount
		wip = new FiberNode(current.tag, pendingProps, current.key);
		wip.stateNode = current.stateNode;

		wip.alternate = current;
		current.alternate = wip;
	} else {
		//update
		wip.pendingProps = pendingProps;
		// 清除副作用
		wip.flgs = NoFlags;
		wip.subtreeFlags = NoFlags;
		wip.deletions = null;
	}
	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memoizedState = current.memoizedState;
	wip.memoizedProps = current.memoizedProps;

	return wip;
};
// 根据ReactElement（jsx方法调用创建的）元素类型创建对应的fiber树
export function createFiberFromElement(element: ReactElementType): FiberNode {
	const { type, key, props } = element;
	let fiberTag: WorkTag = FunctionComponent;
	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的type类型', element);
	}

	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragment, elements, key);
	return fiber;
}
