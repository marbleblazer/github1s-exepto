/**
 * @file Status bar
 */

import { updateCheckoutTo } from './checkout';

export const decorateStatusBar = () => {
	updateCheckoutTo();
};
