import { FiberRootNode } from './fiber';

export type Lane = number;
export type Lanes = number;

// 值越小，优先级越高,0除外
export const SyncLane = 0b001;
export const NoLane = 0b000;

export const NoLanes = 0b000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}

export function requestUpdateLane() {
	return SyncLane;
}

// 返回最高的优先级（最小的值）
export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}
