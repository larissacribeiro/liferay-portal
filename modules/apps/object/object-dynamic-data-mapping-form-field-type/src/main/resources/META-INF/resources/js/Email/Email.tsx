/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAutocomplete from '@clayui/autocomplete';
import ClayDropDown from '@clayui/drop-down';
import {ClayInput} from '@clayui/form';
import {ReactFieldBase as FieldBase} from 'dynamic-data-mapping-form-field-type/api';
import React, {useEffect, useRef, useState} from 'react';

import EmailLocalizedObjectField from './EmailLocalizedObjectField';

import type {LocalizedValue} from 'dynamic-data-mapping-form-field-type';

interface EmailProps {
	autocompleteDomains?: string;
	autocompleteEnabled?: boolean;
	localizedObjectField?: boolean;
	name: string;
	onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
	onChange?: (event: {target: {value: string}}) => void;
	onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
	predefinedValue?: string;
	readOnly?: boolean;
	value?: string;
	[key: string]: unknown;
}

export default function Email({
	autocompleteDomains,
	autocompleteEnabled,
	localizedObjectField,
	name,
	onBlur,
	onChange,
	onFocus,
	predefinedValue,
	readOnly,
	value: initialValue,
	...otherProps
}: EmailProps) {
	const [active, setActive] = useState(false);
	const [inputValue, setInputValue] = useState(
		(typeof initialValue === 'string' ? initialValue : '') ||
			predefinedValue ||
			''
	);

	const atIndex = inputValue.lastIndexOf('@');

	const autocompleteRef = useRef<HTMLInputElement>(null);

	const disabled = readOnly || (otherProps.disabled as boolean);

	const domains = autocompleteDomains
		? autocompleteDomains
				.split(',')
				.map((domain) => domain.trim().replace(/^@/, ''))
				.filter(Boolean)
		: [];

	const domainFragment =
		atIndex >= 0 ? inputValue.slice(atIndex + 1).toLowerCase() : null;

	const dropdownRef = useRef<HTMLDivElement>(null);

	const filteredDomains =
		autocompleteEnabled && !!domains.length && domainFragment !== null
			? domains.filter((domain) =>
					domain.toLowerCase().startsWith(domainFragment)
				)
			: [];

	useEffect(() => {
		setInputValue(
			(typeof initialValue === 'string' ? initialValue : '') ||
				predefinedValue ||
				''
		);
	}, [initialValue, predefinedValue]);

	useEffect(() => {
		const handleClick = ({target}: MouseEvent) => {
			if (
				autocompleteRef.current?.contains(target as Node | null) ||
				dropdownRef.current?.contains(target as Node | null)
			) {
				return;
			}

			setActive(false);
		};

		if (active) {
			document.addEventListener('mousedown', handleClick);
		}

		return () => {
			document.removeEventListener('mousedown', handleClick);
		};
	}, [active]);

	const handleChange = (value: string) => {
		setInputValue(value);

		onChange?.({target: {value}});

		setActive(
			!!autocompleteEnabled && value.includes('@') && !!domains.length
		);
	};

	const handleSelectDomain = (domain: string) => {
		const localPart =
			atIndex >= 0 ? inputValue.slice(0, atIndex + 1) : inputValue + '@';

		const newValue = `${localPart}${domain}`;

		setInputValue(newValue);

		onChange?.({target: {value: newValue}});

		setActive(false);
	};

	return (
		<FieldBase {...otherProps} name={name} readOnly={disabled}>
			{localizedObjectField ? (
				<EmailLocalizedObjectField
					autocompleteDomains={autocompleteDomains}
					autocompleteEnabled={autocompleteEnabled}
					disabled={disabled}
					name={name}
					onBlur={onBlur}
					onChange={
						onChange as unknown as (event: {
							target: {value: LocalizedValue<string>};
						}) => void
					}
					onFocus={onFocus}
					value={initialValue as LocalizedValue<string>}
				/>
			) : (
				<>
					<ClayAutocomplete ref={autocompleteRef}>
						<ClayInput
							autoComplete="off"
							className="ddm-field-text form-control"
							data-1p-ignore
							disabled={disabled}
							id={(otherProps.id as string) ?? name}
							name={`${name}_input`}
							onBlur={onBlur}
							onChange={({target: {value}}) =>
								handleChange(value)
							}
							onFocus={(event) => {
								onFocus?.(event);

								if (
									autocompleteEnabled &&
									inputValue.includes('@') &&
									!!domains.length
								) {
									setActive(true);
								}
							}}
							type="text"
							value={inputValue}
						/>

						<ClayAutocomplete.DropDown
							active={
								!disabled && active && !!filteredDomains.length
							}
						>
							<div ref={dropdownRef}>
								<ClayDropDown.ItemList>
									{filteredDomains.map((domain) => (
										<ClayAutocomplete.Item
											key={domain}
											match={domainFragment ?? ''}
											onClick={() =>
												handleSelectDomain(domain)
											}
										>
											{`@${domain}`}
										</ClayAutocomplete.Item>
									))}
								</ClayDropDown.ItemList>
							</div>
						</ClayAutocomplete.DropDown>
					</ClayAutocomplete>

					<input name={name} type="hidden" value={inputValue} />
				</>
			)}
		</FieldBase>
	);
}
