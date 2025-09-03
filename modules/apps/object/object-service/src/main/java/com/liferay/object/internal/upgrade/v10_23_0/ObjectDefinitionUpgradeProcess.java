/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.object.internal.upgrade.v10_23_0;

import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.dao.jdbc.AutoBatchPreparedStatementUtil;
import com.liferay.portal.kernel.upgrade.UpgradeProcess;
import com.liferay.portal.kernel.upgrade.UpgradeProcessFactory;
import com.liferay.portal.kernel.upgrade.UpgradeStep;

import java.sql.PreparedStatement;
import java.sql.ResultSet;

/**
 * @author Mario Gomes
 */
public class ObjectDefinitionUpgradeProcess extends UpgradeProcess {

	@Override
	protected void doUpgrade() throws Exception {
		try (PreparedStatement preparedStatement1 = connection.prepareStatement(
				"select objectDefinitionId, system_, modifiable from " +
					"ObjectDefinition");
			PreparedStatement preparedStatement2 =
				AutoBatchPreparedStatementUtil.concurrentAutoBatch(
					connection,
					"update ObjectDefinition set " +
						"enableObjectDefinitionMapping = ? where " +
							"objectDefinitionId = ?")) {

			ResultSet resultSet = preparedStatement1.executeQuery();

			while (resultSet.next()) {
				boolean system = resultSet.getBoolean("system_");
				boolean modifiable = resultSet.getBoolean("modifiable");

				boolean enableObjectDefinitionMapping = true;

				if (system && !modifiable) {
					enableObjectDefinitionMapping = false;
				}

				preparedStatement2.setBoolean(1, enableObjectDefinitionMapping);
				preparedStatement2.setLong(
					2, resultSet.getLong("objectDefinitionId"));

				preparedStatement2.addBatch();
			}

			preparedStatement2.executeBatch();
		}

		runSQL(
			StringBundler.concat(
				"update ObjectDefinition set enableObjectDefinitionMapping = ",
				"[$TRUE$] where not (system_ = [$TRUE$] and modifiable = ",
				"[$FALSE$])"));
		runSQL(
			StringBundler.concat(
				"update ObjectDefinition set enableObjectDefinitionMapping = ",
				"[$FALSE$] where (system_ = [$TRUE$] and modifiable = ",
				"[$FALSE$])"));
	}

	@Override
	protected UpgradeStep[] getPreUpgradeSteps() {
		return new UpgradeStep[] {
			UpgradeProcessFactory.addColumns(
				"ObjectDefinition", "enableObjectDefinitionMapping BOOLEAN")
		};
	}

}