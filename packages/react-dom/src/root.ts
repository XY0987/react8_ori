import { ReactElementType } from './../../shared/ReactTypes';
// ReactDom.createRoot(root).render(<App/>)

import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';
import { Container } from './hostConfig';

// export function createRoot(container: Container) {
// 	const root = createContainer(container);
// 	return {
// 		render(element: ReactElementType) {
// 			return updateContainer(element, root);
// 		}
// 	};
// }

export function createRoot(container: Container) {
	const root = createContainer(container);
	return {
		render(element: ReactElementType) {
			return updateContainer(element, root);
		}
	};
}
