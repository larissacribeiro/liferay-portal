/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayForm from '@clayui/form';
import {
    MultipleSelect,
    SidebarCategory,
    Toggle,
} from '@liferay/object-js-components-web';
import classNames from 'classnames';
import React, {useEffect, useState} from 'react';

import {normalizeFieldSettings, removeFieldSettings, updateFieldSettings} from '../../../../utils/fieldSettings';
import {ObjectFieldErrors} from '../../ObjectFieldFormBase';

interface AutocompleteContainerProps {
    errors: ObjectFieldErrors;
    onSubmit?: (values?: Partial<ObjectField>) => void;
    setValues: (value: Partial<ObjectField>) => void;
    values: Partial<ObjectField>;
}

export interface InputAsValueFieldComponentProps {
    error?: string;
    onSubmit?: (values?: Partial<ObjectField>) => void;
    setValues: (values: Partial<ObjectField>) => void;
    values: Partial<ObjectField>;
}

export function AutocompleteContainer({
    errors,
    onSubmit,
    setValues,
    values,
}: AutocompleteContainerProps) {
    const settings = normalizeFieldSettings(values.objectFieldSettings);

    const [autocompleteToggleEnabled, setAutocompleteToggleEnabled] = useState(
        !!settings.autocomplete
    );

    useEffect(() => {
        if (values.state) {
            setAutocompleteToggleEnabled(true);
        }
    }, [values]);

    const handleToggle = (toggled: boolean) => {
        if (!toggled) {
            setValues({
                objectFieldSettings: removeFieldSettings(
                    ['autocomplete'],
                    values
                ),
            });

            if (onSubmit) {
                onSubmit({
                    ...values,
                    objectFieldSettings: removeFieldSettings(
                        ['autocomplete'],
                        values
                    ),
                });
            }
        }
        else {
            setValues({
                objectFieldSettings: updateFieldSettings(values.objectFieldSettings, {
                                name: 'autocomplete',
                                value: true,
                            }),
            });
        }
        setAutocompleteToggleEnabled(toggled);
    };

    return (
        <div
            className={classNames({
                'lfr-objects__edit-object-field-card-content': !modelBuilder,
                'lfr-objects__edit-object-field-model-builder-panel':
                    modelBuilder,
            })}
        >

            {!values.state && (
                <ClayForm.Group
                    className={classNames({
                        'lfr-objects__object-field-default-value-disabled':
                            !autocompleteToggleEnabled,
                        'lfr-objects__object-field-default-value-enabled':
                            autocompleteToggleEnabled,
                    })}
                >
                    <Toggle
                        label={Liferay.Language.get('use-default-value')}
                        onToggle={(toggled) => {
                            handleToggle(toggled);
                        }}
                        toggled={autocompleteToggleEnabled}
                    />
                </ClayForm.Group>
            )}

            {autocompleteToggleEnabled && (
                                    <MultipleSelect
                                        error={errors.items}
                                        label={Liferay.Language.get('value')}
                                        options={items as MultiSelectItem[]}
                                        required
                                        setOptions={setItems}
                                    />
                )}
        </div>
    );
}
