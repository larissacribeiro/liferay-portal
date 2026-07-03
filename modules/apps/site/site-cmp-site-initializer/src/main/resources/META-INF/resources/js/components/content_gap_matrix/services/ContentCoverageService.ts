/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fetch} from 'frontend-js-web';

import {MatrixData, NO_FUNNEL_STAGE, NO_PERSONA, TaxonomyTerm} from '../types';

export interface ContentCoverageService {
	getMatrix(projectId: string): Promise<MatrixData>;
}

interface ContentCoverageTermResponse {
	externalReferenceCode: string;
	id: string;
	name: string;
}

interface ContentCoverageCellResponse {
	funnelStageId: string | null;
	personaId: string | null;
	totalCount: number;
}

interface ContentCoverageResponse {
	cells?: ContentCoverageCellResponse[];
	funnelStages?: ContentCoverageTermResponse[];
	personas?: ContentCoverageTermResponse[];
	totalAssetCount?: number;
}

function toTaxonomyTerm(term: ContentCoverageTermResponse): TaxonomyTerm {
	return {
		externalReferenceCode: term.externalReferenceCode,
		id: term.id,
		name: term.name,
	};
}

/**
 * Adapts the REST response to MatrixData: appends the localized sentinels to
 * each axis and rewrites null cell ids to the matching sentinel id, so an
 * uncategorized bucket lands in the "No Persona" row / "No Funnel" column.
 */
export function toMatrixData(response: ContentCoverageResponse): MatrixData {
	return {
		cells: (response.cells ?? []).map((cell) => ({
			funnelStageId: cell.funnelStageId ?? NO_FUNNEL_STAGE.id,
			personaId: cell.personaId ?? NO_PERSONA.id,
			totalCount: cell.totalCount,
		})),
		funnelStages: [
			...(response.funnelStages ?? []).map(toTaxonomyTerm),
			NO_FUNNEL_STAGE,
		],
		personas: [
			...(response.personas ?? []).map(toTaxonomyTerm),
			NO_PERSONA,
		],
		totalAssetCount: response.totalAssetCount ?? 0,
	};
}

/**
 * Real implementation for the headless-cmp content-coverage endpoint
 * (LPD-93362). Not yet wired: the Card uses ContentCoverageServiceMock until the
 * endpoint is available; swap the Card back to this once it lands.
 */
export const ContentCoverageServiceImpl: ContentCoverageService = {
	async getMatrix(projectId: string): Promise<MatrixData> {
		const response = await fetch(
			`/o/headless-cmp/v1.0/projects/${projectId}/content-coverage`
		);

		if (!response.ok) {
			throw new Error(
				`Unable to load content coverage for project ${projectId}`
			);
		}

		return toMatrixData(await response.json());
	},
};
