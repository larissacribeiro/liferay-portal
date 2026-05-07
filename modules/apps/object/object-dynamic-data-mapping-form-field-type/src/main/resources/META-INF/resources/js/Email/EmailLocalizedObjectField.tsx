/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAutocomplete from '@clayui/autocomplete';
import ClayDropDown from '@clayui/drop-down';
import {ClayInput} from '@clayui/form';
import {useFormState} from 'data-engine-js-components-web';
import {LocalesDropdown} from 'dynamic-data-mapping-form-field-type';
import React, {useEffect, useRef, useState} from 'react';

import type {LocalizedValue} from 'dynamic-data-mapping-form-field-type';

export interface EmailLocalizedObjectFieldProps {
	autocompleteDomains?: string;
	autocompleteEnabled?: boolean;
	disabled?: boolean;
	name: string;
	onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
	onChange: (event: {target: {value: LocalizedValue<string>}}) => void;
	onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
	value: LocalizedValue<string>;
}

export default function EmailLocalizedObjectField({
	autocompleteDomains,
	autocompleteEnabled,
	disabled,
	name,
	onBlur,
	onChange,
	onFocus,
	value,
}: EmailLocalizedObjectFieldProps) {
	const {availableLocales, defaultLanguageId, editingLanguageId} =
		useFormState();

	const [active, setActive] = useState(false);
	const [inputValue, setInputValue] = useState(
		value?.[editingLanguageId] || value?.[defaultLanguageId] || ''
	);

	const autocompleteRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const domains = autocompleteDomains
		? autocompleteDomains
				.split(',')
				.map((domain) => domain.trim().replace(/^@/, ''))
				.filter(Boolean)
		: [];

	const atIndex = inputValue.lastIndexOf('@');
	const domainFragment =
		atIndex >= 0 ? inputValue.slice(atIndex + 1).toLowerCase() : null;

	const filteredDomains =
		autocompleteEnabled && !!domains.length && domainFragment !== null
			? domains.filter((domain) =>
					domain.toLowerCase().startsWith(domainFragment)
				)
			: [];

	useEffect(() => {
		setInputValue(
			value?.[editingLanguageId] || value?.[defaultLanguageId] || ''
		);

		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultLanguageId, editingLanguageId]);

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

	const handleChange = (emailValue: string) => {
		setInputValue(emailValue);

		onChange({
			target: {
				value: {
					...value,
					[editingLanguageId]: emailValue,
				},
			},
		});

		setActive(
			!!autocompleteEnabled &&
				emailValue.includes('@') &&
				!!domains.length
		);
	};

	const handleSelectDomain = (domain: string) => {
		const localPart =
			atIndex >= 0 ? inputValue.slice(0, atIndex + 1) : inputValue + '@';

		const newValue = `${localPart}${domain}`;

		setInputValue(newValue);

		onChange({
			target: {
				value: {
					...value,
					[editingLanguageId]: newValue,
				},
			},
		});

		setActive(false);
	};

	return (
		<ClayInput.Group>
			<ClayInput.GroupItem>
				<ClayAutocomplete ref={autocompleteRef}>
					<ClayInput
						autoComplete="off"
						className="ddm-field-text form-control"
						data-1p-ignore
						disabled={disabled}
						name={`${name}_input`}
						onBlur={onBlur}
						onChange={({target: {value}}) => handleChange(value)}
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
						active={!disabled && active && !!filteredDomains.length}
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
			</ClayInput.GroupItem>

			<ClayInput.GroupItem shrink>
				<LocalesDropdown
					availableLocales={availableLocales}
					fieldName={name}
					value={value}
				/>
			</ClayInput.GroupItem>
		</ClayInput.Group>
	);
}
