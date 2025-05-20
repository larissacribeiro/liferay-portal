/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayPanel from '@clayui/panel';
import React, { useState } from 'react';

import ScheduleField from './ScheduleField';

import './ScheduleContainer.scss';

type SchedulePropertyKey = 'reviewDate' | 'expirationDate';

interface SchedulePropertyValues {
	checked: boolean;
	value: string;
}

interface ScheduleContainerProps {
	portletNamespace: string;
	scheduleProperties: { [key in SchedulePropertyKey]: SchedulePropertyValues };
}

type HiddenValue = { [key in SchedulePropertyKey]: string | null };

export default function ScheduleContainer({
	portletNamespace,
	scheduleProperties,
}: ScheduleContainerProps) {
	const [displayedScheduleValues, setDisplayedScheduleValues] = useState<{
		[key in SchedulePropertyKey]: SchedulePropertyValues;
	}>({
		expirationDate: {
			checked: scheduleProperties.expirationDate.checked,
			value: scheduleProperties.expirationDate.value ?? '',
		},
		reviewDate: {
			checked: scheduleProperties.reviewDate.checked,
			value: scheduleProperties.reviewDate.value ?? '',
		},
	});

	const [hiddenScheduleValues, setHiddenScheduleValues] =
		useState<HiddenValue>({
			expirationDate: scheduleProperties.expirationDate.value ?? null,
			reviewDate: scheduleProperties.reviewDate.value ?? null,
		});

	const handleCheckboxChange = ({
		event,
		property,
	}: {
		event: React.ChangeEvent<HTMLInputElement>;
		property: SchedulePropertyKey;
	}) => {
		const checked = event.target.checked;

		setHiddenScheduleValues((prev) => ({
			...prev,
			[property]: checked
				? null
				: displayedScheduleValues[property].value,
		}));
	};

	return (
		<ClayPanel
			collapsable
			defaultExpanded
			displayTitle={Liferay.Language.get('schedule')}
			displayType="secondary"
		>
			<ClayPanel.Body className="lfr-object__entries-schedule-panel">
				<div className="row">
					<ScheduleField
						checkboxLabel={Liferay.Language.get('never-review')}
						dateLabel={Liferay.Language.get('review-date')}
						id={portletNamespace + 'reviewDate'}
						isChecked={displayedScheduleValues.reviewDate.checked}
						onCheckboxChange={(event) => {
							handleCheckboxChange({
								event,
								property: 'reviewDate',
							});
						}}
						onDateChange={(value: string) => {
							setDisplayedScheduleValues({
								...displayedScheduleValues,
								reviewDate: {
									...scheduleProperties.reviewDate,
									value,
								},
							});
							setHiddenScheduleValues({ ...hiddenScheduleValues, reviewDate: value });
						}}
						portletNamespace={portletNamespace}
						value={displayedScheduleValues.reviewDate.value}
					/>

					<ScheduleField
						checkboxLabel='Never Expire'
						dateLabel='Expiration Date'
						id={portletNamespace + 'expirationDate'}
						isChecked={displayedScheduleValues.expirationDate.checked}
						onCheckboxChange={(event) => {
							handleCheckboxChange({
								event,
								property: 'expirationDate',
							});
						}}
						onDateChange={(value: string) => {
							setDisplayedScheduleValues({
								...displayedScheduleValues,
								expirationDate: {
									...scheduleProperties.expirationDate,
									value,
								},
							});
							setHiddenScheduleValues({ ...hiddenScheduleValues, expirationDate: value });
						}}
						portletNamespace={portletNamespace}
						value={displayedScheduleValues.expirationDate.value}
					/>

					<input
						id={portletNamespace + 'scheduleContainer'}
						type="hidden"
						value={JSON.stringify(hiddenScheduleValues)}
					/>
				</div>
			</ClayPanel.Body>
		</ClayPanel>
	);
}
