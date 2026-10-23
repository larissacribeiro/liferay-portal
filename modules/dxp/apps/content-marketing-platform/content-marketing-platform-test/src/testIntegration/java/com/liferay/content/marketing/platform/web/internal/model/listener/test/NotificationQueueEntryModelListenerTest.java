/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.content.marketing.platform.web.internal.model.listener.test;

import com.liferay.arquillian.extension.junit.bridge.junit.Arquillian;
import com.liferay.content.marketing.platform.test.util.CMPTestUtil;
import com.liferay.document.library.helper.DLURLHelper;
import com.liferay.document.library.kernel.model.DLFileEntry;
import com.liferay.document.library.kernel.model.DLFolderConstants;
import com.liferay.document.library.kernel.service.DLAppLocalService;
import com.liferay.layout.test.util.ContentLayoutTestUtil;
import com.liferay.notification.constants.NotificationPortletKeys;
import com.liferay.notification.model.NotificationQueueEntry;
import com.liferay.notification.model.NotificationQueueEntryAttachment;
import com.liferay.notification.service.NotificationQueueEntryAttachmentLocalService;
import com.liferay.notification.service.NotificationQueueEntryLocalService;
import com.liferay.object.model.ObjectEntry;
import com.liferay.object.service.ObjectEntryLocalService;
import com.liferay.object.util.HttpServletRequestThreadLocal;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.dao.orm.DynamicQuery;
import com.liferay.portal.kernel.dao.orm.RestrictionsFactoryUtil;
import com.liferay.portal.kernel.model.Group;
import com.liferay.portal.kernel.model.Repository;
import com.liferay.portal.kernel.model.ResourceConstants;
import com.liferay.portal.kernel.model.ResourcePermission;
import com.liferay.portal.kernel.model.User;
import com.liferay.portal.kernel.portletfilerepository.PortletFileRepository;
import com.liferay.portal.kernel.repository.model.FileEntry;
import com.liferay.portal.kernel.repository.model.Folder;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.service.CompanyLocalService;
import com.liferay.portal.kernel.service.GroupLocalService;
import com.liferay.portal.kernel.service.LayoutLocalService;
import com.liferay.portal.kernel.service.ResourcePermissionLocalService;
import com.liferay.portal.kernel.test.rule.AggregateTestRule;
import com.liferay.portal.kernel.test.rule.DeleteAfterTestRun;
import com.liferay.portal.kernel.test.util.RandomTestUtil;
import com.liferay.portal.kernel.test.util.ServiceContextTestUtil;
import com.liferay.portal.kernel.test.util.TestPropsValues;
import com.liferay.portal.kernel.test.util.UserTestUtil;
import com.liferay.portal.kernel.util.ContentTypes;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.WebKeys;
import com.liferay.portal.test.rule.Inject;
import com.liferay.portal.test.rule.LiferayIntegrationTestRule;
import com.liferay.portal.test.rule.PermissionCheckerMethodTestRule;
import com.liferay.portal.test.rule.SynchronousMailTestRule;

import jakarta.servlet.http.HttpServletRequest;

import java.io.Serializable;

import java.util.ArrayList;
import java.util.List;

import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import org.springframework.mock.web.MockHttpServletRequest;

/**
 * @author Larissa Ribeiro
 */
@RunWith(Arquillian.class)
public class NotificationQueueEntryModelListenerTest {

	@ClassRule
	@Rule
	public static final AggregateTestRule aggregateTestRule =
		new AggregateTestRule(
			new LiferayIntegrationTestRule(),
			PermissionCheckerMethodTestRule.INSTANCE,
			SynchronousMailTestRule.INSTANCE);

	@Before
	public void setUp() throws Exception {
		HttpServletRequest httpServletRequest = new MockHttpServletRequest();

		Group group = CMPTestUtil.getOrAddGroup(
			NotificationQueueEntryModelListenerTest.class);

		httpServletRequest.setAttribute(
			WebKeys.THEME_DISPLAY,
			ContentLayoutTestUtil.getThemeDisplay(
				_companyLocalService.fetchCompany(
					TestPropsValues.getCompanyId()),
				group,
				_layoutLocalService.fetchLayoutByFriendlyURL(
					group.getGroupId(), false, "/projects")));

		HttpServletRequestThreadLocal.setHttpServletRequest(httpServletRequest);
	}

	@After
	public void tearDown() throws Exception {
		HttpServletRequestThreadLocal.setHttpServletRequest(null);
	}

	@Test
	public void testOnBeforeCreate() throws Exception {
		ObjectEntry cmpProjectObjectEntry =
			CMPTestUtil.addCMPProjectObjectEntry();

		_testUpdateObjectEntry(
			CMPTestUtil.addCMPTaskObjectEntry(cmpProjectObjectEntry));
		_testUpdateObjectEntry(cmpProjectObjectEntry);
	}

	private void _assertNotificationQueueEntry(
			String expectedFileName, String expectedText,
			NotificationQueueEntry notificationQueueEntry)
		throws Exception {

		String body = notificationQueueEntry.getBody();

		Assert.assertFalse(body.contains("<iframe"));
		Assert.assertFalse(body.contains("<img"));
		Assert.assertFalse(body.contains("<oembed"));
		Assert.assertTrue(body.contains("<p>[Video]</p>"));
		Assert.assertTrue(body.contains("<strong>bold</strong>"));
		Assert.assertTrue(
			body.contains("[Video: https://www.youtube.com/watch?v=liferay]"));
		Assert.assertTrue(body.contains(expectedText));

		List<NotificationQueueEntryAttachment>
			notificationQueueEntryAttachments =
				_notificationQueueEntryAttachmentLocalService.
					getNotificationQueueEntryNotificationQueueEntryAttachments(
						notificationQueueEntry.getNotificationQueueEntryId());

		if (expectedFileName == null) {
			Assert.assertEquals(
				notificationQueueEntryAttachments.toString(), 0,
				notificationQueueEntryAttachments.size());

			return;
		}

		Assert.assertEquals(
			notificationQueueEntryAttachments.toString(), 1,
			notificationQueueEntryAttachments.size());

		Folder folder = _getFolder(notificationQueueEntry);

		FileEntry fileEntry = _portletFileRepository.getPortletFileEntry(
			folder.getGroupId(), folder.getFolderId(), expectedFileName);

		NotificationQueueEntryAttachment notificationQueueEntryAttachment =
			notificationQueueEntryAttachments.get(0);

		Assert.assertEquals(
			fileEntry.getFileEntryId(),
			notificationQueueEntryAttachment.getFileEntryId());
	}

	private Folder _getFolder(NotificationQueueEntry notificationQueueEntry)
		throws Exception {

		Group group = _groupLocalService.getCompanyGroup(
			notificationQueueEntry.getCompanyId());

		Repository repository = _portletFileRepository.getPortletRepository(
			group.getGroupId(), NotificationPortletKeys.NOTIFICATION_TEMPLATES);

		return _portletFileRepository.getPortletFolder(
			repository.getRepositoryId(),
			DLFolderConstants.DEFAULT_PARENT_FOLDER_ID,
			String.valueOf(
				notificationQueueEntry.getNotificationQueueEntryId()));
	}

	private NotificationQueueEntry _getNotificationQueueEntry(
		ObjectEntry objectEntry, User user) {

		DynamicQuery dynamicQuery =
			_notificationQueueEntryLocalService.dynamicQuery();

		dynamicQuery.add(
			RestrictionsFactoryUtil.eq(
				"classPK", objectEntry.getObjectEntryId()));
		dynamicQuery.add(
			RestrictionsFactoryUtil.eq("userId", user.getUserId()));

		List<NotificationQueueEntry> notificationQueueEntries =
			_notificationQueueEntryLocalService.dynamicQuery(dynamicQuery);

		return notificationQueueEntries.get(0);
	}

	private void _testUpdateObjectEntry(ObjectEntry objectEntry)
		throws Exception {

		FileEntry fileEntry = _dlAppLocalService.addFileEntry(
			null, TestPropsValues.getUserId(), objectEntry.getGroupId(),
			DLFolderConstants.DEFAULT_PARENT_FOLDER_ID,
			RandomTestUtil.randomString() + ".png", ContentTypes.IMAGE_PNG,
			RandomTestUtil.randomBytes(), null, null, null,
			ServiceContextTestUtil.getServiceContext(objectEntry.getGroupId()));

		for (ResourcePermission resourcePermission :
				_resourcePermissionLocalService.getResourcePermissions(
					fileEntry.getCompanyId(), DLFileEntry.class.getName(),
					ResourceConstants.SCOPE_INDIVIDUAL,
					String.valueOf(fileEntry.getFileEntryId()))) {

			_resourcePermissionLocalService.removeResourcePermission(
				fileEntry.getCompanyId(), DLFileEntry.class.getName(),
				ResourceConstants.SCOPE_INDIVIDUAL,
				String.valueOf(fileEntry.getFileEntryId()),
				resourcePermission.getRoleId(), ActionKeys.VIEW);
		}

		User user = UserTestUtil.addUser();

		_users.add(user);

		_objectEntryLocalService.subscribeObjectEntry(
			TestPropsValues.getUserId(), objectEntry.getGroupId(),
			objectEntry.getObjectEntryId());
		_objectEntryLocalService.subscribeObjectEntry(
			user.getUserId(), objectEntry.getGroupId(),
			objectEntry.getObjectEntryId());

		_objectEntryLocalService.updateObjectEntry(
			TestPropsValues.getUserId(), objectEntry.getObjectEntryId(),
			objectEntry.getObjectEntryFolderId(),
			HashMapBuilder.<String, Serializable>putAll(
				objectEntry.getValues()
			).put(
				"description",
				StringBundler.concat(
					"<p><strong>bold</strong></p><p><img src=\"",
					_dlURLHelper.getPreviewURL(
						fileEntry, fileEntry.getFileVersion(), null,
						StringPool.BLANK, false, false),
					"\"></p><figure class=\"media\"><oembed ",
					"url=\"https://www.youtube.com/watch?v=liferay\"></oembed>",
					"</figure><p><iframe data-video-liferay src=\"/",
					RandomTestUtil.randomString(), "\"></iframe></p>")
			).build(),
			ServiceContextTestUtil.getServiceContext());

		_assertNotificationQueueEntry(
			fileEntry.getFileName(),
			"[Image: " + fileEntry.getTitle() + ", attached]",
			_getNotificationQueueEntry(objectEntry, TestPropsValues.getUser()));
		_assertNotificationQueueEntry(
			null, "[Image unavailable]",
			_getNotificationQueueEntry(objectEntry, user));
	}

	@Inject
	private CompanyLocalService _companyLocalService;

	@Inject
	private DLAppLocalService _dlAppLocalService;

	@Inject
	private DLURLHelper _dlURLHelper;

	@Inject
	private GroupLocalService _groupLocalService;

	@Inject
	private LayoutLocalService _layoutLocalService;

	@Inject
	private NotificationQueueEntryAttachmentLocalService
		_notificationQueueEntryAttachmentLocalService;

	@Inject
	private NotificationQueueEntryLocalService
		_notificationQueueEntryLocalService;

	@Inject
	private ObjectEntryLocalService _objectEntryLocalService;

	@Inject
	private PortletFileRepository _portletFileRepository;

	@Inject
	private ResourcePermissionLocalService _resourcePermissionLocalService;

	@DeleteAfterTestRun
	private final List<User> _users = new ArrayList<>();

}