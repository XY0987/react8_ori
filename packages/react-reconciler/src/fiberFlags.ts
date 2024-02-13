export type Flags = number;

export const NoFlags = 0b0000000;
export const Placement = 0b0000001;
export const Update = 0b0000010;
export const ChildDeletion = 0b0000100;

// 当前fiber中触发effect的情况
export const PassiveEffect = 0b0001000;

export const MutationMask = Placement | Update | ChildDeletion;

// 表示触发effect的情况(ChildDeletion表示需要执行useEffect返回的函数)，用于标记fiber节点
export const PassiveMask = PassiveEffect | ChildDeletion;
