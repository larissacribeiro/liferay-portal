/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.object.rest.internal.util;

import com.liferay.object.field.business.type.ObjectFieldBusinessType;
import com.liferay.object.field.business.type.ObjectFieldBusinessTypeRegistry;
import com.liferay.object.model.ObjectField;
import com.liferay.object.model.ObjectFieldSetting;
import com.liferay.portal.kernel.model.User;

import java.util.List;

/**
 * @author Jhosseph Gonzalez
 */
public class ObjectDateTimeFieldUtil {

	public static Object getTimeStamp(
		ObjectField objectField,
		ObjectFieldBusinessTypeRegistry objectFieldBusinessTypeRegistry,
		List<ObjectFieldSetting> objectFieldSettings, User user, Object value) {

		ObjectFieldBusinessType objectFieldBusinessType =
			objectFieldBusinessTypeRegistry.getObjectFieldBusinessType(
				objectField.getBusinessType());

		return objectFieldBusinessType.getTimeStamp(
			objectFieldSettings, user, value);
	}

}