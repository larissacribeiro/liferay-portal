/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox} from '@clayui/form';
import {DatePicker} from '@liferay/object-js-components-web';
import React from 'react';

interface ScheduleFieldProps {
	checkboxLabel: string;
	checked: boolean;
	dateLabel: string;
	error?: string;
	id: string;
	onBlur: () => void;
	onCheckboxChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onDateChange: (value: string) => void;
	value: string;
}

export default function ScheduleField({
	checkboxLabel,
	checked,
	dateLabel,
	error,
	id,
	onBlur,
	onCheckboxChange,
	onDateChange,
	value,
}: ScheduleFieldProps) {
	return (
		<div className="col-lg-6">
			<DatePicker
				disabled={checked}
				error={error}
				id={id}
				label={dateLabel}
				onBlur={onBlur}
				onChange={onDateChange}
				required
				type="DateTime"
				value={value}
			/>

			<ClayCheckbox
				checked={checked}
				label={checkboxLabel}
				onChange={onCheckboxChange}
			/>
		</div>
	);
}
