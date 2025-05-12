/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayPanel from '@clayui/panel';
import React, {useState} from 'react';

import ScheduleField from './ScheduleField';

import './ScheduleContainer.scss';

interface ScheduleContainerProps {
	portletNamespace: string;
	scheduledProperties: {
		reviewDate: {
			checked: boolean;
			value: string;
		};
	};
}

interface HiddenValue {
	reviewDate: string | null;
}

export default function ScheduleContainer({
	portletNamespace,
	scheduledProperties,
}: ScheduleContainerProps) {
	const [dateError, setDateError] = useState<string>('');
	const [hiddenValue, setHiddenValue] = useState<HiddenValue>({
		reviewDate: scheduledProperties?.reviewDate.value,
	});
	const [neverReview, setNeverReview] = useState<boolean>(
		scheduledProperties?.reviewDate.checked
	);
	const [scheduledProps, setScheduledProps] = useState(scheduledProperties);

	const handleCheckboxChange = ({
		target: {checked},
	}: React.ChangeEvent<HTMLInputElement>) => {
		setNeverReview(checked);

		if (checked) {
			setHiddenValue({reviewDate: null});
			setDateError('');
		}
		else {
			setHiddenValue({reviewDate: scheduledProps?.reviewDate.value});
		}
	};

	const handleError = (value: string) => {
		if (!value && !neverReview) {
			setDateError(Liferay.Language.get('this-field-is-required'));
		}
		else {
			setDateError('');
		}
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
						checked={neverReview}
						dateLabel={Liferay.Language.get('review-date')}
						error={dateError}
						id={portletNamespace + 'reviewDate'}
						onBlur={() => {
							handleError(scheduledProps?.reviewDate.value);
						}}
						onCheckboxChange={handleCheckboxChange}
						onDateChange={(value) => {
							handleError(value);

							setScheduledProps({
								...scheduledProps,
								reviewDate: {checked: neverReview, value},
							});
							setHiddenValue({reviewDate: value});
						}}
						value={scheduledProps?.reviewDate.value}
					/>

					<input
						id={portletNamespace + 'scheduleContainer'}
						type="hidden"
						value={JSON.stringify(hiddenValue)}
					/>
				</div>
			</ClayPanel.Body>
		</ClayPanel>
	);
}
