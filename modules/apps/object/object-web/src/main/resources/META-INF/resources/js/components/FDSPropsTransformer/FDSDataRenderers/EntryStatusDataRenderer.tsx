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

import {formatDisplayDate} from '../../../utils/convertToUTC';

export default function EntryStatusDataRenderer({
	itemData,
	objectEntryURL,
}: {
	itemData: ObjectEntry;
	objectEntryURL: string;
}) {
	const [versions, setVersions] = useState<ObjectEntry[]>([]);

	const displayDate = itemData.displayDate
		? new Date(itemData.displayDate)
		: null;

	const versioning = itemData.systemProperties?.version;

	const statusLabel = itemData.status.label;

	useEffect(() => {
		async function makeFetch() {
			const response = await fetch(
				`${objectEntryURL}/${itemData.id}/versions`
			);
			const data = await response.json();
			setVersions(data.items);
		}

		if (versioning) {
			makeFetch();
		}
	}, [versioning, itemData.id, objectEntryURL]);

	const hasApprovedVersion = versions?.some(
		(version: ObjectEntry) => version.status.label === 'approved'
	);

	const showApprovedVersionLabel =
		versioning &&
		versioning.number >= 2 &&
		hasApprovedVersion &&
		statusLabel === 'scheduled';

	return (
		<>
			{showApprovedVersionLabel && (
				<ClayLabel displayType="success">
					{Liferay.Language.get('approved')}
				</ClayLabel>
			)}

			<ClayLabel
				displayType={
					statusLabel === 'approved'
						? 'success'
						: statusLabel === 'pending' ||
							  statusLabel === 'scheduled'
							? 'info'
							: statusLabel === 'expired'
								? 'warning'
								: 'secondary'
				}
			>
				<ClayLabel.ItemExpand className="flex-row">
					{itemData.status.label_i18n}
				</ClayLabel.ItemExpand>

				{displayDate && statusLabel === 'scheduled' && (
					<ClayLabel.ItemAfter className="lfr-object__view-object-entries-tooltip-icon">
						<ClayTooltipProvider>
							<div
								title={sub(
									Liferay.Language.get(
										'this-entry-will-be-published-on-x'
									),
									`${formatDisplayDate(displayDate)}`
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
