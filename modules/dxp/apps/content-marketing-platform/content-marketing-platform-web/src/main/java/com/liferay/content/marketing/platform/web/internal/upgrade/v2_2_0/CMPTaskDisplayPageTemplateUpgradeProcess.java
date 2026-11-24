/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.content.marketing.platform.web.internal.upgrade.v2_2_0;

import com.liferay.content.marketing.platform.web.internal.fragment.renderer.DueDateAlertComponentSectionFragmentRenderer;
import com.liferay.content.marketing.platform.web.internal.fragment.renderer.ViewSubtasksJSPSectionFragmentRenderer;
import com.liferay.content.marketing.platform.web.internal.fragment.renderer.ViewTaskInfoSummaryJSPSectionFragmentRenderer;
import com.liferay.fragment.entry.processor.constants.FragmentEntryProcessorConstants;
import com.liferay.fragment.model.FragmentEntryLink;
import com.liferay.fragment.service.FragmentEntryLinkLocalService;
import com.liferay.layout.page.template.constants.LayoutPageTemplateEntryTypeConstants;
import com.liferay.layout.page.template.model.LayoutPageTemplateEntry;
import com.liferay.layout.page.template.model.LayoutPageTemplateStructure;
import com.liferay.layout.page.template.service.LayoutPageTemplateEntryLocalService;
import com.liferay.layout.page.template.service.LayoutPageTemplateStructureLocalService;
import com.liferay.layout.util.structure.LayoutStructure;
import com.liferay.layout.util.structure.LayoutStructureItem;
import com.liferay.layout.util.structure.StyledLayoutStructureItem;
import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.service.ObjectDefinitionLocalService;
import com.liferay.portal.kernel.json.JSONFactoryUtil;
import com.liferay.portal.kernel.json.JSONObject;
import com.liferay.portal.kernel.json.JSONUtil;
import com.liferay.portal.kernel.model.Group;
import com.liferay.portal.kernel.model.GroupConstants;
import com.liferay.portal.kernel.model.Layout;
import com.liferay.portal.kernel.service.ClassNameLocalService;
import com.liferay.portal.kernel.service.CompanyLocalService;
import com.liferay.portal.kernel.service.GroupLocalService;
import com.liferay.portal.kernel.service.LayoutLocalService;
import com.liferay.portal.kernel.service.ServiceContext;
import com.liferay.portal.kernel.upgrade.UpgradeProcess;
import com.liferay.portal.kernel.util.SetUtil;
import com.liferay.segments.service.SegmentsExperienceLocalService;

import java.util.List;
import java.util.Objects;

/**
 * @author Larissa Ribeiro
 */
public class CMPTaskDisplayPageTemplateUpgradeProcess extends UpgradeProcess {

	public CMPTaskDisplayPageTemplateUpgradeProcess(
		ClassNameLocalService classNameLocalService,
		CompanyLocalService companyLocalService,
		FragmentEntryLinkLocalService fragmentEntryLinkLocalService,
		GroupLocalService groupLocalService,
		LayoutLocalService layoutLocalService,
		LayoutPageTemplateEntryLocalService layoutPageTemplateEntryLocalService,
		LayoutPageTemplateStructureLocalService
			layoutPageTemplateStructureLocalService,
		ObjectDefinitionLocalService objectDefinitionLocalService,
		SegmentsExperienceLocalService segmentsExperienceLocalService) {

		_classNameLocalService = classNameLocalService;
		_companyLocalService = companyLocalService;
		_fragmentEntryLinkLocalService = fragmentEntryLinkLocalService;
		_groupLocalService = groupLocalService;
		_layoutLocalService = layoutLocalService;
		_layoutPageTemplateEntryLocalService =
			layoutPageTemplateEntryLocalService;
		_layoutPageTemplateStructureLocalService =
			layoutPageTemplateStructureLocalService;
		_objectDefinitionLocalService = objectDefinitionLocalService;
		_segmentsExperienceLocalService = segmentsExperienceLocalService;
	}

	@Override
	protected void doUpgrade() throws Exception {
		_companyLocalService.forEachCompanyId(
			companyId -> {
				Group group = _groupLocalService.fetchGroup(
					companyId, GroupConstants.CMS);

				if (group == null) {
					return;
				}

				ObjectDefinition objectDefinition =
					_objectDefinitionLocalService.
						fetchObjectDefinitionByExternalReferenceCode(
							"L_CMP_TASK", companyId);

				if (objectDefinition == null) {
					return;
				}

				long classNameId = _classNameLocalService.getClassNameId(
					objectDefinition.getClassName());

				for (LayoutPageTemplateEntry layoutPageTemplateEntry :
						_layoutPageTemplateEntryLocalService.
							getLayoutPageTemplateEntries(group.getGroupId())) {

					if ((layoutPageTemplateEntry.getClassNameId() !=
							classNameId) ||
						(layoutPageTemplateEntry.getType() !=
							LayoutPageTemplateEntryTypeConstants.
								DISPLAY_PAGE)) {

						continue;
					}

					Layout layout = _layoutLocalService.fetchLayout(
						layoutPageTemplateEntry.getPlid());

					if (layout == null) {
						continue;
					}

					_upgradeLayout(layout);

					Layout draftLayout = layout.fetchDraftLayout();

					if (draftLayout == null) {
						continue;
					}

					_upgradeLayout(draftLayout);
				}
			});
	}

	private boolean _addFragmentEntryLink(
			String anchorRendererKey, Layout layout,
			LayoutStructure layoutStructure, String rendererKey,
			long segmentsExperienceId, String... cssClasses)
		throws Exception {

		List<FragmentEntryLink> fragmentEntryLinks =
			_fragmentEntryLinkLocalService.getFragmentEntryLinksByPlid(
				layout.getGroupId(), layout.getPlid());

		LayoutStructureItem anchorLayoutStructureItem = null;

		for (FragmentEntryLink fragmentEntryLink : fragmentEntryLinks) {
			LayoutStructureItem layoutStructureItem =
				layoutStructure.getLayoutStructureItemByFragmentEntryLinkId(
					fragmentEntryLink.getFragmentEntryLinkId());

			if ((layoutStructureItem == null) ||
				layoutStructure.isItemMarkedForDeletion(
					layoutStructureItem.getItemId())) {

				continue;
			}

			if (Objects.equals(
					fragmentEntryLink.getRendererKey(), rendererKey)) {

				return false;
			}

			if (!Objects.equals(
					_getRendererKey(fragmentEntryLink), anchorRendererKey)) {

				continue;
			}

			anchorLayoutStructureItem = layoutStructureItem;
		}

		if (anchorLayoutStructureItem == null) {
			return false;
		}

		FragmentEntryLink fragmentEntryLink =
			_fragmentEntryLinkLocalService.addFragmentEntryLink(
				null, layout.getUserId(), layout.getGroupId(), null, null,
				segmentsExperienceId, layout.getPlid(), _EDITABLE_VALUES,
				rendererKey, new ServiceContext());

		LayoutStructureItem parentLayoutStructureItem =
			layoutStructure.getLayoutStructureItem(
				anchorLayoutStructureItem.getParentItemId());

		List<String> childrenItemIds =
			parentLayoutStructureItem.getChildrenItemIds();

		int position = childrenItemIds.indexOf(
			anchorLayoutStructureItem.getItemId());

		StyledLayoutStructureItem styledLayoutStructureItem =
			(StyledLayoutStructureItem)
				layoutStructure.addFragmentStyledLayoutStructureItem(
					fragmentEntryLink.getFragmentEntryLinkId(),
					parentLayoutStructureItem.getItemId(), position + 1);

		if (cssClasses.length > 0) {
			styledLayoutStructureItem.setCssClasses(
				SetUtil.fromArray(cssClasses));
		}

		return true;
	}

	private String _getRendererKey(FragmentEntryLink fragmentEntryLink)
		throws Exception {

		if (!Objects.equals(
				fragmentEntryLink.getRendererKey(), "INPUTS-date-input")) {

			return fragmentEntryLink.getRendererKey();
		}

		JSONObject editableValuesJSONObject = JSONFactoryUtil.createJSONObject(
			fragmentEntryLink.getEditableValues());

		JSONObject jsonObject = editableValuesJSONObject.getJSONObject(
			FragmentEntryProcessorConstants.
				KEY_FREEMARKER_FRAGMENT_ENTRY_PROCESSOR);

		if ((jsonObject == null) ||
			!Objects.equals(
				jsonObject.getString("inputFieldId"), "ObjectField_dueDate")) {

			return fragmentEntryLink.getRendererKey();
		}

		return _DUE_DATE_INPUT_RENDERER_KEY;
	}

	private boolean _hasFragmentEntryLink(
		Layout layout, LayoutStructure layoutStructure, String rendererKey) {

		for (FragmentEntryLink fragmentEntryLink :
				_fragmentEntryLinkLocalService.getFragmentEntryLinksByPlid(
					layout.getGroupId(), layout.getPlid())) {

			if (!Objects.equals(
					fragmentEntryLink.getRendererKey(), rendererKey)) {

				continue;
			}

			LayoutStructureItem layoutStructureItem =
				layoutStructure.getLayoutStructureItemByFragmentEntryLinkId(
					fragmentEntryLink.getFragmentEntryLinkId());

			if (layoutStructureItem != null) {
				return true;
			}
		}

		return false;
	}

	private void _upgradeLayout(Layout layout) throws Exception {
		LayoutPageTemplateStructure layoutPageTemplateStructure =
			_layoutPageTemplateStructureLocalService.
				fetchLayoutPageTemplateStructure(
					layout.getGroupId(), layout.getPlid());

		if (layoutPageTemplateStructure == null) {
			return;
		}

		long segmentsExperienceId =
			_segmentsExperienceLocalService.fetchDefaultSegmentsExperienceId(
				layout.getPlid());

		LayoutStructure layoutStructure = LayoutStructure.of(
			layoutPageTemplateStructure.getData(segmentsExperienceId));

		boolean updated = _addFragmentEntryLink(
			_DUE_DATE_INPUT_RENDERER_KEY, layout, layoutStructure,
			DueDateAlertComponentSectionFragmentRenderer.class.getName(),
			segmentsExperienceId);

		if (_hasFragmentEntryLink(
				layout, layoutStructure,
				ViewTaskInfoSummaryJSPSectionFragmentRenderer.class.
					getName()) &&
			_addFragmentEntryLink(
				_VIEW_RELATED_ASSETS_RENDERER_KEY, layout, layoutStructure,
				ViewSubtasksJSPSectionFragmentRenderer.class.getName(),
				segmentsExperienceId, "px-4")) {

			updated = true;
		}

		if (!updated) {
			return;
		}

		_layoutPageTemplateStructureLocalService.
			updateLayoutPageTemplateStructureData(
				layout.getUserId(), layout.getGroupId(), layout.getPlid(),
				segmentsExperienceId, layoutStructure.toString());
	}

	private static final String _DUE_DATE_INPUT_RENDERER_KEY =
		"INPUTS-date-input#ObjectField_dueDate";

	private static final String _EDITABLE_VALUES = JSONUtil.put(
		FragmentEntryProcessorConstants.
			KEY_BACKGROUND_IMAGE_FRAGMENT_ENTRY_PROCESSOR,
		JSONFactoryUtil.createJSONObject()
	).put(
		FragmentEntryProcessorConstants.KEY_EDITABLE_FRAGMENT_ENTRY_PROCESSOR,
		JSONFactoryUtil.createJSONObject()
	).put(
		FragmentEntryProcessorConstants.KEY_FREEMARKER_FRAGMENT_ENTRY_PROCESSOR,
		JSONFactoryUtil.createJSONObject()
	).toString();

	private static final String _VIEW_RELATED_ASSETS_RENDERER_KEY =
		"com.liferay.site.cms.site.initializer.internal.fragment.renderer." +
			"ViewRelatedAssetsJSPSectionFragmentRenderer";

	private final ClassNameLocalService _classNameLocalService;
	private final CompanyLocalService _companyLocalService;
	private final FragmentEntryLinkLocalService _fragmentEntryLinkLocalService;
	private final GroupLocalService _groupLocalService;
	private final LayoutLocalService _layoutLocalService;
	private final LayoutPageTemplateEntryLocalService
		_layoutPageTemplateEntryLocalService;
	private final LayoutPageTemplateStructureLocalService
		_layoutPageTemplateStructureLocalService;
	private final ObjectDefinitionLocalService _objectDefinitionLocalService;
	private final SegmentsExperienceLocalService
		_segmentsExperienceLocalService;

}