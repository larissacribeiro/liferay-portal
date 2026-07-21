/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, mergeTests} from '@playwright/test';

import {dataApiHelpersTest} from '../../../fixtures/dataApiHelpersTest';
import {featureFlagsTest} from '../../../fixtures/featureFlagsTest';
import {loginTest} from '../../../fixtures/loginTest';
import getRandomString from '../../../utils/getRandomString';
import {cmsPagesTest} from '../../site-cms-site-initializer/main/fixtures/cmsPagesTest';
import {cmpPagesTest} from './fixtures/cmpPagesTest';

const test = mergeTests(
	cmpPagesTest,
	cmsPagesTest,
	dataApiHelpersTest,
	featureFlagsTest({
		'LPD-17564': {enabled: true},
	}),
	loginTest()
);

const CMP_PROJECT = 'cmp/projects';

test(
	'Links and unlinks a project from the content editor',
	{tag: ['@LPD-97809']},
	async ({apiHelpers, contentsPage, page}) => {
		const contentTitle = `Content ${getRandomString()}`;
		const projectTitle = `Project ${getRandomString()}`;

		await test.step('Create a project with a past due date', async () => {
			await apiHelpers.objectEntry.postObjectEntry(
				{dueDate: '2020-01-01', title: projectTitle},
				CMP_PROJECT
			);
		});

		await test.step('Create and reopen a content item', async () => {
			await contentsPage.goto();

			await contentsPage.createContent('Basic Web Content');

			await page.getByLabel('Title').fill(contentTitle);

			await contentsPage.saveContent();

			await contentsPage.editContent(contentTitle);
		});

		await test.step('Link the project from the Projects panel', async () => {
			await contentsPage.openSidePanel('Projects');

			await page.getByRole('combobox', {name: 'Projects'}).click();

			await page.getByRole('option', {name: projectTitle}).click();
		});

		await test.step('Assert the linked project card and overdue badge', async () => {
			await expect(
				page.getByRole('link', {name: projectTitle})
			).toBeVisible();

			await expect(page.getByText('Overdue')).toBeVisible();
		});

		await test.step('Assert the project cannot be linked twice', async () => {
			await page.getByRole('combobox', {name: 'Projects'}).click();

			await expect(
				page.getByRole('option', {name: projectTitle})
			).toBeHidden();

			await page.keyboard.press('Escape');
		});

		await test.step('Remove the linked project', async () => {
			await page
				.locator('.cms-linked-projects')
				.getByLabel('Remove', {exact: true})
				.click();

			await expect(
				page.getByRole('link', {name: projectTitle})
			).toBeHidden();
		});
	}
);

test(
	'Keeps a linked project after reopening the content editor',
	{tag: ['@LPD-97809']},
	async ({apiHelpers, contentsPage, page}) => {
		const contentTitle = `Content ${getRandomString()}`;
		const projectTitle = `Project ${getRandomString()}`;

		await test.step('Create a project', async () => {
			await apiHelpers.objectEntry.postObjectEntry(
				{title: projectTitle},
				CMP_PROJECT
			);
		});

		await test.step('Create a content and link the project', async () => {
			await contentsPage.goto();

			await contentsPage.createContent('Basic Web Content');

			await page.getByLabel('Title').fill(contentTitle);

			await contentsPage.saveContent();

			await contentsPage.editContent(contentTitle);

			await contentsPage.openSidePanel('Projects');

			await page.getByRole('combobox', {name: 'Projects'}).click();

			await page.getByRole('option', {name: projectTitle}).click();

			await expect(
				page.getByRole('link', {name: projectTitle})
			).toBeVisible();
		});

		await test.step('Reopen the content and assert the link persisted', async () => {
			await contentsPage.goto();

			await contentsPage.editContent(contentTitle);

			await contentsPage.openSidePanel('Projects');

			await expect(
				page.getByRole('link', {name: projectTitle})
			).toBeVisible();
		});
	}
);

test(
	'Links and unlinks a project from the content list info panel',
	{tag: ['@LPD-97810']},
	async ({apiHelpers, contentsPage, infoPanelPage, page}) => {
		const contentTitle = `Content ${getRandomString()}`;
		const projectTitle = `Project ${getRandomString()}`;

		await test.step('Create a project with a past due date', async () => {
			await apiHelpers.objectEntry.postObjectEntry(
				{dueDate: '2020-01-01', title: projectTitle},
				CMP_PROJECT
			);
		});

		await test.step('Create a content', async () => {
			await contentsPage.goto();

			await contentsPage.createContent('Basic Web Content');

			await page.getByLabel('Title').fill(contentTitle);

			await contentsPage.saveContent();
		});

		await test.step('Open the info panel Projects tab', async () => {
			await contentsPage.goto();

			await contentsPage.viewShowDetails(contentTitle);

			await page.getByRole('tab', {name: 'More'}).click();

			await infoPanelPage.dropdownTab('Projects').click();
		});

		await test.step('Link the project and assert the card', async () => {
			await page.getByRole('combobox', {name: 'Projects'}).click();

			await page.getByRole('option', {name: projectTitle}).click();

			await expect(
				page.getByRole('link', {name: projectTitle})
			).toBeVisible();

			await expect(page.getByText('Overdue')).toBeVisible();
		});

		await test.step('Remove the linked project', async () => {
			await page
				.locator('.cms-linked-projects')
				.getByLabel('Remove', {exact: true})
				.click();

			await expect(
				page.getByRole('link', {name: projectTitle})
			).toBeHidden();
		});
	}
);
