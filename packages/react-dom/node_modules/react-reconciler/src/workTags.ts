export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment;

// 函数类型节点
export const FunctionComponent = 0;
// 挂载的根节点
export const HostRoot = 3;
// 组件的根节点
export const HostComponent = 5;
//
export const HostText = 6;

export const Fragment = 7;
