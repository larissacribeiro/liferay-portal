/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.content.marketing.platform.web.internal.upgrade.v2_2_0.test;

import com.liferay.arquillian.extension.junit.bridge.junit.Arquillian;
import com.liferay.content.marketing.platform.test.util.CMPTestUtil;
import com.liferay.fragment.constants.FragmentConstants;
import com.liferay.fragment.entry.processor.constants.FragmentEntryProcessorConstants;
import com.liferay.fragment.model.FragmentEntryLink;
import com.liferay.fragment.service.FragmentEntryLinkLocalService;
import com.liferay.layout.page.template.model.LayoutPageTemplateEntry;
import com.liferay.layout.page.template.model.LayoutPageTemplateStructure;
import com.liferay.layout.page.template.service.LayoutPageTemplateStructureLocalService;
import com.liferay.layout.page.template.test.util.DisplayPageTemplateTestUtil;
import com.liferay.layout.test.util.ContentLayoutTestUtil;
import com.liferay.layout.util.structure.FragmentStyledLayoutStructureItem;
import com.liferay.layout.util.structure.LayoutStructure;
import com.liferay.layout.util.structure.LayoutStructureItem;
import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.service.ObjectDefinitionLocalService;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.json.JSONUtil;
import com.liferay.portal.kernel.model.Group;
import com.liferay.portal.kernel.model.Layout;
import com.liferay.portal.kernel.service.LayoutLocalService;
import com.liferay.portal.kernel.test.rule.AggregateTestRule;
import com.liferay.portal.kernel.test.rule.DeleteAfterTestRun;
import com.liferay.portal.kernel.test.util.TestPropsValues;
import com.liferay.portal.kernel.upgrade.UpgradeProcess;
import com.liferay.portal.kernel.util.PortalUtil;
import com.liferay.portal.kernel.util.SetUtil;
import com.liferay.portal.kernel.workflow.WorkflowConstants;
import com.liferay.portal.test.rule.Inject;
import com.liferay.portal.test.rule.LiferayIntegrationTestRule;
import com.liferay.portal.test.rule.PermissionCheckerMethodTestRule;
import com.liferay.portal.upgrade.registry.UpgradeStepRegistrator;
import com.liferay.portal.upgrade.test.util.UpgradeTestUtil;
import com.liferay.segments.service.SegmentsExperienceLocalService;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import org.junit.Assert;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * @author Larissa Ribeiro
 */
@RunWith(Arquillian.class)
public class CMPTaskDisplayPageTemplateUpgradeProcessTest {

	@ClassRule
	@Rule
	public static final AggregateTestRule aggregateTestRule =
		new AggregateTestRule(
			new LiferayIntegrationTestRule(),
			PermissionCheckerMethodTestRule.INSTANCE);

	@Before
	public void setUp() throws Exception {
		ObjectDefinition cmpTaskObjectDefinition =
			_objectDefinitionLocalService.
				getObjectDefinitionByExternalReferenceCode(
					"L_CMP_TASK", TestPropsValues.getCompanyId());
		Group group = CMPTestUtil.getOrAddGroup(
			CMPTaskDisplayPageTemplateUpgradeProcessTest.class);

		_layoutPageTemplateEntry1 =
			DisplayPageTemplateTestUtil.addDisplayPageTemplate(
				group.getGroupId(),
				PortalUtil.getClassNameId(
					cmpTaskObjectDefinition.getClassName()),
				null, false, WorkflowConstants.STATUS_APPROVED);
		_layoutPageTemplateEntry2 =
			DisplayPageTemplateTestUtil.addDisplayPageTemplate(
				group.getGroupId(),
				PortalUtil.getClassNameId(
					cmpTaskObjectDefinition.getClassName()),
				null, false, WorkflowConstants.STATUS_APPROVED);
	}

	@Test
	public void testUpgrade() throws Exception {
		Layout layout1 = _layoutLocalService.getLayout(
			_layoutPageTemplateEntry1.getPlid());

		_addFragmentEntryLink(
			_getEditableValues("ObjectField_dueDate"), layout1,
			"INPUTS-date-input", FragmentConstants.TYPE_INPUT, 0);
		_addFragmentEntryLink(
			StringPool.BLANK, layout1, _VIEW_RELATED_ASSETS_RENDERER_KEY,
			FragmentConstants.TYPE_COMPONENT, 1);

		Layout draftLayout1 = layout1.fetchDraftLayout();

		_addFragmentEntryLink(
			_getEditableValues("ObjectField_title"), draftLayout1,
			"INPUTS-date-input", FragmentConstants.TYPE_INPUT, 0);

		Layout layout2 = _layoutLocalService.getLayout(
			_layoutPageTemplateEntry2.getPlid());

		_addFragmentEntryLink(
			StringPool.BLANK, layout2, _VIEW_TASK_INFO_SUMMARY_RENDERER_KEY,
			FragmentConstants.TYPE_COMPONENT, 0);
		_addFragmentEntryLink(
			StringPool.BLANK, layout2, _VIEW_RELATED_ASSETS_RENDERER_KEY,
			FragmentConstants.TYPE_COMPONENT, 1);
		_addFragmentEntryLink(
			StringPool.BLANK, layout2, "BASIC_COMPONENT-heading",
			FragmentConstants.TYPE_COMPONENT, 2);

		Layout draftLayout2 = layout2.fetchDraftLayout();

		_addFragmentEntryLink(
			StringPool.BLANK, draftLayout2,
			_VIEW_TASK_INFO_SUMMARY_RENDERER_KEY,
			FragmentConstants.TYPE_COMPONENT, 0);
		_addFragmentEntryLink(
			StringPool.BLANK, draftLayout2, _VIEW_RELATED_ASSETS_RENDERER_KEY,
			FragmentConstants.TYPE_COMPONENT, 1);
		_addFragmentEntryLink(
			StringPool.BLANK, draftLayout2, _VIEW_SUBTASKS_RENDERER_KEY,
			FragmentConstants.TYPE_COMPONENT, 2);

		UpgradeProcess upgradeProcess = UpgradeTestUtil.getUpgradeStep(
			_upgradeStepRegistrator,
			"com.liferay.content.marketing.platform.web.internal.upgrade." +
				"v2_2_0.CMPTaskDisplayPageTemplateUpgradeProcess");

		upgradeProcess.upgrade();
		upgradeProcess.upgrade();

		Assert.assertEquals(
			Arrays.asList(
				"INPUTS-date-input", _DUE_DATE_ALERT_RENDERER_KEY,
				_VIEW_RELATED_ASSETS_RENDERER_KEY),
			_getRendererKeys(layout1));
		Assert.assertEquals(
			Arrays.asList("INPUTS-date-input"), _getRendererKeys(draftLayout1));
		Assert.assertEquals(
			Arrays.asList(
				_VIEW_TASK_INFO_SUMMARY_RENDERER_KEY,
				_VIEW_RELATED_ASSETS_RENDERER_KEY, _VIEW_SUBTASKS_RENDERER_KEY,
				"BASIC_COMPONENT-heading"),
			_getRendererKeys(layout2));
		Assert.assertEquals(
			SetUtil.fromArray("px-4"),
			_getCssClasses(layout2, _VIEW_SUBTASKS_RENDERER_KEY));
		Assert.assertEquals(
			Arrays.asList(
				_VIEW_TASK_INFO_SUMMARY_RENDERER_KEY,
				_VIEW_RELATED_ASSETS_RENDERER_KEY, _VIEW_SUBTASKS_RENDERER_KEY),
			_getRendererKeys(draftLayout2));
	}

	private void _addFragmentEntryLink(
			String editableValues, Layout layout, String rendererKey, int type,
			int position)
		throws Exception {

		ContentLayoutTestUtil.addFragmentEntryLinkToLayout(
			editableValues, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, layout, rendererKey, type, null, position,
			_segmentsExperienceLocalService.fetchDefaultSegmentsExperienceId(
				layout.getPlid()));
	}

	private Set<String> _getCssClasses(Layout layout, String rendererKey) {
		LayoutStructure layoutStructure = _getLayoutStructure(layout);

		for (FragmentEntryLink fragmentEntryLink :
				_fragmentEntryLinkLocalService.getFragmentEntryLinksByPlid(
					layout.getGroupId(), layout.getPlid())) {

			if (rendererKey.equals(fragmentEntryLink.getRendererKey())) {
				FragmentStyledLayoutStructureItem
					fragmentStyledLayoutStructureItem =
						(FragmentStyledLayoutStructureItem)
							layoutStructure.
								getLayoutStructureItemByFragmentEntryLinkId(
									fragmentEntryLink.getFragmentEntryLinkId());

				return fragmentStyledLayoutStructureItem.getCssClasses();
			}
		}

		return null;
	}

	private String _getEditableValues(String inputFieldId) {
		return JSONUtil.put(
			FragmentEntryProcessorConstants.
				KEY_FREEMARKER_FRAGMENT_ENTRY_PROCESSOR,
			JSONUtil.put("inputFieldId", inputFieldId)
		).toString();
	}

	private LayoutStructure _getLayoutStructure(Layout layout) {
		LayoutPageTemplateStructure layoutPageTemplateStructure =
			_layoutPageTemplateStructureLocalService.
				fetchLayoutPageTemplateStructure(
					layout.getGroupId(), layout.getPlid());

		return LayoutStructure.of(
			layoutPageTemplateStructure.getData(
				_segmentsExperienceLocalService.
					fetchDefaultSegmentsExperienceId(layout.getPlid())));
	}

	private List<String> _getRendererKeys(Layout layout) throws Exception {
		List<String> rendererKeys = new ArrayList<>();

		LayoutStructure layoutStructure = _getLayoutStructure(layout);

		LayoutStructureItem mainLayoutStructureItem =
			layoutStructure.getMainLayoutStructureItem();

		for (String itemId : mainLayoutStructureItem.getChildrenItemIds()) {
			FragmentStyledLayoutStructureItem
				fragmentStyledLayoutStructureItem =
					(FragmentStyledLayoutStructureItem)
						layoutStructure.getLayoutStructureItem(itemId);

			FragmentEntryLink fragmentEntryLink =
				_fragmentEntryLinkLocalService.getFragmentEntryLink(
					fragmentStyledLayoutStructureItem.getFragmentEntryLinkId());

			rendererKeys.add(fragmentEntryLink.getRendererKey());
		}

		return rendererKeys;
	}

	private static final String _DUE_DATE_ALERT_RENDERER_KEY =
		"com.liferay.content.marketing.platform.web.internal.fragment." +
			"renderer.DueDateAlertComponentSectionFragmentRenderer";

	private static final String _VIEW_RELATED_ASSETS_RENDERER_KEY =
		"com.liferay.site.cms.site.initializer.internal.fragment.renderer." +
			"ViewRelatedAssetsJSPSectionFragmentRenderer";

	private static final String _VIEW_SUBTASKS_RENDERER_KEY =
		"com.liferay.content.marketing.platform.web.internal.fragment." +
			"renderer.ViewSubtasksJSPSectionFragmentRenderer";

	private static final String _VIEW_TASK_INFO_SUMMARY_RENDERER_KEY =
		"com.liferay.content.marketing.platform.web.internal.fragment." +
			"renderer.ViewTaskInfoSummaryJSPSectionFragmentRenderer";

	@Inject
	private FragmentEntryLinkLocalService _fragmentEntryLinkLocalService;

	@Inject
	private LayoutLocalService _layoutLocalService;

	@DeleteAfterTestRun
	private LayoutPageTemplateEntry _layoutPageTemplateEntry1;

	@DeleteAfterTestRun
	private LayoutPageTemplateEntry _layoutPageTemplateEntry2;

	@Inject
	private LayoutPageTemplateStructureLocalService
		_layoutPageTemplateStructureLocalService;

	@Inject
	private ObjectDefinitionLocalService _objectDefinitionLocalService;

	@Inject
	private SegmentsExperienceLocalService _segmentsExperienceLocalService;

	@Inject(
		filter = "component.name=com.liferay.content.marketing.platform.web.internal.upgrade.registry.CMPSiteInitializerUpgradeStepRegistrator"
	)
	private UpgradeStepRegistrator _upgradeStepRegistrator;

}