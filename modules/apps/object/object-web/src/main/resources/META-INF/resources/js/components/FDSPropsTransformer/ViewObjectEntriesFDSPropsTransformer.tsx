/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React from 'react';

import DecimalDataRenderer from './FDSDataRenderers/DecimalDataRenderer';
import EntryStatusDataRenderer from './FDSDataRenderers/EntryStatusDataRenderer';
import MultiselectPicklistDataRenderer from './FDSDataRenderers/MultiselectPicklistDataRenderer';


export default function ViewObjectEntriesFDSPropsTransformer({
	...otherProps
}) {
	const {apiURL} = otherProps;

	const wrapper = (Component, additionalProps) => (props: any) =>
		<Component {...props} {...additionalProps} />;

	return {
		...otherProps,
		customDataRenderers: {
			decimalDataRenderer: DecimalDataRenderer,
			multiselectPicklistDataRenderer: MultiselectPicklistDataRenderer,
			statusDataRenderer: wrapper(EntryStatusDataRenderer, {
				apiURL,
			}),
		},
		onActionDropdownItemClick({
			action,
			itemData,
		}: {
			action: {data: {id: string}};
			itemData: any;
		}) {
			if (action.data.id === 'deleteObjectEntry') {
				Liferay.fire('openModalDeleteObjectEntry', {
					objectEntry: itemData,
				});
			}
		},
	};
}
