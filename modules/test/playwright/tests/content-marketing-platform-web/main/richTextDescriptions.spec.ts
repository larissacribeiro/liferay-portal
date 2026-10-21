/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, mergeTests} from '@playwright/test';

import {dataApiHelpersTest} from '../../../fixtures/dataApiHelpersTest';
import {featureFlagsTest} from '../../../fixtures/featureFlagsTest';
import {loginTest} from '../../../fixtures/loginTest';
import getRandomString from '../../../utils/getRandomString';
import {waitForEditor} from '../../../utils/waitFor';
import {cmpPagesTest} from './fixtures/cmpPagesTest';

const test = mergeTests(
	cmpPagesTest,
	dataApiHelpersTest,
	featureFlagsTest({
		'LPD-11235': {enabled: false},
	}),
	loginTest()
);

const basicDocuments = 'cms/basic-documents';
const cmpProject = 'cmp/projects';
let project;
const basicDocumentIds: string[] = [];

test.afterEach(async ({apiHelpers}) => {
	for (const basicDocumentId of basicDocumentIds) {
		await apiHelpers.objectEntry.deleteObjectEntry(
			basicDocuments,
			basicDocumentId
		);
	}

	basicDocumentIds.length = 0;

	if (project) {
		await apiHelpers.objectEntry.deleteObjectEntry(
			cmpProject,
			String(project.id)
		);

		project = null;
	}
});

test(
	'Image uploads from a task description ask for the Space',
	{tag: ['@LPD-110806']},
	async ({apiHelpers, editTaskPage, page, projectPage, projectsPage}) => {
		const projectTitle = getRandomString();

		project = await apiHelpers.objectEntry.postObjectEntry(
			{title: projectTitle},
			cmpProject
		);

		await test.step('Open a new task of the project', async () => {
			await projectsPage.goto();

			await projectsPage.getProject(projectTitle).click();

			await projectPage.newTaskButton.click();

			await waitForEditor({page});
		});

		const selectImageDialog = page.getByRole('dialog', {
			name: 'Select Image',
		});

		await test.step('Open the image uploader', async () => {
			await editTaskPage.descriptionToolbar
				.getByRole('button', {name: 'Image'})
				.click();

			await selectImageDialog
				.getByRole('button', {name: 'Upload Files'})
				.click();
		});

		await test.step('Check the uploader asks for the Space', async () => {
			await expect(
				selectImageDialog.getByRole('combobox', {name: /^Space/})
			).toBeVisible();
		});
	}
);

test(
	'Media from the description is displayed on the project view page',
	{tag: ['@LPD-110806']},
	async ({apiHelpers, page, projectsPage}) => {
		const imageTitle = getRandomString();
		const projectTitle = getRandomString();

		await test.step('Create a project with an image and a video in the description', async () => {
			const image = await apiHelpers.objectEntry.postObjectEntry(
				{
					file: {
						fileBase64:
							'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgAAACAAEABToPCwAAAABJRU5ErkJggg==',
						name: `${imageTitle}.png`,
					},
					objectEntryFolderExternalReferenceCode: 'L_FILES',
					title: imageTitle,
				},
				basicDocuments,
				'Default'
			);

			basicDocumentIds.push(String(image.id));

			const video = await apiHelpers.objectEntry.postObjectEntry(
				{
					file: {
						fileBase64:
							'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=',
						name: `${getRandomString()}.mp4`,
					},
					objectEntryFolderExternalReferenceCode: 'L_FILES',
					title: getRandomString(),
				},
				basicDocuments,
				'Default'
			);

			basicDocumentIds.push(String(video.id));

			project = await apiHelpers.objectEntry.postObjectEntry(
				{
					description:
						`<p><img alt="${imageTitle}" src="${image.file.link.href}"></p>` +
						`<figure class="media"><div data-oembed-url="${video.file.link.href}">` +
						'<div style="height: 0; padding-bottom: 56.25%; position: relative;">' +
						`<video controls="" src="${video.file.link.href}" style="height: 100%; left: 0; position: absolute; top: 0; width: 100%;"></video>` +
						'</div></div></figure>',
					title: projectTitle,
				},
				cmpProject
			);
		});

		await test.step('Open the project view page', async () => {
			await projectsPage.goto();

			await projectsPage.getProject(projectTitle).click();
		});

		await test.step('Check the image and the video are displayed', async () => {
			const detailsTabPanel = page.getByRole('tabpanel', {
				name: 'Details',
			});

			await expect(
				detailsTabPanel.getByRole('img', {name: imageTitle})
			).toBeVisible();
			await expect(
				detailsTabPanel.locator('figure.media video')
			).toBeVisible();
		});
	}
);

test(
	'Task description keeps its formatting on the task view page',
	{tag: ['@LPD-110806']},
	async ({apiHelpers, editTaskPage, page, projectPage, projectsPage}) => {
		const boldText = getRandomString();
		const headingText = getRandomString();
		const italicText = getRandomString();
		const listItemTexts = [getRandomString(), getRandomString()];
		const projectTitle = getRandomString();
		const taskTitle = getRandomString();

		project = await apiHelpers.objectEntry.postObjectEntry(
			{title: projectTitle},
			cmpProject
		);

		await test.step('Open a new task of the project', async () => {
			await projectsPage.goto();

			await projectsPage.getProject(projectTitle).click();

			await projectPage.newTaskButton.click();

			await editTaskPage.titleInput.fill(taskTitle);

			await waitForEditor({page});
		});

		await test.step('Add a heading, bold and italic text, and a bulleted list', async () => {
			const descriptionToolbar = editTaskPage.descriptionToolbar;

			await editTaskPage.descriptionInput.click();

			await descriptionToolbar
				.getByRole('button', {name: 'Normal, Heading'})
				.click();

			await page.getByRole('menuitemradio', {name: 'Heading 2'}).click();

			await page.keyboard.type(headingText);
			await page.keyboard.press('Enter');

			await descriptionToolbar
				.getByRole('button', {name: 'Bold'})
				.click();

			await page.keyboard.type(boldText);

			await descriptionToolbar
				.getByRole('button', {name: 'Bold'})
				.click();

			await page.keyboard.type(' ');

			await descriptionToolbar
				.getByRole('button', {name: 'Italic'})
				.click();

			await page.keyboard.type(italicText);

			await descriptionToolbar
				.getByRole('button', {name: 'Italic'})
				.click();

			await page.keyboard.press('Enter');

			await descriptionToolbar
				.getByRole('button', {name: 'Bulleted List'})
				.click();

			await page.keyboard.type(listItemTexts[0]);
			await page.keyboard.press('Enter');
			await page.keyboard.type(listItemTexts[1]);

			await editTaskPage.saveButton.click();
		});

		await test.step('Check the task view page keeps the formatting', async () => {
			await projectPage.tasksTab.click();

			await page.getByRole('link', {name: taskTitle}).click();

			const main = page.getByRole('main');

			await expect(
				main.getByRole('heading', {
					level: 2,
					name: headingText,
				})
			).toBeVisible();
			await expect(
				main.getByRole('strong').filter({hasText: boldText})
			).toBeVisible();
			await expect(
				main.locator('i', {hasText: italicText})
			).toBeVisible();

			for (const listItemText of listItemTexts) {
				await expect(
					main.getByRole('listitem').filter({hasText: listItemText})
				).toBeVisible();
			}
		});
	}
);
