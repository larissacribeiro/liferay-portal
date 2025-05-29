/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * /**
 * Receives a date and converts it from local to utc
 */
export function convertToUTC(value: string | undefined) {
	if (!value) {
		return null;
	}
	
	const date = new Date(value);

	return date.toISOString().split('.')[0] + 'Z';
}
