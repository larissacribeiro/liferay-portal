/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React, {useContext} from 'react';

import LinkedProjects from '../../../common/components/LinkedProjects';
import {AssetTypeInfoPanelContext} from '../context';

const ProjectsTabContent = () => {
	const {asset} = useContext(AssetTypeInfoPanelContext);

	// The CMP project object definition ids are not yet wired into the content
	// list's info panel props (LPD-97810 backend), so LinkedProjects falls back
	// to its mock data until they are supplied here.

	return (
		<LinkedProjects
			entryExternalReferenceCode={asset.externalReferenceCode}
			entryScopeKey={asset.scopeKey}
		/>
	);
};

export default ProjectsTabContent;
