/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {toMatrixData} from '../../js/components/content_gap_matrix/services/ContentCoverageService';
import {
	NO_FUNNEL_STAGE,
	NO_PERSONA,
} from '../../js/components/content_gap_matrix/types';

describe('toMatrixData', () => {
	it('appends the localized sentinels after the real categories, preserving order', () => {
		const matrixData = toMatrixData({
			cells: [],
			funnelStages: [
				{externalReferenceCode: 'F1', id: '50001', name: 'Awareness'},
				{externalReferenceCode: 'F2', id: '50002', name: 'Decision'},
			],
			personas: [
				{externalReferenceCode: 'P1', id: '40001', name: 'Champion'},
			],
			totalAssetCount: 0,
		});

		expect(matrixData.personas.map((term) => term.id)).toEqual([
			'40001',
			NO_PERSONA.id,
		]);
		expect(matrixData.funnelStages.map((term) => term.id)).toEqual([
			'50001',
			'50002',
			NO_FUNNEL_STAGE.id,
		]);
	});

	it('rewrites null cell ids to the matching sentinel id', () => {
		const matrixData = toMatrixData({
			cells: [
				{funnelStageId: '50001', personaId: '40001', totalCount: 5},
				{funnelStageId: '50001', personaId: null, totalCount: 2},
				{funnelStageId: null, personaId: null, totalCount: 1},
			],
			funnelStages: [],
			personas: [],
			totalAssetCount: 6,
		});

		expect(matrixData.cells).toEqual([
			{funnelStageId: '50001', personaId: '40001', totalCount: 5},
			{funnelStageId: '50001', personaId: NO_PERSONA.id, totalCount: 2},
			{
				funnelStageId: NO_FUNNEL_STAGE.id,
				personaId: NO_PERSONA.id,
				totalCount: 1,
			},
		]);
		expect(matrixData.totalAssetCount).toBe(6);
	});

	it('tolerates a sparse response by defaulting every field', () => {
		const matrixData = toMatrixData({});

		expect(matrixData.cells).toEqual([]);
		expect(matrixData.personas).toEqual([NO_PERSONA]);
		expect(matrixData.funnelStages).toEqual([NO_FUNNEL_STAGE]);
		expect(matrixData.totalAssetCount).toBe(0);
	});
});
