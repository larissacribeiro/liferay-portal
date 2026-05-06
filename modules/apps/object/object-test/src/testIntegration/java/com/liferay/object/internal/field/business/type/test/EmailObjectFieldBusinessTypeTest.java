/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.object.internal.field.business.type.test;

import com.liferay.arquillian.extension.junit.bridge.junit.Arquillian;
import com.liferay.object.constants.ObjectFieldConstants;
import com.liferay.object.constants.ObjectFieldSettingConstants;
import com.liferay.object.exception.ObjectEntryValuesException;
import com.liferay.object.exception.ObjectFieldSettingValueException;
import com.liferay.object.field.builder.EmailObjectFieldBuilder;
import com.liferay.object.field.business.type.ObjectFieldBusinessType;
import com.liferay.object.field.business.type.ObjectFieldBusinessTypeRegistry;
import com.liferay.object.field.setting.builder.ObjectFieldSettingBuilder;
import com.liferay.object.field.util.ObjectFieldUtil;
import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.model.ObjectField;
import com.liferay.object.test.util.ObjectDefinitionTestUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.test.AssertUtils;
import com.liferay.portal.kernel.test.rule.AggregateTestRule;
import com.liferay.portal.kernel.test.rule.DeleteAfterTestRun;
import com.liferay.portal.kernel.test.util.RandomTestUtil;
import com.liferay.portal.kernel.test.util.TestPropsValues;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.test.rule.FeatureFlag;
import com.liferay.portal.test.rule.Inject;
import com.liferay.portal.test.rule.LiferayIntegrationTestRule;
import com.liferay.portal.vulcan.util.LocalizedMapUtil;

import java.util.Arrays;
import java.util.Collections;

import org.junit.Assert;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * @author Nathaly Gomes
 */
@FeatureFlag("LPD-70673")
@RunWith(Arquillian.class)
public class EmailObjectFieldBusinessTypeTest {

	@ClassRule
	@Rule
	public static final AggregateTestRule aggregateTestRule =
		new LiferayIntegrationTestRule();

	@Before
	public void setUp() throws Exception {
		_objectDefinition = ObjectDefinitionTestUtil.publishObjectDefinition();

		_objectField = ObjectFieldUtil.addCustomObjectField(
			new EmailObjectFieldBuilder(
			).labelMap(
				LocalizedMapUtil.getLocalizedMap(RandomTestUtil.randomString())
			).name(
				_OBJECT_FIELD_NAME
			).objectDefinitionId(
				_objectDefinition.getObjectDefinitionId()
			).userId(
				TestPropsValues.getUserId()
			).build());

		_objectFieldBusinessType =
			_objectFieldBusinessTypeRegistry.getObjectFieldBusinessType(
				ObjectFieldConstants.BUSINESS_TYPE_EMAIL);
	}

	@Test
	public void testProcessValue() throws Exception {

		// Empty value passes through

		Assert.assertEquals(
			"", _objectFieldBusinessType.processValue(_objectField, ""));

		// Valid email is normalized to lowercase

		Assert.assertEquals(
			"user@example.com",
			_objectFieldBusinessType.processValue(
				_objectField, "User@Example.com"));
		Assert.assertEquals(
			"user@example.com",
			_objectFieldBusinessType.processValue(
				_objectField, "user@example.com"));

		// Invalid email throws

		AssertUtils.assertFailure(
			ObjectEntryValuesException.InvalidEmailAddress.class,
			StringBundler.concat(
				"The email address \"not-an-email\" is invalid for object ",
				"field \"", _OBJECT_FIELD_NAME, "\""),
			() -> _objectFieldBusinessType.processValue(
				_objectField, "not-an-email"));
		AssertUtils.assertFailure(
			ObjectEntryValuesException.InvalidEmailAddress.class,
			StringBundler.concat(
				"The email address \"missing@\" is invalid for object field \"",
				_OBJECT_FIELD_NAME, "\""),
			() -> _objectFieldBusinessType.processValue(
				_objectField, "missing@"));

		// Blocked domain

		ObjectField objectFieldWithBlockedDomains =
			ObjectFieldUtil.addCustomObjectField(
				new EmailObjectFieldBuilder(
				).labelMap(
					LocalizedMapUtil.getLocalizedMap(
						RandomTestUtil.randomString())
				).name(
					"a" + RandomTestUtil.randomString()
				).objectDefinitionId(
					_objectDefinition.getObjectDefinitionId()
				).objectFieldSettings(
					Collections.singletonList(
						new ObjectFieldSettingBuilder(
						).name(
							ObjectFieldSettingConstants.NAME_BLOCKED_DOMAINS
						).value(
							"blocked.com,restricted.org"
						).build())
				).userId(
					TestPropsValues.getUserId()
				).build());

		AssertUtils.assertFailure(
			ObjectEntryValuesException.BlockedEmailDomain.class,
			StringBundler.concat(
				"The email domain \"blocked.com\" is blocked for object field \"",
				objectFieldWithBlockedDomains.getName(), "\""),
			() -> _objectFieldBusinessType.processValue(
				objectFieldWithBlockedDomains, "user@blocked.com"));
		AssertUtils.assertFailure(
			ObjectEntryValuesException.BlockedEmailDomain.class,
			StringBundler.concat(
				"The email domain \"blocked.com\" is blocked for object field \"",
				objectFieldWithBlockedDomains.getName(), "\""),
			() -> _objectFieldBusinessType.processValue(
				objectFieldWithBlockedDomains, "User@Blocked.com"));

		Assert.assertEquals(
			"user@allowed.com",
			_objectFieldBusinessType.processValue(
				objectFieldWithBlockedDomains, "user@allowed.com"));
	}

	@Test
	public void testValidateObjectFieldSettings() throws Exception {

		// Invalid autocompleteEnabled value

		AssertUtils.assertFailure(
			ObjectFieldSettingValueException.InvalidValue.class,
			StringBundler.concat(
				"The value invalid of setting \"autocompleteEnabled\" is ",
				"invalid for object field \"", _OBJECT_FIELD_NAME, "\""),
			() -> _objectFieldBusinessType.validateObjectFieldSettings(
				_objectField,
				Collections.singletonList(
					new ObjectFieldSettingBuilder(
					).name(
						ObjectFieldSettingConstants.NAME_AUTOCOMPLETE_ENABLED
					).value(
						"invalid"
					).build())));

		// Invalid uniqueValues value

		AssertUtils.assertFailure(
			ObjectFieldSettingValueException.InvalidValue.class,
			StringBundler.concat(
				"The value invalid of setting \"uniqueValues\" is invalid for ",
				"object field \"", _OBJECT_FIELD_NAME, "\""),
			() -> _objectFieldBusinessType.validateObjectFieldSettings(
				_objectField,
				Collections.singletonList(
					new ObjectFieldSettingBuilder(
					).name(
						ObjectFieldSettingConstants.NAME_UNIQUE_VALUES
					).value(
						"invalid"
					).build())));

		// Valid settings

		_objectFieldBusinessType.validateObjectFieldSettings(
			_objectField,
			Arrays.asList(
				new ObjectFieldSettingBuilder(
				).name(
					ObjectFieldSettingConstants.NAME_AUTOCOMPLETE_ENABLED
				).value(
					"true"
				).build(),
				new ObjectFieldSettingBuilder(
				).name(
					ObjectFieldSettingConstants.NAME_AUTOCOMPLETE_DOMAINS
				).value(
					"liferay.com,gmail.com"
				).build()));
		_objectFieldBusinessType.validateObjectFieldSettings(
			_objectField, Collections.emptyList());
	}

	@Test
	public void testValidateObjectFieldSettingsDefaultValue() throws Exception {

		// Invalid default value

		AssertUtils.assertFailure(
			ObjectFieldSettingValueException.InvalidValue.class,
			StringBundler.concat(
				"The value not-an-email of setting \"defaultValue\" is invalid ",
				"for object field \"", _OBJECT_FIELD_NAME, "\""),
			() ->
				_objectFieldBusinessType.
					validateObjectFieldSettingsDefaultValue(
						_objectField,
						HashMapBuilder.put(
							ObjectFieldSettingConstants.NAME_DEFAULT_VALUE,
							"not-an-email"
						).put(
							ObjectFieldSettingConstants.NAME_DEFAULT_VALUE_TYPE,
							ObjectFieldSettingConstants.VALUE_INPUT_AS_VALUE
						).build()));

		// Valid default value

		_objectFieldBusinessType.validateObjectFieldSettingsDefaultValue(
			_objectField,
			HashMapBuilder.put(
				ObjectFieldSettingConstants.NAME_DEFAULT_VALUE,
				"user@example.com"
			).put(
				ObjectFieldSettingConstants.NAME_DEFAULT_VALUE_TYPE,
				ObjectFieldSettingConstants.VALUE_INPUT_AS_VALUE
			).build());
		_objectFieldBusinessType.validateObjectFieldSettingsDefaultValue(
			_objectField,
			HashMapBuilder.put(
				ObjectFieldSettingConstants.NAME_DEFAULT_VALUE,
				"User@Example.com"
			).put(
				ObjectFieldSettingConstants.NAME_DEFAULT_VALUE_TYPE,
				ObjectFieldSettingConstants.VALUE_INPUT_AS_VALUE
			).build());
	}

	private static final String _OBJECT_FIELD_NAME =
		"a" + RandomTestUtil.randomString();

	@DeleteAfterTestRun
	private ObjectDefinition _objectDefinition;

	private ObjectField _objectField;
	private ObjectFieldBusinessType _objectFieldBusinessType;

	@Inject
	private ObjectFieldBusinessTypeRegistry _objectFieldBusinessTypeRegistry;

}