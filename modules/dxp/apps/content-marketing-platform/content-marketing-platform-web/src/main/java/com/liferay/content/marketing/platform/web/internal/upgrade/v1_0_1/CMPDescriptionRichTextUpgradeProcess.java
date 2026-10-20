/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.content.marketing.platform.web.internal.upgrade.v1_0_1;

import com.liferay.content.marketing.platform.web.internal.util.CMPRichTextUtil;
import com.liferay.object.constants.ObjectFieldConstants;
import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.model.ObjectField;
import com.liferay.object.service.ObjectDefinitionLocalService;
import com.liferay.object.service.ObjectFieldLocalService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.dao.jdbc.AutoBatchPreparedStatementUtil;
import com.liferay.portal.kernel.service.CompanyLocalService;
import com.liferay.portal.kernel.upgrade.UpgradeProcess;
import com.liferay.portal.kernel.util.Validator;

import java.sql.PreparedStatement;
import java.sql.ResultSet;

import java.util.Objects;

/**
 * @author Larissa Ribeiro
 */
public class CMPDescriptionRichTextUpgradeProcess extends UpgradeProcess {

	public CMPDescriptionRichTextUpgradeProcess(
		CompanyLocalService companyLocalService,
		ObjectDefinitionLocalService objectDefinitionLocalService,
		ObjectFieldLocalService objectFieldLocalService) {

		_companyLocalService = companyLocalService;
		_objectDefinitionLocalService = objectDefinitionLocalService;
		_objectFieldLocalService = objectFieldLocalService;
	}

	@Override
	protected void doUpgrade() throws Exception {
		_companyLocalService.forEachCompanyId(this::_upgradeCompany);
	}

	private void _convertDescriptions(
			ObjectDefinition objectDefinition, ObjectField objectField)
		throws Exception {

		String dbColumnName = objectField.getDBColumnName();
		String pkObjectFieldDBColumnName =
			objectDefinition.getPKObjectFieldDBColumnName();

		try (PreparedStatement preparedStatement1 = connection.prepareStatement(
				StringBundler.concat(
					"select ", pkObjectFieldDBColumnName, ", ", dbColumnName,
					" from ", objectField.getDBTableName(), " where ",
					dbColumnName, " is not null"));
			PreparedStatement preparedStatement2 =
				AutoBatchPreparedStatementUtil.concurrentAutoBatch(
					connection,
					StringBundler.concat(
						"update ", objectField.getDBTableName(), " set ",
						dbColumnName, " = ? where ", pkObjectFieldDBColumnName,
						" = ?"));

			ResultSet resultSet = preparedStatement1.executeQuery()) {

			while (resultSet.next()) {
				String description = resultSet.getString(dbColumnName);

				if (Validator.isBlank(description)) {
					continue;
				}

				preparedStatement2.setString(
					1, CMPRichTextUtil.toHTML(description));
				preparedStatement2.setLong(
					2, resultSet.getLong(pkObjectFieldDBColumnName));

				preparedStatement2.addBatch();
			}

			preparedStatement2.executeBatch();
		}
	}

	private void _upgradeCompany(long companyId) throws Exception {
		for (String externalReferenceCode : _EXTERNAL_REFERENCE_CODES) {
			ObjectDefinition objectDefinition =
				_objectDefinitionLocalService.
					fetchObjectDefinitionByExternalReferenceCode(
						externalReferenceCode, companyId);

			if (objectDefinition == null) {
				continue;
			}

			ObjectField objectField = _objectFieldLocalService.fetchObjectField(
				objectDefinition.getObjectDefinitionId(), "description");

			if ((objectField == null) ||
				Objects.equals(
					objectField.getBusinessType(),
					ObjectFieldConstants.BUSINESS_TYPE_RICH_TEXT)) {

				continue;
			}

			_convertDescriptions(objectDefinition, objectField);

			objectField.setBusinessType(
				ObjectFieldConstants.BUSINESS_TYPE_RICH_TEXT);

			_objectFieldLocalService.updateObjectField(objectField);
		}
	}

	private static final String[] _EXTERNAL_REFERENCE_CODES = {
		"L_CMP_PROJECT", "L_CMP_TASK"
	};

	private final CompanyLocalService _companyLocalService;
	private final ObjectDefinitionLocalService _objectDefinitionLocalService;
	private final ObjectFieldLocalService _objectFieldLocalService;

}