/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {EVENT_TYPES} from '../../../../src/main/resources/META-INF/resources/js/core/actions/eventTypes.es';
import reducer from '../../../../src/main/resources/META-INF/resources/js/core/reducers/languageReducer.es';

const getPages = (...fields) => [{rows: [{columns: [{fields, size: 12}]}]}];

const getField = (pages) => pages[0].rows[0].columns[0].fields[0];

const getSettingsContextField = (field, fieldName) =>
	field.settingsContext.pages[0].rows[0].columns[0].fields.find(
		(settingsContextField) => settingsContextField.fieldName === fieldName
	);

const changeLanguage = (field, editingLanguageId) => {
	const state = {
		availableLanguageIds: ['en_US', 'ja_JP'],
		defaultLanguageId: 'ja_JP',
		focusedField: {},
		pages: getPages(field),
	};

	const {pages} = reducer(state, {
		payload: {editingLanguageId},
		type: EVENT_TYPES.LANGUAGE.CHANGE,
	});

	return getField(pages);
};

describe('core/reducers/languageReducer', () => {
	describe('EVENT_TYPES.LANGUAGE.CHANGE', () => {
		it('localizes the field properties for the editing language', () => {
			const field = changeLanguage(
				{
					fieldName: 'Paragraph12345678',
					instanceId: 'abcd1234',
					label: 'Description',
					name: '_portlet_ddm$$Paragraph12345678$abcd1234$0$$en_US',
					settingsContext: {
						pages: getPages({
							fieldName: 'label',
							localizable: true,
							localizedValue: {
								en_US: 'Description',
								ja_JP: '説明文',
							},
							type: 'text',
							value: 'Description',
						}),
					},
					type: 'paragraph',
				},
				'ja_JP'
			);

			expect(field.label).toBe('説明文');
			expect(getSettingsContextField(field, 'label').value).toBe(
				'説明文'
			);
		});

		it('localizes the predefined value options for the editing language', () => {
			const options = {
				en_US: [{edited: true, label: 'Yes', value: 'yes'}],
				ja_JP: [{edited: true, label: 'はい', value: 'yes'}],
			};

			const field = changeLanguage(
				{
					fieldName: 'Select12345678',
					instanceId: 'abcd1234',
					name: '_portlet_ddm$$Select12345678$abcd1234$0$$en_US',
					settingsContext: {
						pages: getPages(
							{
								dataType: 'ddm-options',
								fieldName: 'options',
								type: 'options',
								value: options,
							},
							{
								fieldName: 'predefinedValue',
								localizable: true,
								localizedValue: {
									en_US: '["yes"]',
									ja_JP: '["yes"]',
								},
								type: 'select',
								value: '["yes"]',
							}
						),
					},
					type: 'select',
				},
				'ja_JP'
			);

			expect(field.options).toEqual(options.ja_JP);
			expect(
				getSettingsContextField(field, 'predefinedValue').options
			).toEqual(options.ja_JP);
		});

		it('updates the input mask properties for the editing language', () => {
			const field = changeLanguage(
				{
					fieldName: 'Numeric12345678',
					inputMask: true,
					instanceId: 'abcd1234',
					name: '_portlet_ddm$$Numeric12345678$abcd1234$0$$en_US',
					settingsContext: {
						pages: getPages(
							{
								fieldName: 'inputMaskFormat',
								localizable: true,
								localizedValue: {
									en_US: '+1 (999) 999-9999',
									ja_JP: '999-9999-9999',
								},
								type: 'text',
								value: '+1 (999) 999-9999',
							},
							{
								fieldName: 'numericInputMask',
								localizable: true,
								localizedValue: {
									en_US: '{"append":"$","appendType":"prefix"}',
									ja_JP: '{"append":"円","appendType":"suffix"}',
								},
								value: '{"append":"$","appendType":"prefix"}',
							},
							{fieldName: 'predefinedValue'},
							{fieldName: 'validation'}
						),
					},
					type: 'numeric',
				},
				'ja_JP'
			);

			expect(field.append).toBe('円');
			expect(field.appendType).toBe('suffix');
			expect(field.inputMaskFormat).toBe('999-9999-9999');
		});
	});

	describe('EVENT_TYPES.LANGUAGE.UPDATE', () => {
		it('returns the same state when no language is added or deleted', () => {
			const state = {availableLanguageIds: ['en_US']};

			const action = {
				payload: {activeLanguageIds: ['en_US']},
				type: EVENT_TYPES.LANGUAGE.UPDATE,
			};

			const newState = reducer(state, action);

			expect(newState).toBe(state);
		});

		it('adds a language to availableLanguageIds when a language is added', () => {
			const state = {availableLanguageIds: ['en_US']};

			const activeLanguageIds = ['en_US', 'pt_BR'];

			const action = {
				payload: {activeLanguageIds},
				type: EVENT_TYPES.LANGUAGE.UPDATE,
			};

			const {availableLanguageIds} = reducer(state, action);

			expect(availableLanguageIds).toEqual(['en_US', 'pt_BR']);

			expect(availableLanguageIds).not.toBe(activeLanguageIds);
		});

		it('deletes a language to availableLanguageIds when a language is deleted', () => {
			const focusedField = {
				instanceId: '12345678',
				localizedValue: {en_US: 'value', pt_BR: 'valor'},
			};
			const pages = [
				{
					localizedDescription: {
						en_US: 'description',
						pt_BR: 'descrição',
					},
					localizedTitle: {en_US: 'title', pt_BR: 'título'},
					rows: [{columns: [{fields: [focusedField]}]}],
				},
			];
			const state = {
				availableLanguageIds: ['en_US', 'pt_BR'],
				focusedField,
				pages,
			};

			const activeLanguageIds = ['en_US'];

			const action = {
				payload: {activeLanguageIds},
				type: EVENT_TYPES.LANGUAGE.UPDATE,
			};

			const {
				availableLanguageIds,
				focusedField: updatedFocusedField,
				pages: updatedPages,
			} = reducer(state, action);

			const expectedField = {
				instanceId: '12345678',
				localizedValue: {en_US: 'value'},
			};

			expect(availableLanguageIds).toEqual(['en_US']);

			expect(updatedFocusedField).toEqual(expectedField);

			expect(updatedPages).toEqual([
				{
					localizedDescription: {en_US: 'description'},
					localizedTitle: {en_US: 'title'},
					rows: [{columns: [{fields: [expectedField]}]}],
				},
			]);
		});
	});
});
