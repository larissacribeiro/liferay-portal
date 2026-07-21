/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React from 'react';

import LinkedProjects from '../../../common/components/LinkedProjects';

type Props = {
	cmpProjectAssetRelationshipObjectDefinitionId?: number | null;
	cmpProjectObjectDefinitionId?: number | null;
	entryClassName?: string;
	entryExternalReferenceCode?: string;
	entryScopeKey?: string;
	hasLinkProjectPermission?: boolean;
};

export default function ProjectsPanel({
	cmpProjectAssetRelationshipObjectDefinitionId,
	cmpProjectObjectDefinitionId,
	entryClassName,
	entryExternalReferenceCode,
	entryScopeKey,
	hasLinkProjectPermission,
}: Props) {
	return (
		<div className="px-3">
			<LinkedProjects
				cmpProjectAssetRelationshipObjectDefinitionId={
					cmpProjectAssetRelationshipObjectDefinitionId
				}
				cmpProjectObjectDefinitionId={cmpProjectObjectDefinitionId}
				entryClassName={entryClassName}
				entryExternalReferenceCode={entryExternalReferenceCode}
				entryScopeKey={entryScopeKey}
				hasLinkProjectPermission={hasLinkProjectPermission}
			/>
		</div>
	);
}
