/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React from 'react';

import '../../../css/ckeditor5/balloon.scss';

const WritingAssistantDisclaimer: React.FC = () => {
	return (
		<p className="writing-assistant__content-disclaimer">
			{Liferay.Language.get(
				'ai-generated-responses-may-be-inaccurate-please-review-carefully'
			)}
		</p>
	);
};

export default WritingAssistantDisclaimer;
