import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// function App() {
// 	const [num, setNum] = useState(100);
// 	// window.setNum = setNum;
// 	// return <div onClick={() => setNum(num + 1)}>{num}</div>;
// 	// return num == 3 ? <Child /> : <div>{num}</div>;
// 	const arr =
// 		num % 2 === 0
// 			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
// 			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];

// 	// return <ul onClickCapture={() => setNum(num + 1)}>{arr}</ul>;
// 	return (
// 		<ul
// 			onClickCapture={() => {
// 				setNum((num) => num + 1);
// 				setNum((num) => num + 1);
// 				setNum((num) => num + 1);
// 			}}
// 		>
// 			{num}
// 		</ul>
// 	);
// }

// function Child() {
// 	return <span>big-react</span>;
// }

// function App() {
// 	const [num, updateNum] = useState(0);
// 	useEffect(() => {
// 		console.log('App mount');
// 	}, []);

// 	useEffect(() => {
// 		console.log('num change create', num);
// 		return () => {
// 			console.log('num change destroy', num);
// 		};
// 	}, [num]);

// 	return (
// 		<div onClick={() => updateNum(num + 1)}>
// 			{num === 0 ? <Child /> : 'noop'}
// 		</div>
// 	);
// }

// function Child() {
// 	useEffect(() => {
// 		console.log('Child mount');
// 		return () => console.log('Child unmount');
// 	}, []);

// 	return 'i am child';
// }

function App() {
	const [num, update] = useState(100);
	return (
		<ul onClick={() => update(50)}>
			{new Array(num).fill(0).map((_, i) => {
				return <Child key={i}>{i}</Child>;
			})}
		</ul>
	);
}

function Child({ children }) {
	const now = performance.now();
	while (performance.now() - now < 4) {}
	return <li>{children}</li>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
