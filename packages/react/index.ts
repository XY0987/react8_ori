import currentBatchConfig from './src/currentBatchConfig';
import { Dispatcher, resolveDispatcher } from './src/currentDispatcher';

import currentDispatcher from './src/currentDispatcher';

import { jsx, isValidElement as isValidElementFn } from './src/jsx';

export { createContext } from './src/context';

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useEffect(create, deps);
};

// 改变优先级
export const useTransition: Dispatcher['useTransition'] = () => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useTransition();
};

export const useRef: Dispatcher['useRef'] = (initialValue) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useRef(initialValue);
};

export const useContext: Dispatcher['useContext'] = (context) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useContext(context);
};

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FAIL = {
	currentDispatcher,
	currentBatchConfig
};

export const version = '0.0.0';

export const createElement = jsx;

export const isValidElement = isValidElementFn;
