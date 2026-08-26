/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const METADATA_OBJECT_FIELD_NAMES = [
	'createDate',
	'creator',
	'displayDate',
	'expirationDate',
	'externalReferenceCode',
	'id',
	'modifiedDate',
	'reviewDate',
	'status',
];

/**
 * Mirrors ObjectFieldUtil.isMetadata. These fields never reach the generated
 * OpenAPI document, so they accept no description. Match on the object field
 * name, not on the OpenAPI property name and not on ObjectField.system, which
 * is true for every field of a modifiable system object.
 */
export function isMetadataObjectField(objectFieldName?: string): boolean {
	return METADATA_OBJECT_FIELD_NAMES.includes(objectFieldName as string);
}
