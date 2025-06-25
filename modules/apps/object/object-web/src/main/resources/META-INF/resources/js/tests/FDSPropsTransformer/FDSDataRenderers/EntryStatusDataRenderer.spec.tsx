/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen, waitFor} from '@testing-library/react';
import mockFetch from 'jest-fetch-mock';
import React from 'react';

import EntryStatusDataRenderer from '../../../components/FDSPropsTransformer/FDSDataRenderers/EntryStatusDataRenderer';

jest.mock('frontend-js-web', () => {
	const actual = jest.requireActual('frontend-js-web');

	return {
		...actual,
		fetch: mockFetch,
		sub: (str: string, arg: string) => str.replace('x', arg),
	};
});
beforeEach(() => {
	global.Liferay = {
		FeatureFlags: {'LPD-17564': true},
		Language: {
			get: jest.fn((key) => key),
		},
	} as any;
});

const mockObjectEntryURL = '/o/c/object-entries';

const baseItemData = {
	actions: {},
	creator: {
		additionalName: '',
		contentType: '',
		familyName: '',
		givenName: '',
		id: 0,
		name: '',
	},
	dateCreated: '',
	dateModified: '',
	displayDate: '2025-06-18T14:00:00Z',
	externalReferenceCode: '',
	id: 1,
	name: '',
	status: {
		code: 0,
		label: 'approved',
		label_i18n: 'Approved',
	},
	systemProperties: {
		version: {
			number: 2,
		},
	},
};

describe('EntryStatusDataRenderer', () => {
	beforeEach(() => {
		mockFetch.resetMocks();
	});

	it('renders approved label if previous version is approved', async () => {
		mockFetch.mockResponseOnce(
			JSON.stringify({
				items: [{status: {label: 'approved'}}],
			})
		);

		render(
			<EntryStatusDataRenderer
				itemData={baseItemData}
				objectEntryURL={mockObjectEntryURL}
			/>
		);

		await waitFor(() => {
			expect(screen.getByText('approved')).toBeInTheDocument();
			expect(screen.getByText('Approved')).toBeInTheDocument();
		});
	});

	it('does not render green approved label if no approved versions exist', async () => {
		const {fetch} = require('frontend-js-web');

		fetch.mockResolvedValueOnce({
			json: jest.fn().mockResolvedValue({
				items: [{status: {label: 'draft'}}],
			}),
			ok: true,
		});

		render(
			<EntryStatusDataRenderer
				itemData={baseItemData}
				objectEntryURL={mockObjectEntryURL}
			/>
		);

		await waitFor(() => {
			expect(screen.queryByText('approved')).not.toBeNull();
			expect(screen.queryAllByText('approved')).toHaveLength(1);
		});
	});

	it('shows tooltip when displayDate is provided', async () => {
		const {fetch} = require('frontend-js-web');

		fetch.mockResolvedValueOnce({
			json: jest.fn().mockResolvedValue({
				items: [],
			}),
			ok: true,
		});

		render(
			<EntryStatusDataRenderer
				itemData={baseItemData}
				objectEntryURL={mockObjectEntryURL}
			/>
		);

		await waitFor(() => {
			expect(
				screen.getByTitle(/this-entry-will-be-published-on/)
			).toBeInTheDocument();
		});
	});

	it('does not show tooltip when displayDate is null', async () => {
		const {fetch} = require('frontend-js-web');

		fetch.mockResolvedValueOnce({
			json: jest.fn().mockResolvedValue({
				items: [],
			}),
			ok: true,
		});

		const itemDataWithoutDate = {
			...baseItemData,
			displayDate: null,
		};

		render(
			<EntryStatusDataRenderer
				itemData={itemDataWithoutDate}
				objectEntryURL={mockObjectEntryURL}
			/>
		);

		await waitFor(() => {
			expect(
				screen.queryByTitle(/this-entry-will-be-published-on/)
			).not.toBeInTheDocument();
		});
	});
});
