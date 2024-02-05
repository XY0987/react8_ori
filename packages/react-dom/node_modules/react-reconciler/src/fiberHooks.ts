import { FiberNode } from './fiber';

export function renderWithHooks(wip: FiberNode) {
	// type表示函数组件
	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);
	return children;
}
