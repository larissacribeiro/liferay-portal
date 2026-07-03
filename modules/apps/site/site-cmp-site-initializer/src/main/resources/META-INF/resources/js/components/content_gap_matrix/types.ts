/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export interface TaxonomyTerm {
	description?: string;
	externalReferenceCode: string | null;
	id: string;
	name: string;
	uncategorized?: boolean;
}

export interface MatrixCell {
	funnelStageId: string;
	personaId: string;
	totalCount: number;
}

export interface MatrixData {
	cells: MatrixCell[];
	funnelStages: TaxonomyTerm[];
	personas: TaxonomyTerm[];
	totalAssetCount: number;
}

export const NO_FUNNEL_STAGE: TaxonomyTerm = {
	externalReferenceCode: null,
	id: 'no-funnel-stage',
	name: Liferay.Language.get('no-funnel'),
	uncategorized: true,
};

export const NO_PERSONA: TaxonomyTerm = {
	externalReferenceCode: null,
	id: 'no-persona',
	name: Liferay.Language.get('no-persona'),
	uncategorized: true,
};
