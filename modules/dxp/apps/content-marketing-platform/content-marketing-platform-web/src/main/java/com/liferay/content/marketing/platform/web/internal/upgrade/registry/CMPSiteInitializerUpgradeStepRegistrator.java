/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.content.marketing.platform.web.internal.upgrade.registry;

import com.liferay.content.marketing.platform.web.internal.upgrade.v1_0_1.CMPDescriptionRichTextUpgradeProcess;
import com.liferay.content.marketing.platform.web.internal.upgrade.v1_0_2.CMPDescriptionDisplayPageUpgradeProcess;
import com.liferay.fragment.service.FragmentEntryLinkLocalService;
import com.liferay.layout.page.template.service.LayoutPageTemplateEntryLocalService;
import com.liferay.object.service.ObjectDefinitionLocalService;
import com.liferay.object.service.ObjectFieldLocalService;
import com.liferay.portal.kernel.service.ClassNameLocalService;
import com.liferay.portal.kernel.service.CompanyLocalService;
import com.liferay.portal.kernel.service.GroupLocalService;
import com.liferay.portal.kernel.service.LayoutLocalService;
import com.liferay.portal.upgrade.registry.UpgradeStepRegistrator;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

/**
 * @author Jorge Díaz
 */
@Component(service = UpgradeStepRegistrator.class)
public class CMPSiteInitializerUpgradeStepRegistrator
	implements UpgradeStepRegistrator {

	@Override
	public void register(Registry registry) {
		registry.registerInitialization();

		registry.register(
			"1.0.0", "1.0.1",
			new CMPDescriptionRichTextUpgradeProcess(
				_companyLocalService, _objectDefinitionLocalService,
				_objectFieldLocalService));

		registry.register(
			"1.0.1", "1.0.2",
			new CMPDescriptionDisplayPageUpgradeProcess(
				_classNameLocalService, _companyLocalService,
				_fragmentEntryLinkLocalService, _groupLocalService,
				_layoutLocalService, _layoutPageTemplateEntryLocalService,
				_objectDefinitionLocalService));
	}

	@Reference
	private ClassNameLocalService _classNameLocalService;

	@Reference
	private CompanyLocalService _companyLocalService;

	@Reference
	private FragmentEntryLinkLocalService _fragmentEntryLinkLocalService;

	@Reference
	private GroupLocalService _groupLocalService;

	@Reference
	private LayoutLocalService _layoutLocalService;

	@Reference
	private LayoutPageTemplateEntryLocalService
		_layoutPageTemplateEntryLocalService;

	@Reference
	private ObjectDefinitionLocalService _objectDefinitionLocalService;

	@Reference
	private ObjectFieldLocalService _objectFieldLocalService;

}