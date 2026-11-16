/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.content.marketing.platform.web.internal.service.test;

import com.liferay.arquillian.extension.junit.bridge.junit.Arquillian;
import com.liferay.content.marketing.platform.test.util.CMPTestUtil;
import com.liferay.depot.service.DepotEntryLocalService;
import com.liferay.object.exception.ObjectEntryValuesException;
import com.liferay.object.exception.ObjectValidationRuleEngineException;
import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.model.ObjectEntry;
import com.liferay.object.service.ObjectDefinitionLocalService;
import com.liferay.object.service.ObjectEntryLocalService;
import com.liferay.object.validation.rule.ObjectValidationRuleResult;
import com.liferay.petra.function.UnsafeRunnable;
import com.liferay.petra.lang.CentralizedThreadLocal;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.exception.ModelListenerException;
import com.liferay.portal.kernel.test.rule.AggregateTestRule;
import com.liferay.portal.kernel.test.util.RandomTestUtil;
import com.liferay.portal.kernel.test.util.ServiceContextTestUtil;
import com.liferay.portal.kernel.test.util.TestPropsValues;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.MapUtil;
import com.liferay.portal.test.mail.MailServiceTestUtil;
import com.liferay.portal.test.rule.FeatureFlag;
import com.liferay.portal.test.rule.Inject;
import com.liferay.portal.test.rule.LiferayIntegrationTestRule;
import com.liferay.portal.test.rule.PermissionCheckerMethodTestRule;
import com.liferay.portal.test.rule.SynchronousMailTestRule;

import java.io.Serializable;

import java.util.List;

import org.junit.Assert;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * @author Guilherme Camacho
 */
@RunWith(Arquillian.class)
public class ObjectEntryLocalServiceTest {

	@ClassRule
	@Rule
	public static final AggregateTestRule aggregateTestRule =
		new AggregateTestRule(
			new LiferayIntegrationTestRule(),
			PermissionCheckerMethodTestRule.INSTANCE,
			SynchronousMailTestRule.INSTANCE);

	@Before
	public void setUp() throws Exception {
		CMPTestUtil.getOrAddGroup(ObjectEntryLocalServiceTest.class);

		_cmpProjectLinkObjectDefinition =
			_objectDefinitionLocalService.
				getObjectDefinitionByExternalReferenceCode(
					"L_CMP_PROJECT_LINK", TestPropsValues.getCompanyId());
		_cmpTaskLinkObjectDefinition =
			_objectDefinitionLocalService.
				getObjectDefinitionByExternalReferenceCode(
					"L_CMP_TASK_LINK", TestPropsValues.getCompanyId());
		_cmpTaskObjectDefinition =
			_objectDefinitionLocalService.
				getObjectDefinitionByExternalReferenceCode(
					"L_CMP_TASK", TestPropsValues.getCompanyId());
	}

	@FeatureFlag("LPD-107678")
	@Test
	public void testAddCMPTaskObjectEntry() throws Exception {
		ObjectEntry cmpProjectObjectEntry =
			CMPTestUtil.addCMPProjectObjectEntry();

		ObjectEntry cmpTaskObjectEntry1 = CMPTestUtil.addCMPTaskObjectEntry(
			cmpProjectObjectEntry);

		ObjectEntry cmpTaskObjectEntry2 = _addCMPTaskObjectEntry(
			cmpTaskObjectEntry1);

		ObjectEntry cmpTaskObjectEntry3 = _addCMPTaskObjectEntry(
			cmpTaskObjectEntry2);

		_assertObjectValidationRuleResult(
			"L_CMP_TASK_DEPTH",
			() -> _addCMPTaskObjectEntry(cmpTaskObjectEntry3));

		try {
			_addCMPTaskObjectEntry(
				CMPTestUtil.addCMPProjectObjectEntry(), cmpTaskObjectEntry1,
				TestPropsValues.getUserId());

			Assert.fail();
		}
		catch (ObjectEntryValuesException.InvalidValue
					objectEntryValuesException) {

			Assert.assertEquals(
				"The value is invalid for object field " +
					"\"r_cmpTaskToCMPTasks_c_cmpTaskId\"",
				objectEntryValuesException.getMessage());
		}
	}

	@FeatureFlag(enable = false, value = "LPD-107678")
	@Test
	public void testAddCMPTaskObjectEntryWhenFeatureFlagIsDisabled()
		throws Exception {

		ObjectEntry cmpTaskObjectEntry = CMPTestUtil.addCMPTaskObjectEntry();

		_assertObjectValidationRuleResult(
			"L_CMP_TASK_PARENT",
			() -> _addCMPTaskObjectEntry(cmpTaskObjectEntry));
	}

	@Test
	public void testDeleteCMPProjectObjectEntry() throws Exception {
		ObjectEntry cmpProjectObjectEntry =
			CMPTestUtil.addCMPProjectObjectEntry();

		ObjectEntry cmpProjectLinkObjectEntry =
			_objectEntryLocalService.addObjectEntry(
				cmpProjectObjectEntry.getGroupId(),
				cmpProjectObjectEntry.getUserId(),
				_cmpProjectLinkObjectDefinition.getObjectDefinitionId(), 0,
				null,
				HashMapBuilder.<String, Serializable>put(
					"classExternalReferenceCode", RandomTestUtil.randomString()
				).put(
					"className", RandomTestUtil.randomString()
				).put(
					"groupExternalReferenceCode", RandomTestUtil.randomString()
				).put(
					"r_cmpProjectToCMPProjectLinks_c_cmpProjectId",
					cmpProjectObjectEntry.getObjectEntryId()
				).build(),
				ServiceContextTestUtil.getServiceContext());

		_objectEntryLocalService.deleteObjectEntry(
			cmpProjectObjectEntry.getObjectEntryId());

		Assert.assertNull(
			_objectEntryLocalService.fetchObjectEntry(
				cmpProjectLinkObjectEntry.getObjectEntryId()));
	}

	@FeatureFlag("LPD-107678")
	@Test
	public void testDeleteCMPTaskObjectEntry() throws Exception {
		ObjectEntry cmpTaskObjectEntry = CMPTestUtil.addCMPTaskObjectEntry();

		ObjectEntry cmpTaskLinkObjectEntry =
			_objectEntryLocalService.addObjectEntry(
				cmpTaskObjectEntry.getGroupId(), cmpTaskObjectEntry.getUserId(),
				_cmpTaskLinkObjectDefinition.getObjectDefinitionId(), 0, null,
				HashMapBuilder.<String, Serializable>put(
					"classExternalReferenceCode", RandomTestUtil.randomString()
				).put(
					"className", RandomTestUtil.randomString()
				).put(
					"groupExternalReferenceCode", RandomTestUtil.randomString()
				).put(
					"r_cmpTaskToCMPTaskLinks_c_cmpTaskId",
					cmpTaskObjectEntry.getObjectEntryId()
				).build(),
				ServiceContextTestUtil.getServiceContext());

		ObjectEntry cmpSubtaskObjectEntry = _addCMPTaskObjectEntry(
			cmpTaskObjectEntry);

		ObjectEntry cmpSubtaskLinkObjectEntry =
			CMPTestUtil.addCMPTaskLinkObjectEntry(cmpSubtaskObjectEntry);

		ObjectEntry cmpSubsubtaskObjectEntry = _addCMPTaskObjectEntry(
			cmpSubtaskObjectEntry);

		_objectEntryLocalService.deleteObjectEntry(
			cmpTaskObjectEntry.getObjectEntryId());

		Assert.assertNull(
			_objectEntryLocalService.fetchObjectEntry(
				cmpSubsubtaskObjectEntry.getObjectEntryId()));
		Assert.assertNull(
			_objectEntryLocalService.fetchObjectEntry(
				cmpSubtaskLinkObjectEntry.getObjectEntryId()));
		Assert.assertNull(
			_objectEntryLocalService.fetchObjectEntry(
				cmpSubtaskObjectEntry.getObjectEntryId()));
		Assert.assertNull(
			_objectEntryLocalService.fetchObjectEntry(
				cmpTaskLinkObjectEntry.getObjectEntryId()));
	}

	@Test
	public void testUpdateCMPProjectObjectEntry() throws Exception {
		_testUpdateCMPObjectEntry(CMPTestUtil.addCMPProjectObjectEntry());
	}

	@FeatureFlag("LPD-107678")
	@Test
	public void testUpdateCMPTaskObjectEntry() throws Exception {
		ObjectEntry cmpProjectObjectEntry =
			CMPTestUtil.addCMPProjectObjectEntry();

		ObjectEntry cmpTaskObjectEntry1 = CMPTestUtil.addCMPTaskObjectEntry(
			cmpProjectObjectEntry);

		_testUpdateCMPObjectEntry(cmpTaskObjectEntry1);

		ObjectEntry cmpTaskObjectEntry2 = _addCMPTaskObjectEntry(
			cmpTaskObjectEntry1);

		CentralizedThreadLocal.clearShortLivedCentralizedThreadLocals();

		_testUpdateCMPObjectEntry(cmpTaskObjectEntry2);

		CentralizedThreadLocal.clearShortLivedCentralizedThreadLocals();

		_assertObjectValidationRuleResult(
			"L_CMP_TASK_PARENT",
			() -> _objectEntryLocalService.updateObjectEntry(
				TestPropsValues.getUserId(),
				cmpTaskObjectEntry2.getObjectEntryId(),
				cmpTaskObjectEntry2.getObjectEntryFolderId(),
				HashMapBuilder.<String, Serializable>putAll(
					cmpTaskObjectEntry2.getValues()
				).put(
					"r_cmpTaskToCMPTasks_c_cmpTaskId",
					() -> {
						ObjectEntry cmpTaskObjectEntry3 =
							CMPTestUtil.addCMPTaskObjectEntry(
								cmpProjectObjectEntry);

						return cmpTaskObjectEntry3.getObjectEntryId();
					}
				).build(),
				ServiceContextTestUtil.getServiceContext()));
	}

	private ObjectEntry _addCMPTaskObjectEntry(ObjectEntry cmpTaskObjectEntry)
		throws Exception {

		return _addCMPTaskObjectEntry(
			_objectEntryLocalService.getObjectEntry(
				MapUtil.getLong(
					cmpTaskObjectEntry.getValues(),
					"r_cmpProjectToCMPTasks_c_cmpProjectId")),
			cmpTaskObjectEntry, cmpTaskObjectEntry.getUserId());
	}

	private ObjectEntry _addCMPTaskObjectEntry(
			ObjectEntry cmpProjectObjectEntry, ObjectEntry cmpTaskObjectEntry,
			long userId)
		throws Exception {

		long cmpTaskObjectEntryId = 0;

		if (cmpTaskObjectEntry != null) {
			cmpTaskObjectEntryId = cmpTaskObjectEntry.getObjectEntryId();
		}

		return _objectEntryLocalService.addObjectEntry(
			cmpProjectObjectEntry.getGroupId(), userId,
			_cmpTaskObjectDefinition.getObjectDefinitionId(), 0, null,
			HashMapBuilder.<String, Serializable>put(
				"r_cmpProjectToCMPTasks_c_cmpProjectId",
				cmpProjectObjectEntry.getObjectEntryId()
			).put(
				"r_cmpTaskToCMPTasks_c_cmpTaskId", cmpTaskObjectEntryId
			).put(
				"title", RandomTestUtil.randomString()
			).build(),
			ServiceContextTestUtil.getServiceContext());
	}

	private void _assertObjectValidationRuleResult(
			String externalReferenceCode,
			UnsafeRunnable<Exception> unsafeRunnable)
		throws Exception {

		try {
			unsafeRunnable.run();

			Assert.fail();
		}
		catch (ModelListenerException modelListenerException) {
			ObjectValidationRuleEngineException
				objectValidationRuleEngineException =
					(ObjectValidationRuleEngineException)
						modelListenerException.getCause();

			List<ObjectValidationRuleResult> objectValidationRuleResults =
				objectValidationRuleEngineException.
					getObjectValidationRuleResults();

			Assert.assertEquals(
				objectValidationRuleResults.toString(), 1,
				objectValidationRuleResults.size());

			ObjectValidationRuleResult objectValidationRuleResult =
				objectValidationRuleResults.get(0);

			Assert.assertEquals(
				externalReferenceCode,
				objectValidationRuleResult.getExternalReferenceCode());
		}
	}

	private void _testUpdateCMPObjectEntry(ObjectEntry cmpObjectEntry)
		throws Exception {

		_objectEntryLocalService.subscribeObjectEntry(
			TestPropsValues.getUserId(), cmpObjectEntry.getGroupId(),
			cmpObjectEntry.getObjectEntryId());

		_objectEntryLocalService.updateObjectEntry(
			TestPropsValues.getUserId(), cmpObjectEntry.getObjectEntryId(),
			cmpObjectEntry.getObjectEntryFolderId(),
			HashMapBuilder.<String, Serializable>putAll(
				cmpObjectEntry.getValues()
			).put(
				"description",
				StringBundler.concat(
					"<p><strong>bold</strong></p><p><img src=\"",
					RandomTestUtil.randomString(),
					"\"></p><figure class=\"media\"><oembed url=\"",
					RandomTestUtil.randomString(),
					"\"></oembed></figure><p><iframe data-video-liferay src=\"",
					RandomTestUtil.randomString(), "\"></iframe></p>")
			).build(),
			ServiceContextTestUtil.getServiceContext());

		Assert.assertTrue(
			MailServiceTestUtil.lastMailMessageContains(
				"<p><strong>bold</strong></p><p>[Image]</p><figure " +
					"class=\"media\">[Video]</figure><p>[Video]</p>"));
	}

	private ObjectDefinition _cmpProjectLinkObjectDefinition;
	private ObjectDefinition _cmpTaskLinkObjectDefinition;
	private ObjectDefinition _cmpTaskObjectDefinition;

	@Inject
	private DepotEntryLocalService _depotEntryLocalService;

	@Inject
	private ObjectDefinitionLocalService _objectDefinitionLocalService;

	@Inject
	private ObjectEntryLocalService _objectEntryLocalService;

}