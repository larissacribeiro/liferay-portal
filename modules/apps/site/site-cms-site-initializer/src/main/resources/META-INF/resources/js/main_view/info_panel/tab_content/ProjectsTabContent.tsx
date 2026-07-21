/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React, {useContext} from 'react';

import LinkedProjects from '../../../common/components/LinkedProjects';
import {AssetTypeInfoPanelContext} from '../context';

const ProjectsTabContent = () => {
	const {
		asset,
		cmpProjectAssetRelationshipObjectDefinitionId,
		cmpProjectObjectDefinitionId,
		cmpProjectViewURL,
		cmpTaskObjectDefinitionId,
		cmpTaskViewURL,
		entryClassName,
	} = useContext(AssetTypeInfoPanelContext);

	// The three identity fields must match what the link stores: className is the
	// entry's model class name (required when creating a link), the external
	// reference code is the entry's, and the scope key is the group's external
	// reference code (in systemProperties.scope, not asset.scopeKey, which is the
	// space's display key). The object definition ids come from the list's server
	// props (BaseSectionDisplayContext).

	return (
		<LinkedProjects
			assetKeywords={asset.keywords}
			cmpProjectAssetRelationshipObjectDefinitionId={
				cmpProjectAssetRelationshipObjectDefinitionId
			}
			cmpProjectObjectDefinitionId={cmpProjectObjectDefinitionId}
			cmpTaskObjectDefinitionId={cmpTaskObjectDefinitionId}
			entryClassName={entryClassName}
			entryExternalReferenceCode={asset.externalReferenceCode}
			entryScopeKey={asset.systemProperties?.scope?.externalReferenceCode}
			projectViewURL={cmpProjectViewURL}
			taskViewURL={cmpTaskViewURL}
		/>
	);
};

export default ProjectsTabContent;
