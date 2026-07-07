/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React from 'react';

import ContentGapMatrixGrid from './ContentGapMatrixGrid';
import {MatrixData} from './types';

import './ContentGapMatrix.scss';

export default function ContentGapMatrix({
	assetFDSId,
	data,
}: {
	assetFDSId: string;
	data: MatrixData;
}) {
	return (
		<div className="lfr-cmp__content-gap-matrix">
			<div className="lfr-cmp__content-gap-matrix-intro">
				<h5 className="lfr-cmp__content-gap-matrix-title">
					{Liferay.Language.get(
						'amount-of-assets-per-persona-x-funnel-stage'
					)}
				</h5>

				<p className="lfr-cmp__content-gap-matrix-description">
					{Liferay.Language.get(
						'this-report-provides-a-breakdown-of-all-project-assets-by-persona-and-funnel-stage'
					)}
				</p>
			</div>

			<ContentGapMatrixGrid assetFDSId={assetFDSId} data={data} />
		</div>
	);
}
