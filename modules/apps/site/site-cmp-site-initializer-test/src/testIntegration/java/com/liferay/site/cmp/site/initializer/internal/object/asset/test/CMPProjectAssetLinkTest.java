/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.site.cmp.site.initializer.internal.object.asset.test;

import com.liferay.arquillian.extension.junit.bridge.junit.Arquillian;
import com.liferay.object.exception.ObjectValidationRuleEngineException;
import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.model.ObjectEntry;
import com.liferay.object.model.ObjectRelationship;
import com.liferay.object.service.ObjectDefinitionLocalService;
import com.liferay.object.service.ObjectEntryLocalService;
import com.liferay.object.service.ObjectRelationshipLocalService;
import com.liferay.portal.kernel.dao.orm.QueryUtil;
import com.liferay.portal.kernel.test.AssertUtils;
import com.liferay.portal.kernel.test.rule.AggregateTestRule;
import com.liferay.portal.kernel.test.util.RandomTestUtil;
import com.liferay.portal.kernel.test.util.ServiceContextTestUtil;
import com.liferay.portal.kernel.test.util.TestPropsValues;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.test.rule.FeatureFlag;
import com.liferay.portal.test.rule.FeatureFlags;
import com.liferay.portal.test.rule.Inject;
import com.liferay.portal.test.rule.LiferayIntegrationTestRule;
import com.liferay.portal.test.rule.PermissionCheckerMethodTestRule;
import com.liferay.site.cmp.site.initializer.test.util.CMPTestUtil;

import java.io.Serializable;

import java.util.List;
import java.util.Map;

import org.junit.Assert;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * @author Guilherme Camacho
 */
@FeatureFlags(
	featureFlags = {@FeatureFlag("LPD-17564"), @FeatureFlag("LPD-58677")}
)
@RunWith(Arquillian.class)
public class CMPProjectAssetLinkTest {

	@ClassRule
	@Rule
	public static final AggregateTestRule aggregateTestRule =
		new AggregateTestRule(
			new LiferayIntegrationTestRule(),
			PermissionCheckerMethodTestRule.INSTANCE);

	@Before
	public void setUp() throws Exception {
		CMPTestUtil.getOrAddGroup(CMPProjectAssetLinkTest.class);
	}

	@Test
	public void testAddDuplicateProjectAssetLinkFails() throws Exception {
		ObjectEntry projectObjectEntry = CMPTestUtil.addProjectObjectEntry();

		String className = RandomTestUtil.randomString();
		String classExternalReferenceCode = RandomTestUtil.randomString();
		String scopeKey = RandomTestUtil.randomString();

		_addProjectAssetLinkObjectEntry(
			projectObjectEntry, className, classExternalReferenceCode,
			scopeKey);

		AssertUtils.assertFailure(
			ObjectValidationRuleEngineException.class,
			"This asset is already linked to this project.",
			() -> _addProjectAssetLinkObjectEntry(
				projectObjectEntry, className, classExternalReferenceCode,
				scopeKey));
	}

	@Test
	public void testAddProjectAssetLink() throws Exception {
		ObjectEntry projectObjectEntry = CMPTestUtil.addProjectObjectEntry();

		String className = RandomTestUtil.randomString();
		String classExternalReferenceCode = RandomTestUtil.randomString();
		String scopeKey = RandomTestUtil.randomString();

		ObjectEntry projectAssetLinkObjectEntry =
			_addProjectAssetLinkObjectEntry(
				projectObjectEntry, className, classExternalReferenceCode,
				scopeKey);

		Map<String, Serializable> values = _objectEntryLocalService.getValues(
			projectAssetLinkObjectEntry.getObjectEntryId());

		Assert.assertEquals(className, values.get("className"));
		Assert.assertEquals(
			classExternalReferenceCode,
			values.get("classExternalReferenceCode"));
		Assert.assertEquals(scopeKey, values.get("scopeKey"));

		List<ObjectEntry> projectAssetLinkObjectEntries =
			_getProjectAssetLinkObjectEntries(projectObjectEntry);

		Assert.assertEquals(
			projectAssetLinkObjectEntries.toString(), 1,
			projectAssetLinkObjectEntries.size());
	}

	@Test
	public void testAddSameAssetToDifferentProjects() throws Exception {
		String className = RandomTestUtil.randomString();
		String classExternalReferenceCode = RandomTestUtil.randomString();
		String scopeKey = RandomTestUtil.randomString();

		_addProjectAssetLinkObjectEntry(
			CMPTestUtil.addProjectObjectEntry(), className,
			classExternalReferenceCode, scopeKey);

		Assert.assertNotNull(
			_addProjectAssetLinkObjectEntry(
				CMPTestUtil.addProjectObjectEntry(), className,
				classExternalReferenceCode, scopeKey));
	}

	@Test
	public void testDeleteProjectCascadesProjectAssetLinks() throws Exception {
		ObjectEntry projectObjectEntry = CMPTestUtil.addProjectObjectEntry();

		ObjectEntry projectAssetLinkObjectEntry =
			_addProjectAssetLinkObjectEntry(
				projectObjectEntry, RandomTestUtil.randomString(),
				RandomTestUtil.randomString(), RandomTestUtil.randomString());

		_objectEntryLocalService.deleteObjectEntry(
			projectObjectEntry.getObjectEntryId());

		Assert.assertNull(
			_objectEntryLocalService.fetchObjectEntry(
				projectAssetLinkObjectEntry.getObjectEntryId()));
	}

	private ObjectEntry _addProjectAssetLinkObjectEntry(
			ObjectEntry projectObjectEntry, String className,
			String classExternalReferenceCode, String scopeKey)
		throws Exception {

		ObjectDefinition objectDefinition =
			_objectDefinitionLocalService.
				getObjectDefinitionByExternalReferenceCode(
					"L_CMP_PROJECT_ASSET_RELATIONSHIP",
					TestPropsValues.getCompanyId());

		return _objectEntryLocalService.addObjectEntry(
			projectObjectEntry.getGroupId(), projectObjectEntry.getUserId(),
			objectDefinition.getObjectDefinitionId(), 0, null,
			HashMapBuilder.<String, Serializable>put(
				"classExternalReferenceCode", classExternalReferenceCode
			).put(
				"className", className
			).put(
				"r_cmpProjectAssetLinks_c_cmpProjectId",
				projectObjectEntry.getObjectEntryId()
			).put(
				"scopeKey", scopeKey
			).build(),
			ServiceContextTestUtil.getServiceContext());
	}

	private List<ObjectEntry> _getProjectAssetLinkObjectEntries(
			ObjectEntry projectObjectEntry)
		throws Exception {

		ObjectRelationship objectRelationship =
			_objectRelationshipLocalService.
				fetchObjectRelationshipByExternalReferenceCode(
					"L_CMP_PROJECT_TO_L_CMP_PROJECT_ASSET_RELATIONSHIPS",
					projectObjectEntry.getObjectDefinitionId());

		return _objectEntryLocalService.getOneToManyObjectEntries(
			projectObjectEntry.getGroupId(),
			objectRelationship.getObjectRelationshipId(), null, false,
			projectObjectEntry.getObjectEntryId(), true, null,
			QueryUtil.ALL_POS, QueryUtil.ALL_POS, null);
	}

	@Inject
	private ObjectDefinitionLocalService _objectDefinitionLocalService;

	@Inject
	private ObjectEntryLocalService _objectEntryLocalService;

	@Inject
	private ObjectRelationshipLocalService _objectRelationshipLocalService;

}