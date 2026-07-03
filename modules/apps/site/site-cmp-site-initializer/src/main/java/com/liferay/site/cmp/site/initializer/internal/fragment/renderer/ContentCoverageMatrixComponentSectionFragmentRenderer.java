/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.site.cmp.site.initializer.internal.fragment.renderer;

import com.liferay.asset.kernel.model.AssetCategory;
import com.liferay.asset.kernel.model.AssetVocabulary;
import com.liferay.asset.kernel.service.AssetCategoryLocalService;
import com.liferay.asset.kernel.service.AssetVocabularyLocalService;
import com.liferay.fragment.renderer.FragmentRenderer;
import com.liferay.fragment.renderer.FragmentRendererContext;
import com.liferay.object.model.ObjectDefinition;
import com.liferay.object.model.ObjectEntry;
import com.liferay.object.service.ObjectDefinitionLocalService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.theme.ThemeDisplay;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.WebKeys;
import com.liferay.site.cmp.site.initializer.internal.util.ActionUtil;
import com.liferay.site.cmp.site.initializer.internal.util.ObjectEntryUtil;

import jakarta.servlet.http.HttpServletRequest;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

/**
 * @author Larissa Ribeiro
 */
@Component(service = FragmentRenderer.class)
public class ContentCoverageMatrixComponentSectionFragmentRenderer
	extends BaseComponentSectionFragmentRenderer {

	@Override
	public String getCollectionKey() {
		return "sections";
	}

	@Override
	protected String getComponentName(HttpServletRequest httpServletRequest) {
		return "ContentGapMatrixCard";
	}

	@Override
	protected String getLabelKey() {
		return "content-coverage-matrix";
	}

	@Override
	protected String getModuleName() {
		return "site-cmp-site-initializer";
	}

	@Override
	protected Map<String, Object> getProps(
		FragmentRendererContext fragmentRendererContext,
		HttpServletRequest httpServletRequest) {

		ObjectEntry objectEntry = ObjectEntryUtil.getObjectEntry(
			httpServletRequest);

		if (objectEntry == null) {
			return null;
		}

		ObjectDefinition objectDefinition =
			_objectDefinitionLocalService.fetchObjectDefinition(
				objectEntry.getObjectDefinitionId());

		if (objectDefinition == null) {
			return null;
		}

		ThemeDisplay themeDisplay =
			(ThemeDisplay)httpServletRequest.getAttribute(
				WebKeys.THEME_DISPLAY);

		return HashMapBuilder.<String, Object>put(
			"editProjectURL",
			StringBundler.concat(
				ActionUtil.getBaseEditProjectURL(
					objectDefinition, themeDisplay),
				objectEntry.getObjectEntryId(), "?redirect=",
				themeDisplay.getURLCurrent())
		).put(
			"hasPersonasOrFunnelStages",
			_hasPersonasOrFunnelStages(objectEntry, themeDisplay)
		).put(
			"projectId", objectEntry.getObjectEntryId()
		).build();
	}

	private boolean _hasPersonasOrFunnelStages(
		ObjectEntry objectEntry, ThemeDisplay themeDisplay) {

		Set<Long> vocabularyIds = new HashSet<>();

		for (String externalReferenceCode :
				new String[] {"L_CMP_FUNNEL_STAGE", "L_CMP_PERSONAS"}) {

			AssetVocabulary assetVocabulary =
				_assetVocabularyLocalService.
					fetchAssetVocabularyByExternalReferenceCode(
						externalReferenceCode, themeDisplay.getSiteGroupId());

			if (assetVocabulary != null) {
				vocabularyIds.add(assetVocabulary.getVocabularyId());
			}
		}

		List<AssetCategory> assetCategories =
			_assetCategoryLocalService.getCategories(
				objectEntry.getModelClassName(),
				objectEntry.getObjectEntryId());

		for (AssetCategory assetCategory : assetCategories) {
			if (vocabularyIds.contains(assetCategory.getVocabularyId())) {
				return true;
			}
		}

		return false;
	}

	@Reference
	private AssetCategoryLocalService _assetCategoryLocalService;

	@Reference
	private AssetVocabularyLocalService _assetVocabularyLocalService;

	@Reference
	private ObjectDefinitionLocalService _objectDefinitionLocalService;

}