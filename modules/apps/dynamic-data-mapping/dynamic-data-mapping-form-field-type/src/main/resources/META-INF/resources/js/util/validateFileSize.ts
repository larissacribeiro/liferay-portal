/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {sub} from 'frontend-js-web';

export function validateFileSize(
	fileItemThresholdSize: number,
	fileSize: number,
	overallMaximumUploadRequestSize: number
) {
	if (fileSize > overallMaximumUploadRequestSize) {
		return {
			displayErrors: true,
			errorMessage: sub(
				Liferay.Language.get(
					'file-size-is-larger-than-the-allowed-overall-maximum-upload-request-size-x'
				),
				`${overallMaximumUploadRequestSize / 1048576} MB`
			),
			valid: false,
		};
	}

	if (fileSize > fileItemThresholdSize) {
		return {
			displayErrors: true,
			errorMessage: sub(
				Liferay.Language.get(
					'please-enter-a-file-with-a-valid-file-size-no-larger-than-x'
				),
				`${fileItemThresholdSize / 1048576} MB`
			),
			valid: false,
		};
	}
}
