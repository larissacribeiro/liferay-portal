/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export const AI_PENDING_METADATA_KEY = 'aiPendingMetadata';

export function fireContentAcceptedEvent() {
	sessionStorage.setItem(
		AI_PENDING_METADATA_KEY,
		JSON.stringify({
			aiAssisted: true,
			aiGeneratedAt: new Date().toISOString(),
			aiReviewedBy: Liferay.ThemeDisplay.getUserId(),
		})
	);
}
