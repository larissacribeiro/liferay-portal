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
import com.liferay.portal.kernel.util.HtmlUtil;
import com.liferay.portal.kernel.util.WebKeys;
import com.liferay.portal.test.rule.Inject;
import com.liferay.portal.test.rule.LiferayIntegrationTestRule;
import com.liferay.portal.test.rule.PermissionCheckerMethodTestRule;
import com.liferay.portal.test.rule.SynchronousMailTestRule;

import jakarta.servlet.http.HttpServletRequest;

import java.io.Serializable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
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

		_testOnBeforeCreate(
			CMPTestUtil.addCMPTaskObjectEntry(cmpProjectObjectEntry));
		_testOnBeforeCreate(cmpProjectObjectEntry);
	}

	private FileEntry _addFileEntry(
			long groupId, String mimeType, String sourceFileName)
		throws Exception {

		FileEntry fileEntry = _dlAppLocalService.addFileEntry(
			null, TestPropsValues.getUserId(), groupId,
			DLFolderConstants.DEFAULT_PARENT_FOLDER_ID, sourceFileName,
			mimeType, RandomTestUtil.randomBytes(), null, null, null,
			ServiceContextTestUtil.getServiceContext(groupId));

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

		return fileEntry;
	}

	private void _assertNotificationQueueEntry(
			List<String> expectedFileNames, List<String> expectedTexts,
			NotificationQueueEntry notificationQueueEntry)
		throws Exception {

		String body = notificationQueueEntry.getBody();

		Assert.assertFalse(body.contains("<iframe"));
		Assert.assertFalse(body.contains("<img"));
		Assert.assertFalse(body.contains("<oembed"));
		Assert.assertTrue(body.contains("<strong>bold</strong>"));
		Assert.assertTrue(
			body.contains("[Video: https://www.youtube.com/watch?v=liferay]"));

		for (String expectedText : expectedTexts) {
			Assert.assertTrue(body.contains(expectedText));
		}

		List<NotificationQueueEntryAttachment>
			notificationQueueEntryAttachments =
				_notificationQueueEntryAttachmentLocalService.
					getNotificationQueueEntryNotificationQueueEntryAttachments(
						notificationQueueEntry.getNotificationQueueEntryId());

		Assert.assertEquals(
			notificationQueueEntryAttachments.toString(),
			expectedFileNames.size(), notificationQueueEntryAttachments.size());

		if (expectedFileNames.isEmpty()) {
			return;
		}

		Folder folder = _getFolder(notificationQueueEntry);

		for (int i = 0; i < expectedFileNames.size(); i++) {
			FileEntry fileEntry = _portletFileRepository.getPortletFileEntry(
				folder.getGroupId(), folder.getFolderId(),
				expectedFileNames.get(i));

			NotificationQueueEntryAttachment notificationQueueEntryAttachment =
				notificationQueueEntryAttachments.get(i);

			Assert.assertEquals(
				fileEntry.getFileEntryId(),
				notificationQueueEntryAttachment.getFileEntryId());
		}
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

	private void _testOnBeforeCreate(ObjectEntry objectEntry) throws Exception {
		User user = UserTestUtil.addUser();

		_users.add(user);

		_objectEntryLocalService.subscribeObjectEntry(
			TestPropsValues.getUserId(), objectEntry.getGroupId(),
			objectEntry.getObjectEntryId());
		_objectEntryLocalService.subscribeObjectEntry(
			user.getUserId(), objectEntry.getGroupId(),
			objectEntry.getObjectEntryId());

		FileEntry fileEntry1 = _addFileEntry(
			objectEntry.getGroupId(), ContentTypes.IMAGE_PNG,
			RandomTestUtil.randomString() + ".png");
		FileEntry fileEntry2 = _addFileEntry(
			objectEntry.getGroupId(), "video/mp4",
			RandomTestUtil.randomString() + ".mp4");

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
						fileEntry1, fileEntry1.getFileVersion(), null,
						StringPool.BLANK, false, false),
					"\"></p><figure class=\"media\"><oembed ",
					"url=\"https://www.youtube.com/watch?v=liferay\"></oembed>",
					"</figure><p><iframe data-video-liferay src=\"",
					HtmlUtil.escapeAttribute(
						_dlURLHelper.getPreviewURL(
							fileEntry2, fileEntry2.getFileVersion(), null,
							"&videoEmbed=true", true, false)),
					"\"></iframe></p>")
			).build(),
			ServiceContextTestUtil.getServiceContext());

		_assertNotificationQueueEntry(
			Arrays.asList(fileEntry1.getFileName(), fileEntry2.getFileName()),
			Arrays.asList(
				"[Image: " + fileEntry1.getTitle() + ", attached]",
				"[Video: " + fileEntry2.getTitle() + ", attached]"),
			_getNotificationQueueEntry(objectEntry, TestPropsValues.getUser()));

		_assertNotificationQueueEntry(
			Collections.emptyList(),
			Arrays.asList("[Image unavailable]", "[Video unavailable]"),
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