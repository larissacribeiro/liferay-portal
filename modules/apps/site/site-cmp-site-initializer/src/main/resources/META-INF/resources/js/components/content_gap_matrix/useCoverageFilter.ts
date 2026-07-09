/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	IBaseFilterState,
	IFDSState,
	getOrCreateFDSAtom,
} from '@liferay/frontend-data-set-web';
import {useLiferayState} from '@liferay/frontend-js-state-web/react';
import {useCallback, useMemo} from 'react';

import {TaxonomyTerm} from './types';

/**
 * Vocabulary-scoped category filters on the related-assets data set. Personas
 * and funnel stages are kept as SEPARATE FDS filters so their clauses are AND'd
 * (values within a single filter are OR'd, which is why a single combined filter
 * cannot express "persona AND funnel stage"). Both resolve to the
 * assetCategoryIds index field on the backend, so these ids must match the two
 * FDS filters the backend defines for this data set:
 *
 * - Unbind the related-assets data set from the shared AssetCategorySelectionFDSFilter.
 * - Add a personas-scoped filter (id "taxonomyCategoryIds") and a
 *   funnel-stage-scoped filter (id "funnelStageTaxonomyCategoryIds"), both
 *   COLLECTION_INTEGER, bound only to this data set.
 * - Add a "funnelStageTaxonomyCategoryIds" alias in SearchResultEntityModel
 *   mapping to the assetCategoryIds index field.
 */
const PERSONA_FILTER_ID = 'taxonomyCategoryIds';

const FUNNEL_STAGE_FILTER_ID = 'funnelStageTaxonomyCategoryIds';

interface CoverageFilter {

	/**
	 * Filters the project's asset data set by a persona and a funnel-stage
	 * category.
	 */
	applyFilter: (persona: TaxonomyTerm, funnelStage: TaxonomyTerm) => void;

	/**
	 * Category ids currently selected across the data set's category filters,
	 * used to highlight the matching cell. Empty when the filters are inactive or
	 * set to exclude.
	 */
	selectedCategoryIds: Set<string>;
}

/**
 * Bridges the matrix to the project's asset data set: it writes to the data
 * set's own state atom, resolved by its id and reads back which categories
 * are filtered so the matrix can highlight the selected cell.
 */
export function useCoverageFilter(assetFDSId: string): CoverageFilter {
	const assetFDSAtom = useMemo(
		() => getOrCreateFDSAtom({fdsName: assetFDSId}),
		[assetFDSId]
	);

	const [assetFDSState, setAssetFDSState] =
		useLiferayState<IFDSState>(assetFDSAtom);

	const applyFilter = useCallback(
		(persona: TaxonomyTerm, funnelStage: TaxonomyTerm) => {
			setAssetFDSState({
				...assetFDSState,
				filters: (assetFDSState?.filters ?? []).map(
					(filter: IBaseFilterState) => {
						if (filter.id === PERSONA_FILTER_ID) {
							return {
								...filter,
								active: true,
								selectedData: {
									exclude: false,
									selectedItems: [
										{
											label: persona.name,
											value: persona.id,
										},
									],
								},
							};
						}

						if (filter.id === FUNNEL_STAGE_FILTER_ID) {
							return {
								...filter,
								active: true,
								selectedData: {
									exclude: false,
									selectedItems: [
										{
											label: funnelStage.name,
											value: funnelStage.id,
										},
									],
								},
							};
						}

						return filter;
					}
				),
			});
		},
		[assetFDSState, setAssetFDSState]
	);

	const selectedCategoryIds = useMemo(() => {
		const categoryFilters = (assetFDSState?.filters ?? []).filter(
			(filter: IBaseFilterState) =>
				filter.id === PERSONA_FILTER_ID ||
				filter.id === FUNNEL_STAGE_FILTER_ID
		);

		return new Set<string>(
			categoryFilters
				.filter((filter) => filter.active)
				.flatMap((filter) => {
					const selectedData = filter.selectedData as
						| {
								exclude?: boolean;
								selectedItems?: Array<{value: string}>;
						  }
						| undefined;

					if (selectedData?.exclude) {
						return [];
					}

					return (selectedData?.selectedItems ?? []).map((item) =>
						String(item.value)
					);
				})
		);
	}, [assetFDSState]);

	return {applyFilter, selectedCategoryIds};
}
