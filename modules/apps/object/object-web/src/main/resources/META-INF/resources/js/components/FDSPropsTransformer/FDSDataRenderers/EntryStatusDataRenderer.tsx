/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import ClayLabel from '@clayui/label';
import {ClayTooltipProvider} from '@clayui/tooltip';
import React, {useEffect, useState} from 'react';

import '../../../../object_entries/ViewObjectEntries.scss';

import {fetch, sub} from 'frontend-js-web';

function getDisplayType(status: string) {
	switch (status) {
		case 'approved':
			return 'success';
		case 'pending':
		case 'scheduled':
			return 'info';
		case 'expired':
			return 'warning';
		default:
			return 'secondary';
	}
}

export default function EntryStatusDataRenderer({
	itemData,
	restContextPath,
}: {
	itemData: ObjectEntry;
	restContextPath: string;
}) {
	const [versions, setVersions] = useState<ObjectEntry[]>([]);

	const displayDate = itemData.displayDate
		? new Date(itemData.displayDate)
		: null;

	const versionNumber = itemData.systemProperties?.version?.number;

	const statusLabel = itemData.status.label;

	useEffect(() => {
		async function makeFetch() {
			const response = await fetch(
				`${restContextPath}/${itemData.id}/versions`
			);

			const data = await response.json();

			setVersions(data.items);
		}

		if (versionNumber) {
			makeFetch();
		}
	}, [versionNumber, itemData.id, restContextPath]);

	const hasApprovedVersion = versions.some(
		(version: ObjectEntry) => version.status.label === 'approved'
	);

	const showApprovedVersionLabel =
		versionNumber &&
		versionNumber >= 2 &&
		hasApprovedVersion &&
		statusLabel === 'scheduled';

	return (
		<>
			{showApprovedVersionLabel && (
				<ClayLabel displayType="success">
					{Liferay.Language.get('approved')}
				</ClayLabel>
			)}

			<ClayLabel displayType={getDisplayType(statusLabel)}>
				<ClayLabel.ItemExpand>
					{itemData.status.label_i18n}
				</ClayLabel.ItemExpand>

				{displayDate && statusLabel === 'scheduled' && (
					<ClayLabel.ItemAfter>
						<ClayTooltipProvider>
							<div
								title={sub(
									Liferay.Language.get(
										'this-entry-will-be-published-on-x'
									),
									`${displayDate.toLocaleDateString('default', {month: 'short'})} ${displayDate.getDate()} ${displayDate.getFullYear()} ${displayDate.toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'})}`
								)}
							>
								<ClayIcon symbol="question-circle-full" />
							</div>
						</ClayTooltipProvider>
					</ClayLabel.ItemAfter>
				)}
			</ClayLabel>
		</>
	);
}
