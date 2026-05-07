/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import '@testing-library/jest-dom';
import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';

import Email from '../../js/Email/Email';

jest.mock('@clayui/autocomplete', () => {
	const React = require('react');

	const DropDown = ({active, children}: any) =>
		active
			? React.createElement('div', {'data-testid': 'dropdown'}, children)
			: null;

	const Item = ({children, onClick}: any) =>
		React.createElement(
			'button',
			{'data-testid': 'domain-option', onClick},
			children
		);

	const ClayAutocomplete = Object.assign(
		React.forwardRef(({children}: any, _ref: any) =>
			React.createElement('div', {ref: _ref}, children)
		),
		{DropDown, Item}
	);

	return {__esModule: true, default: ClayAutocomplete};
});

jest.mock('@clayui/drop-down', () => {
	const React = require('react');

	return {
		__esModule: true,
		default: {
			ItemList: ({children}: any) =>
				React.createElement('div', null, children),
		},
	};
});

jest.mock('@clayui/form', () => {
	const React = require('react');

	return {
		ClayInput: Object.assign(
			({disabled, onChange, type, value}: any) =>
				React.createElement('input', {
					'data-testid': 'email-input',
					disabled,
					onChange,
					type,
					value,
				}),
			{
				Group: ({children}: any) =>
					React.createElement('div', null, children),
				GroupItem: ({children}: any) =>
					React.createElement('div', null, children),
			}
		),
	};
});

jest.mock('dynamic-data-mapping-form-field-type/api', () => {
	const React = require('react');

	return {
		ReactFieldBase: ({children}: any) =>
			React.createElement('div', null, children),
	};
});

jest.mock('dynamic-data-mapping-form-field-type', () => {
	const React = require('react');

	return {
		LocalesDropdown: () =>
			React.createElement('div', {'data-testid': 'locales-dropdown'}),
	};
});

jest.mock('data-engine-js-components-web', () => ({
	useFormState: jest.fn(() => ({
		availableLocales: [
			{displayName: 'English (United States)', id: 'en_US'},
		],
		defaultLanguageId: 'en_US',
		editingLanguageId: 'en_US',
	})),
}));

describe('Email', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders a text input', () => {
		render(<Email name="email" onChange={jest.fn()} />);

		expect(screen.getByTestId('email-input')).toBeInTheDocument();
	});

	it('renders the locale dropdown when localizedObjectField is true', () => {
		render(
			<Email
				localizedObjectField
				name="email"
				onChange={jest.fn()}
				value={{en_US: 'test@example.com'} as unknown as string}
			/>
		);

		expect(screen.getByTestId('locales-dropdown')).toBeInTheDocument();
	});

	it('does not show the autocomplete dropdown when autocompleteEnabled is false', () => {
		render(
			<Email
				autocompleteDomains="gmail.com"
				autocompleteEnabled={false}
				name="email"
				onChange={jest.fn()}
			/>
		);

		fireEvent.change(screen.getByTestId('email-input'), {
			target: {value: 'test@gmail'},
		});

		expect(screen.queryByTestId('dropdown')).not.toBeInTheDocument();
	});

	it('does not show the autocomplete dropdown when the input has no @', () => {
		render(
			<Email
				autocompleteDomains="gmail.com"
				autocompleteEnabled
				name="email"
				onChange={jest.fn()}
			/>
		);

		fireEvent.change(screen.getByTestId('email-input'), {
			target: {value: 'testgmail'},
		});

		expect(screen.queryByTestId('dropdown')).not.toBeInTheDocument();
	});

	it('shows the autocomplete dropdown after typing @', () => {
		render(
			<Email
				autocompleteDomains="gmail.com"
				autocompleteEnabled
				name="email"
				onChange={jest.fn()}
			/>
		);

		fireEvent.change(screen.getByTestId('email-input'), {
			target: {value: 'test@'},
		});

		expect(screen.getByTestId('dropdown')).toBeInTheDocument();
	});

	it('filters domain suggestions by the typed fragment', () => {
		render(
			<Email
				autocompleteDomains="liferay.com,gmail.com"
				autocompleteEnabled
				name="email"
				onChange={jest.fn()}
			/>
		);

		fireEvent.change(screen.getByTestId('email-input'), {
			target: {value: 'test@li'},
		});

		const options = screen.getAllByTestId('domain-option');

		expect(options).toHaveLength(1);
		expect(options[0]).toHaveTextContent('@liferay.com');
	});

	it('fills the input with the selected domain without doubling @', () => {
		render(
			<Email
				autocompleteDomains="gmail.com"
				autocompleteEnabled
				name="email"
				onChange={jest.fn()}
			/>
		);

		fireEvent.change(screen.getByTestId('email-input'), {
			target: {value: 'test@gm'},
		});

		fireEvent.click(screen.getByTestId('domain-option'));

		expect(screen.getByTestId('email-input')).toHaveValue('test@gmail.com');
	});

	it('strips leading @ from admin-configured domain values', () => {
		render(
			<Email
				autocompleteDomains="@gmail.com,@liferay.com"
				autocompleteEnabled
				name="email"
				onChange={jest.fn()}
			/>
		);

		fireEvent.change(screen.getByTestId('email-input'), {
			target: {value: 'test@'},
		});

		const options = screen.getAllByTestId('domain-option');

		expect(options).toHaveLength(2);
		expect(options[0]).toHaveTextContent('@gmail.com');
		expect(options[1]).toHaveTextContent('@liferay.com');
	});

	it('disables the input when readOnly is true', () => {
		render(<Email name="email" onChange={jest.fn()} readOnly />);

		expect(screen.getByTestId('email-input')).toBeDisabled();
	});
});
