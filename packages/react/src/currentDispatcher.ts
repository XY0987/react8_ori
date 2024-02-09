/* 
数据共享层,获取到当前的hooks集合
*/

import { Action } from 'shared/ReactTypes';

export interface Dispatcher {
	useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>];
}

export type Dispatch<State> = (action: Action<State>) => void;

const currentDispatcher: { current: Dispatcher | null } = {
	current: null
};

// 用于方便的获取到dispatcher
export const resolveDispatcher = (): Dispatcher => {
	const dispatcher = currentDispatcher.current;
	// dispatcher的值是null的话，表明没有再函数上下文中执行
	if (dispatcher === null) {
		throw new Error('hook只能再函数组件中执行');
	}
	return dispatcher;
};

export default currentDispatcher;
