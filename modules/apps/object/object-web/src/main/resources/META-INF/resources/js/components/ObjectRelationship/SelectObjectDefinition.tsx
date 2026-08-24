/**
 * SPDX-FileCopyrightText: (c) 2023 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Autocomplete from '@clayui/autocomplete';
import {FetchPolicy, useResource} from '@clayui/data-provider';
import ClayLabel from '@clayui/label';
import {stringUtils} from '@liferay/object-js-components-web';
import {FieldBase} from 'frontend-js-components-web';
import {fetch, sub} from 'frontend-js-web';
import React, {useCallback, useEffect, useMemo, useState} from 'react';

import './SelectObjectDefinition.scss';

const getObjectDefinitionLabel = ({
	defaultLanguageId,
	label,
	name,
}: Partial<ObjectDefinition>) =>
	stringUtils.getLocalizableLabel({
		fallbackLabel: name,
		fallbackLanguageId: defaultLanguageId as Liferay.Language.Locale,
		labels: label,
	});

interface SelectObjectDefinitionProps {
	disabled?: boolean;
	error?: string;
	initialValue?: string;
	label?: string;
	objectDefinition1?: Partial<ObjectDefinition>;
	reverseOrder: boolean;
	setValues: (values: Partial<ObjectRelationship>) => void;
}

export default function SelectObjectDefinition({
	disabled,
	error,
	initialValue,
	label,
	objectDefinition1,
	reverseOrder,
	setValues,
}: SelectObjectDefinitionProps) {
	const [networkStatus, setNetworkStatus] = useState(4);
	const [totalCount, setTotalCount] = useState(0);
	const [value, setValue] = useState(initialValue ?? '');
	const [search, setSearch] = useState('');

	const getPageURL = useCallback((page: number) => {
		const url = new URL(
			`${Liferay.ThemeDisplay.getPortalURL()}${Liferay.ThemeDisplay.getPathContext()}/o/object-admin/v1.0/object-definitions`
		);

		url.searchParams.set('page', String(page));
		url.searchParams.set('sort', 'label:asc');

		return url.toString();
	}, []);

	const {
		loadMore,
		resource,
	}: {
		loadMore: () => Promise<unknown> | null;
		resource: Partial<ObjectDefinition>[] | null;
	} = useResource({
		fetch: async (link: string, init?: RequestInit): Promise<any> => {
			const response = await fetch(link, init);

			const {items, lastPage, page, totalCount} = await response.json();

			setTotalCount(totalCount);

			return {
				cursor: page < lastPage ? getPageURL(page + 1) : null,
				items,
			};
		},
		fetchOptions: {
			credentials: 'include',
			headers: new Headers({'x-csrf-token': Liferay.authToken}),
			method: 'GET',
		},
		fetchPolicy: FetchPolicy.CacheFirst,
		link: getPageURL(1),
		onNetworkStatusChange: setNetworkStatus,
		variables: {
			search,
		},
	});

	const loadedCount = resource?.length ?? 0;

	const objectDefinitions = useMemo(
		() =>
			(resource ?? []).filter(
				({modifiable, parameterRequired, storageType}) =>
					(objectDefinition1?.modifiable || modifiable) &&
					(!Liferay.FeatureFlags['LPS-135430'] ||
						storageType === 'default') &&
					!parameterRequired
			),
		[objectDefinition1, resource]
	);

	useEffect(() => {
		setValue(initialValue ?? '');
	}, [initialValue]);

	return (
		<FieldBase
			disabled={disabled}
			errorMessage={error}
			id="objectRelationshipSelectObjectDefinition"
			label={label}
			required
		>
			<Autocomplete
				aria-label={label}
				disabled={disabled}
				filterKey={getObjectDefinitionLabel}
				footer={
					totalCount ? (
						<div className="dropdown-caption lfr-objects__select-object-definition-caption">
							{sub(Liferay.Language.get('showing-x-of-x-items'), [
								loadedCount,
								totalCount,
							])}
						</div>
					) : undefined
				}
				items={objectDefinitions}
				loadingState={networkStatus}
				menuTrigger="focus"
				messages={{
					infiniteScrollInitialLoad: Liferay.Language.get(
						'x-item-loaded-reach-the-last-item-to-load-more'
					),
					infiniteScrollInitialLoadPlural: Liferay.Language.get(
						'x-items-loaded-reach-the-last-item-to-load-more'
					),
					infiniteScrollOnLoad:
						Liferay.Language.get('loading-more-items'),
					infiniteScrollOnLoaded:
						Liferay.Language.get('x-item-loaded'),
					infiniteScrollOnLoadedPlural:
						Liferay.Language.get('x-items-loaded'),
					loading: Liferay.Language.get('loading...'),
					notFound: Liferay.Language.get('no-results-found'),
				}}
				onChange={(newValue) => {
					setValue(newValue);
					setSearch(newValue);
				}}
				onItemsChange={() => {}}
				onLoadMore={async () => loadMore()}
				placeholder={Liferay.Language.get(
					'search-for-an-object-definition'
				)}
				value={value}
			>
				{(item) => {
					const label = getObjectDefinitionLabel(item);

					return (
						<Autocomplete.Item
							key={item.externalReferenceCode}
							onClick={() => {
								if (!reverseOrder) {
									setValues({
										objectDefinitionExternalReferenceCode2:
											item.externalReferenceCode,
										objectDefinitionId2: item.id,
										objectDefinitionName2: item.name,
									});
								}
								else {
									setValues({
										objectDefinitionExternalReferenceCode1:
											item.externalReferenceCode,
										objectDefinitionId1: item.id,
									});
								}

								setValue(label);
								setSearch('');
							}}
							textValue={label}
						>
							<div className="lfr-objects__select-object-definition-option">
								<div>{label}</div>

								<ClayLabel
									displayType={
										item.system ? 'info' : 'warning'
									}
								>
									{item.system
										? Liferay.Language.get('system')
										: Liferay.Language.get('custom')}
								</ClayLabel>
							</div>
						</Autocomplete.Item>
					);
				}}
			</Autocomplete>
		</FieldBase>
	);
}
