/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {callWindowGlobalFunction} from '../../utils/callWindowGlobalFunction';

describe('callWindowGlobalFunction', () => {
	beforeEach(() => {
		console.warn = jest.fn();
	});

	afterEach(() => {
		delete (window as any).myTestFn;
	});

	it('calls the passed function if it exists', () => {
		const mockFn = jest.fn();

		(window as any).myTestFn = mockFn;

		callWindowGlobalFunction('myTestFn');

		expect(mockFn).toHaveBeenCalled();

		mockFn.mockReset();
	});

	it('does not call the passed function if it is nonexistent', () => {
		expect(() => {
			callWindowGlobalFunction('nonExistentFn');
		}).not.toThrow();
	});
});
