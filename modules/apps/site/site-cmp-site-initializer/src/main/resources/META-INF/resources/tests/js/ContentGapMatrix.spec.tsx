/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import '@testing-library/jest-dom';
import {render} from '@testing-library/react';
import React from 'react';

import ContentGapMatrix from '../../js/components/content_gap_matrix/ContentGapMatrix';
import {PARTIAL_COVERAGE_MATRIX} from '../../js/components/content_gap_matrix/services/fixtures';

describe('ContentGapMatrix', () => {
	it('renders the section heading and the report description above the grid', () => {
		const {getByText} = render(
			<ContentGapMatrix data={PARTIAL_COVERAGE_MATRIX} />
		);

		expect(
			getByText('amount-of-assets-per-persona-x-funnel-stage')
		).toBeInTheDocument();
		expect(
			getByText(
				'this-report-provides-a-breakdown-of-all-project-assets-by-persona-and-funnel-stage'
			)
		).toBeInTheDocument();
	});
});
