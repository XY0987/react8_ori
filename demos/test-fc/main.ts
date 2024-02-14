import {
	//同步更新
	unstable_ImmediatePriority as ImmediatePriority,
	// 点击事件之类的
	unstable_UserBlockingPriority as UserBlockingPriority,
	// 正常的优先级
	unstable_NormalPriority as NormalPriority,
	// 低优先级
	unstable_LowPriority as LowPriority,
	// 空闲优先级
	unstable_IdlePriority as IdlePriority,
	unstable_scheduleCallback as scheduleCallback,
	unstable_shouldYield as shouldYield,
	CallbackNode,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	unstable_cancelCallback as cancelCallback
} from 'scheduler';

import './style.css';

const button = document.querySelector('button');
const root = document.querySelector('#root');

type Priority =
	| typeof IdlePriority
	| typeof LowPriority
	| typeof NormalPriority
	| typeof UserBlockingPriority
	| typeof ImmediatePriority;

interface Work {
	count: number;
	priority: Priority;
}
const workList: Work[] = [];

// 用于保存上一次的优先级，如果新添加的任务和当前执行的任务优先级相同，就不用开启一个新的调度
let prevPriority: Priority = IdlePriority;
// 当前执行的回调函数
let curCallback: CallbackNode | null = null;

function schedule() {
	const cbNode = getFirstCallbackNode();
	// 找到优先级最高的
	const curWork = workList.sort((w1, w2) => {
		return w1.priority - w2.priority;
	})[0];

	if (!curWork) {
		curCallback = null;
		cbNode && cancelCallback(cbNode);
		return;
	}

	// 策略逻辑
	const { priority: curPriority } = curWork;

	if (curPriority === prevPriority) {
		return;
	}

	// 产生更高优先级的work,取消之前的，重新调度
	cbNode && cancelCallback(cbNode);

	curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}

// didTimeout表示是否过期，用于处理饥饿情况
function perform(work: Work, didTimeout?: boolean) {
	/* 
    while中断考虑的条件
    1. work的优先级（同步优先级不用中断）
    2. 处理饥饿问题
    3. 时间切片
    */
	// 是否要同步执行
	const needSync = work.priority === ImmediatePriority || didTimeout;
	while ((needSync || !shouldYield()) && work.count) {
		work.count--;
		insertSpan('0');
	}

	// 不一定是执行完了，可能是中断执行
	prevPriority = work.priority;
	if (!work.count) {
		const workIndex = workList.indexOf(work);
		workList.splice(workIndex, 1);
		prevPriority = IdlePriority;
	}

	const prevCallback = curCallback;
	schedule();
	const newCallback = curCallback;
	// 执行的函数是一致的，表示还是执行当前函数
	if (newCallback && newCallback === prevCallback) {
		return perform.bind(null, work);
	}
	// schedule();
}

function insertSpan(countent) {
	const span = document.createElement('span');
	span.innerText = countent;
	root?.appendChild(span);
}

[LowPriority, NormalPriority, UserBlockingPriority, ImmediatePriority].forEach(
	(priority) => {
		const btn = document.createElement('button');
		root?.appendChild(btn);
		btn.innerText = [
			'',
			'ImmediatePriority',
			'UserBlockingPriority',
			'NormalPriority',
			'LowPriority'
		][priority];
		btn.onclick = () => {
			workList.unshift({
				count: 100,
				priority: priority as Priority
			});
			schedule();
		};
	}
);

function doSomeBuzyWork(len: number) {
	let result = 0;
	while (len--) {
		result += len;
	}
}
