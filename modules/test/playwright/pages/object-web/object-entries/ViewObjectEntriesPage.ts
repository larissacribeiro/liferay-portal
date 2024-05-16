/**
 * SPDX-FileCopyrightText: (c) 2024 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {FrameLocator, Locator, Page, expect} from '@playwright/test';

import {PORTLET_URLS} from '../../../utils/portletUrls';

export class ViewObjectEntriesPage {
	readonly addObjectEntryButton: Locator;
	readonly backButton: Locator;
	readonly duplicateEntryErrorMessage: Locator;
	readonly page: Page;
	readonly richTextBodyIFrame: FrameLocator;
	readonly richTextInputBox: Locator;
	readonly saveObjectEntryButton: Locator;
	readonly selectFileButton: Locator;
	readonly selectFileIframe: FrameLocator;
	readonly successMessage: Locator;

	constructor(page: Page) {
		this.addObjectEntryButton = page
			.getByTestId('fdsCreationActionButton')
			.first();
		this.backButton = page.getByTitle('Back');
		this.duplicateEntryErrorMessage = page.getByText(
			'Error:The field values are already in use. Please choose unique values.'
		);
		this.page = page;
		this.richTextBodyIFrame = page
			.getByRole('application', {
				name: /Rich Text Editor, _com_liferay_object_web_internal_object_definitions_portlet_ObjectDefinitionsPortlet_.*_ddm\$\$.*\$.*\$en_US/,
			})
			.frameLocator('iframe');
		this.richTextInputBox = this.richTextBodyIFrame.getByRole('textbox');
		this.saveObjectEntryButton = page.getByRole('button', {name: 'Save'});
		this.selectFileButton = page.getByRole('button', {name: 'Select File'});
		this.selectFileIframe = page.frameLocator(
			'iframe[title="Select File"]'
		);
		this.successMessage = page.getByText(
			'Your request completed successfully.'
		);
	}

	async assertErrorWithDuplicateEntryValue() {
		await this.duplicateEntryErrorMessage.waitFor();
		await expect(this.duplicateEntryErrorMessage).toBeVisible();
	}

	async fillDateEntry(fieldValue: string) {
		await this.page.getByPlaceholder('__/__/____').click();
		await this.page.getByPlaceholder('__/__/____').fill(fieldValue);
	}

	async fillObjectEntry(fieldName: string, fieldValue: string) {
		await this.page.getByLabel(fieldName, {exact: true}).fill(fieldValue);
	}

	async fillRichTextEntry(fieldValue: string) {
		await this.page.waitForSelector('iframe');
		await this.richTextInputBox.fill(fieldValue);
		await this.richTextInputBox.click({button: 'left'});
		await this.richTextInputBox.press('Backspace');
	}

	async selectDropdownItem(fieldName: string, optionName: string) {
		await this.page.getByLabel(fieldName).click();
		await this.page.getByRole('option', {name: optionName}).click();
	}

	async selectFileFromDocumentsAndMedia() {
		await this.selectFileButton.click();
		await this.selectFileIframe
			.getByRole('link', {name: 'Sites and Libraries'})
			.click();
		await this.selectFileIframe
			.getByRole('link', {name: 'Liferay DXP'})
			.click();
		await this.selectFileIframe
			.getByRole('link', {name: 'Provided by Liferay'})
			.click();
		await this.selectFileIframe
			.locator(
				'[id="_com_liferay_item_selector_web_portlet_ItemSelectorPortlet_repositoryEntriesSearchContainer"] img'
			)
			.first()
			.click();
	}

	async assertObjectEntries(entryValue: string) {
		await this.page.locator('div.dnd-td').getByText(entryValue);
	}

	async goto(objectDefinitionId: number, siteUrl?: Site['friendlyUrlPath']) {
		await this.page.goto(
			`/group${siteUrl ?? '/guest'}${
				PORTLET_URLS.objects
			}_${objectDefinitionId}`,
			{waitUntil: 'load'}
		);
	}
}
