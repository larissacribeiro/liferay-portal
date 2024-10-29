/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {stringUtils} from '@liferay/object-js-components-web';
import ClayLabel from '@clayui/label';
import classNames from 'classnames';
import React from 'react';
import {useStore} from 'react-flow-renderer';

import {getObjectFieldBusinessTypeLabel} from '../../../utils/getObjectFieldBusinessTypeLabel';
import {useObjectFolderContext} from '../ModelBuilderContext/objectFolderContext';
import {TYPES} from '../ModelBuilderContext/typesEnum';

import './ObjectDefinitionNodeFields.scss';

interface ObjectDefinitionNodeFieldsProps {
	defaultLanguageId: Liferay.Language.Locale;
	isRootStructure: boolean;
	objectFields: ObjectFieldNodeRow[];
	selectedObjectDefinitionId: number;
	showAllObjectFields: boolean;
	status: {
		code: number;
		label: string;
		label_i18n: string;
	};
	system: boolean;
}

export function ObjectDefinitionNodeFields({
	defaultLanguageId,
	isRootStructure,
	objectFields,
	selectedObjectDefinitionId,
	showAllObjectFields,
	status,
	system,
}: ObjectDefinitionNodeFieldsProps) {
	const [_, dispatch] = useObjectFolderContext();

	const store = useStore();

	const handleSelectObjectField = (
		selectedObjectField: ObjectFieldNodeRow
	) => {
		const {edges, nodes} = store.getState();

		dispatch({
			payload: {
				objectDefinitionNodes: nodes,
				objectRelationshipEdges: edges,
				selectedObjectDefinitionId,
				selectedObjectField,
				selectedObjectFieldName: selectedObjectField.name as string,
			},
			type: TYPES.SET_SELECTED_OBJECT_FIELD,
		});
	};

	return (
		<>
		<div>

						<ClayLabel displayType={isRootStructure ?'info': 'secondary'}>
							{Liferay.Language.get(isRootStructure ? 'root' : 'standard')}
						</ClayLabel>
						<ClayLabel displayType={system ? 'info' : 'warning'}>
							{Liferay.Language.get(system ? 'system' : 'custom')}
						</ClayLabel>
	
						<ClayLabel
							displayType={
								status?.label === 'approved'
									? 'success'
									: status?.label === 'pending'
										? 'info'
										: 'secondary'
							}
						>
							{Liferay.Language.get(
								status?.label === 'approved'
									? 'approved'
									: status?.label === 'pending'
										? 'pending'
										: 'draft'
							)}
						</ClayLabel>
					</div>
			{objectFields.map((objectField, index) => {
				if (index < 5 || showAllObjectFields) {
					return (
						<div
							className={classNames(
								'lfr-objects__model-builder-node-field',
								{
									'lfr-objects__model-builder-node-field--selected':
										objectField.selected,
								}
							)}
							key={objectField.name}
							onClick={() => handleSelectObjectField(objectField)}
						>
							<div className="lfr-objects__model-builder-node-field-label">
								<span>
									{stringUtils.getLocalizableLabel(
										defaultLanguageId,
										objectField.label,
										objectField.name
									)}
								</span>
							</div>

							{objectField.businessType && (
								<div className="lfr-objects__model-builder-node-field-business-type">
									<span>
										{getObjectFieldBusinessTypeLabel(
											objectField.businessType
										)}
									</span>
								</div>
							)}
						</div>
					);
				}
			})}
		</>
	);
}
