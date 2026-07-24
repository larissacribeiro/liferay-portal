/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React from 'react';

import LinkedProjects from '../../../common/components/LinkedProjects';

type ProjectsPanelProps = {
	cmpProjectLinkObjectDefinitionId?: number | null;
	cmpProjectObjectDefinitionId?: number | null;
	cmpProjectViewURL?: string;
	cmpTaskLinkObjectDefinitionId?: number | null;
	cmpTaskObjectDefinitionId?: number | null;
	cmpTaskViewURL?: string;
	entryClassName?: string;
	entryExternalReferenceCode?: string;
	entryGroupExternalReferenceCode?: string;
};

export default function ProjectsPanel({
	cmpProjectLinkObjectDefinitionId,
	cmpProjectObjectDefinitionId,
	cmpProjectViewURL,
	cmpTaskLinkObjectDefinitionId,
	cmpTaskObjectDefinitionId,
	cmpTaskViewURL,
	entryClassName,
	entryExternalReferenceCode,
	entryGroupExternalReferenceCode,
}: ProjectsPanelProps) {
	return (
		<div className="px-3">
			<LinkedProjects
				cmpProjectLinkObjectDefinitionId={
					cmpProjectLinkObjectDefinitionId
				}
				cmpProjectObjectDefinitionId={cmpProjectObjectDefinitionId}
				cmpTaskLinkObjectDefinitionId={cmpTaskLinkObjectDefinitionId}
				cmpTaskObjectDefinitionId={cmpTaskObjectDefinitionId}
				entryClassName={entryClassName}
				entryExternalReferenceCode={entryExternalReferenceCode}
				entryGroupExternalReferenceCode={
					entryGroupExternalReferenceCode
				}
				projectViewURL={cmpProjectViewURL}
				taskViewURL={cmpTaskViewURL}
			/>
		</div>
	);
}
