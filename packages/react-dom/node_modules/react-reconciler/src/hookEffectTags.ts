// 用于指定是那种effect(effect分为三种：useEffect、useLayoutEffect、useInsertionEffect)
export const Passive = 0b0010; //表示useEffect

// 表示需要执行对应的effect
export const HookHasEffect = 0b0001;
