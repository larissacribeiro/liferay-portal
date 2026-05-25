/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	AI_PENDING_METADATA_KEY,
	fireContentAcceptedEvent,
} from '../../../src/main/resources/META-INF/resources/js/WritingAssistant/utils/disclaimerUtils';

Object.assign(global.Liferay.ThemeDisplay, {
	getUserId: jest.fn(() => 20123),
});

describe('disclaimerUtils', () => {
	describe('fireContentAcceptedEvent', () => {
		beforeEach(() => {
			sessionStorage.clear();
		});

		it('writes pending AI metadata to sessionStorage with the correct shape', () => {
			const before = Date.now();

			fireContentAcceptedEvent();

			const after = Date.now();

			const stored = sessionStorage.getItem(AI_PENDING_METADATA_KEY);

			expect(stored).not.toBeNull();

			const payload = JSON.parse(stored!);

			expect(payload.aiAssisted).toBe(true);

			const acceptedAt = new Date(payload.aiGeneratedAt).getTime();

			expect(acceptedAt).toBeGreaterThanOrEqual(before);
			expect(acceptedAt).toBeLessThanOrEqual(after);

			expect(typeof payload.aiReviewedBy).not.toBe('undefined');
		});
	});
});
