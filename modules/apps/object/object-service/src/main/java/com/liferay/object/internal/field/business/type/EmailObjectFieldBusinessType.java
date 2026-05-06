/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.object.internal.field.business.type;

import com.liferay.object.constants.ObjectFieldConstants;
import com.liferay.object.constants.ObjectFieldSettingConstants;
import com.liferay.object.dynamic.data.mapping.form.field.type.constants.ObjectDDMFormFieldTypeConstants;
import com.liferay.object.exception.ObjectEntryValuesException;
import com.liferay.object.exception.ObjectFieldSettingValueException;
import com.liferay.object.field.business.type.ObjectFieldBusinessType;
import com.liferay.object.field.setting.util.ObjectFieldSettingUtil;
import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.model.ObjectField;
import com.liferay.object.model.ObjectFieldSetting;
import com.liferay.portal.kernel.exception.PortalException;
import com.liferay.portal.kernel.feature.flag.FeatureFlagManagerUtil;
import com.liferay.portal.kernel.language.Language;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.SetUtil;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;
import com.liferay.portal.vulcan.extension.PropertyDefinition;

import java.io.Serializable;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

/**
 * @author Nathaly Gomes
 */
@Component(
	property = "object.field.business.type.key=" + ObjectFieldConstants.BUSINESS_TYPE_EMAIL,
	service = ObjectFieldBusinessType.class
)
public class EmailObjectFieldBusinessType extends BaseObjectFieldBusinessType {

	@Override
	public Set<String> getAllowedObjectFieldSettingsNames() {
		return SetUtil.fromArray(
			ObjectFieldSettingConstants.NAME_AUTOCOMPLETE_DOMAINS,
			ObjectFieldSettingConstants.NAME_AUTOCOMPLETE_ENABLED,
			ObjectFieldSettingConstants.NAME_BLOCKED_DOMAINS,
			ObjectFieldSettingConstants.NAME_DEFAULT_VALUE,
			ObjectFieldSettingConstants.NAME_DEFAULT_VALUE_TYPE,
			ObjectFieldSettingConstants.NAME_UNIQUE_VALUES);
	}

	@Override
	public String getDBType() {
		return ObjectFieldConstants.DB_TYPE_STRING;
	}

	@Override
	public String getDDMFormFieldTypeName() {
		return ObjectDDMFormFieldTypeConstants.EMAIL;
	}

	@Override
	public String getDescription(Locale locale) {
		return _language.get(locale, "add-an-email-address");
	}

	@Override
	public String getLabel(Locale locale) {
		return _language.get(locale, "email-address");
	}

	@Override
	public String getName() {
		return ObjectFieldConstants.BUSINESS_TYPE_EMAIL;
	}

	@Override
	public PropertyDefinition.PropertyType getPropertyType() {
		return PropertyDefinition.PropertyType.TEXT;
	}

	@Override
	public Set<String> getUnmodifiableObjectFieldSettingsNames() {
		return Collections.singleton(
			ObjectFieldSettingConstants.NAME_UNIQUE_VALUES);
	}

	@Override
	public boolean isVisible(ObjectDefinition objectDefinition) {
		return FeatureFlagManagerUtil.isEnabled(
			objectDefinition.getCompanyId(), "LPD-70673");
	}

	@Override
	public Serializable processValue(
			ObjectField objectField, Serializable serializable)
		throws PortalException {

		String value = GetterUtil.getString(serializable);

		if (Validator.isNull(value)) {
			return value;
		}

		String normalizedValue = StringUtil.toLowerCase(value);

		if (!_isValidEmail(normalizedValue)) {
			throw new ObjectEntryValuesException.InvalidEmailAddress(
				value, objectField.getName());
		}

		String blockedDomains = ObjectFieldSettingUtil.getValue(
			ObjectFieldSettingConstants.NAME_BLOCKED_DOMAINS, objectField);

		if (Validator.isNotNull(blockedDomains)) {
			String domain = _getDomain(normalizedValue);

			for (String blockedDomain :
					StringUtil.split(
						StringUtil.toLowerCase(blockedDomains), ',')) {

				if (Objects.equals(blockedDomain.trim(), domain)) {
					throw new ObjectEntryValuesException.BlockedEmailDomain(
						domain, objectField.getName());
				}
			}
		}

		return normalizedValue;
	}

	@Override
	public void validateObjectFieldSettings(
			ObjectField objectField,
			List<ObjectFieldSetting> objectFieldSettings)
		throws PortalException {

		super.validateObjectFieldSettings(objectField, objectFieldSettings);

		Map<String, String> objectFieldSettingsValues =
			getObjectFieldSettingsValues(objectFieldSettings);

		validateBooleanObjectFieldSetting(
			objectField.getName(),
			ObjectFieldSettingConstants.NAME_AUTOCOMPLETE_ENABLED,
			objectFieldSettingsValues);
		validateBooleanObjectFieldSetting(
			objectField.getName(),
			ObjectFieldSettingConstants.NAME_UNIQUE_VALUES,
			objectFieldSettingsValues);
	}

	@Override
	public void validateObjectFieldSettingsDefaultValue(
			ObjectField objectField,
			Map<String, String> objectFieldSettingsValuesMap)
		throws PortalException {

		if (objectFieldSettingsValuesMap.isEmpty()) {
			return;
		}

		super.validateObjectFieldSettingsDefaultValue(
			objectField, objectFieldSettingsValuesMap);

		String defaultValue = objectFieldSettingsValuesMap.get(
			ObjectFieldSettingConstants.NAME_DEFAULT_VALUE);

		if (Validator.isNull(defaultValue)) {
			return;
		}

		String normalizedDefaultValue = StringUtil.toLowerCase(defaultValue);

		if (!_isValidEmail(normalizedDefaultValue)) {
			throw new ObjectFieldSettingValueException.InvalidValue(
				objectField.getName(),
				ObjectFieldSettingConstants.NAME_DEFAULT_VALUE, defaultValue);
		}
	}

	private String _getDomain(String email) {
		int index = email.indexOf('@');

		if (index < 0) {
			return email;
		}

		return email.substring(index + 1);
	}

	private boolean _isValidEmail(String email) {
		if (Validator.isNull(email)) {
			return false;
		}

		Matcher matcher = _emailPattern.matcher(email);

		return matcher.matches();
	}

	private static final Pattern _emailPattern = Pattern.compile(
		"^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$");

	@Reference
	private Language _language;

}