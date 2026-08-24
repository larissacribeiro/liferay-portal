/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import '@testing-library/jest-dom';
import {FetchPolicy, useResource} from '@clayui/data-provider';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import SelectObjectDefinition from '../../components/ObjectRelationship/SelectObjectDefinition';

jest.mock('@clayui/data-provider', () => {
	const originalModule = jest.requireActual('@clayui/data-provider');

	return {
		...originalModule,
		useResource: jest.fn(),
	};
});

const OBJECT_DEFINITION = {
	defaultLanguageId: 'en_US',
	externalReferenceCode: 'ERC_CUSTOM',
	id: 1,
	label: {en_US: 'Custom Object'},
	modifiable: true,
	name: 'C_CustomObject',
	system: false,
};

const originalLanguageGet = (
	Liferay.Language.get as jest.Mock
).getMockImplementation() as (key: string) => string;

async function loadPage({
	items = [OBJECT_DEFINITION],
	lastPage = 1,
	page = 1,
	totalCount = 1,
}) {
	const [{fetch: fetchPage}] = (useResource as jest.Mock).mock.calls[0];

	(global.fetch as jest.Mock).mockResolvedValueOnce({
		json: async () => ({items, lastPage, page, totalCount}),
	});

	let cursor: string | null = null;

	await act(async () => {
		({cursor} = await fetchPage(
			'http://localhost:8080/o/object-admin/v1.0/object-definitions'
		));
	});

	return cursor;
}

async function openMenu() {
	await userEvent.click(
		screen.getByPlaceholderText('search-for-an-object-definition')
	);
}

function renderSelectObjectDefinition() {
	render(
		<SelectObjectDefinition reverseOrder={false} setValues={() => {}} />
	);
}

describe('SelectObjectDefinition', () => {
	const {ResizeObserver} = window;

	beforeAll(() => {
		window.ResizeObserver = jest.fn().mockImplementation(() => ({
			disconnect: jest.fn(),
			observe: jest.fn(),
			unobserve: jest.fn(),
		})) as unknown as typeof window.ResizeObserver;
	});

	afterAll(() => {
		window.ResizeObserver = ResizeObserver;
	});

	beforeEach(() => {
		jest.clearAllMocks();

		(useResource as jest.Mock).mockReturnValue({
			loadMore: jest.fn(),
			resource: null,
		});

		(Liferay.Language.get as jest.Mock).mockImplementation((key: string) =>
			key === 'showing-x-of-x-items'
				? 'Showing {0} of {1} Items'
				: originalLanguageGet(key)
		);
	});

	afterEach(() => {
		(Liferay.Language.get as jest.Mock).mockImplementation(
			originalLanguageGet
		);
	});

	it('keeps the hint once every object definition is loaded', async () => {
		(useResource as jest.Mock).mockReturnValue({
			loadMore: jest.fn(),
			resource: [OBJECT_DEFINITION],
		});

		renderSelectObjectDefinition();

		await loadPage({totalCount: 1});

		await openMenu();

		expect(screen.getByText('Showing 1 of 1 Items')).toBeInTheDocument();
	});

	it('points the cursor at the next page while more pages remain', async () => {
		renderSelectObjectDefinition();

		const cursor = await loadPage({lastPage: 10, page: 1, totalCount: 200});

		expect(cursor).toContain('page=2');
	});

	it('renders the hint while more object definitions can be loaded', async () => {
		(useResource as jest.Mock).mockReturnValue({
			loadMore: jest.fn(),
			resource: [OBJECT_DEFINITION],
		});

		renderSelectObjectDefinition();

		await loadPage({lastPage: 10, totalCount: 200});

		await openMenu();

		expect(screen.getByText('Showing 1 of 200 Items')).toBeInTheDocument();
	});

	it('requests object definitions with the context path prefixed', () => {
		(Liferay.ThemeDisplay.getPathContext as jest.Mock).mockReturnValueOnce(
			'/myportal'
		);

		renderSelectObjectDefinition();

		expect(useResource).toHaveBeenCalledWith(
			expect.objectContaining({
				link: 'http://localhost:8080/myportal/o/object-admin/v1.0/object-definitions?page=1&sort=label%3Aasc',
			})
		);
	});

	it('requests object definitions without a prefix at the root context', () => {
		(Liferay.ThemeDisplay.getPathContext as jest.Mock).mockReturnValueOnce(
			''
		);

		renderSelectObjectDefinition();

		expect(useResource).toHaveBeenCalledWith(
			expect.objectContaining({
				link: 'http://localhost:8080/o/object-admin/v1.0/object-definitions?page=1&sort=label%3Aasc',
			})
		);
	});

	it('reuses the loaded pages instead of refetching them', () => {
		renderSelectObjectDefinition();

		expect(useResource).toHaveBeenCalledWith(
			expect.objectContaining({
				fetchPolicy: FetchPolicy.CacheFirst,
			})
		);
	});

	it('stops the cursor once the last page is loaded', async () => {
		renderSelectObjectDefinition();

		const cursor = await loadPage({lastPage: 1, page: 1, totalCount: 1});

		expect(cursor).toBeNull();
	});
});
