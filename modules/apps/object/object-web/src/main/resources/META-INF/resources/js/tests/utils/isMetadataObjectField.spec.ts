/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import '@testing-library/jest-dom';

import {isMetadataObjectField} from '../../utils/isMetadataObjectField';

describe('isMetadataObjectField', () => {
	it('returns false for a custom object field', () => {
		expect(isMetadataObjectField('claimNumber')).toBe(false);
	});

	it('returns false for a non metadata system object field', () => {
		expect(isMetadataObjectField('author')).toBe(false);
	});

	it('returns false for an undefined object field name', () => {
		expect(isMetadataObjectField(undefined)).toBe(false);
	});

	it('returns false for the OpenAPI property names of metadata fields', () => {
		expect(isMetadataObjectField('dateCreated')).toBe(false);
		expect(isMetadataObjectField('dateModified')).toBe(false);
	});

	it('returns true for every framework metadata object field', () => {
		[
			'createDate',
			'creator',
			'displayDate',
			'expirationDate',
			'externalReferenceCode',
			'id',
			'modifiedDate',
			'reviewDate',
			'status',
		].forEach((objectFieldName) => {
			expect(isMetadataObjectField(objectFieldName)).toBe(true);
		});
	});
});
