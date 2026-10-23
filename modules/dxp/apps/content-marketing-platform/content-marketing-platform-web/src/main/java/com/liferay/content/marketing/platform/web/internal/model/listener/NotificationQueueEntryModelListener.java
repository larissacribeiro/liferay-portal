/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.content.marketing.platform.web.internal.model.listener;

import com.liferay.document.library.kernel.model.DLFolderConstants;
import com.liferay.document.library.kernel.service.DLAppLocalService;
import com.liferay.notification.constants.NotificationPortletKeys;
import com.liferay.notification.model.NotificationQueueEntry;
import com.liferay.notification.model.NotificationTemplate;
import com.liferay.notification.service.NotificationQueueEntryAttachmentLocalService;
import com.liferay.notification.service.NotificationTemplateLocalService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.log.Log;
import com.liferay.portal.kernel.log.LogFactoryUtil;
import com.liferay.portal.kernel.model.BaseModelListener;
import com.liferay.portal.kernel.model.Group;
import com.liferay.portal.kernel.model.ModelListener;
import com.liferay.portal.kernel.model.Repository;
import com.liferay.portal.kernel.portletfilerepository.PortletFileRepository;
import com.liferay.portal.kernel.repository.friendly.url.resolver.FileEntryFriendlyURLResolver;
import com.liferay.portal.kernel.repository.model.FileEntry;
import com.liferay.portal.kernel.repository.model.Folder;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.security.permission.PermissionChecker;
import com.liferay.portal.kernel.security.permission.PermissionCheckerFactory;
import com.liferay.portal.kernel.security.permission.resource.ModelResourcePermission;
import com.liferay.portal.kernel.service.GroupLocalService;
import com.liferay.portal.kernel.service.ServiceContext;
import com.liferay.portal.kernel.service.UserLocalService;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.HtmlUtil;
import com.liferay.portal.kernel.util.SetUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

/**
 * @author Larissa Ribeiro
 */
@Component(service = ModelListener.class)
public class NotificationQueueEntryModelListener
	extends BaseModelListener<NotificationQueueEntry> {

	@Override
	public void onBeforeCreate(NotificationQueueEntry notificationQueueEntry) {
		try {
			NotificationTemplate notificationTemplate =
				_notificationTemplateLocalService.fetchNotificationTemplate(
					notificationQueueEntry.getNotificationTemplateId());

			if ((notificationTemplate == null) ||
				!_externalReferenceCodes.contains(
					notificationTemplate.getExternalReferenceCode())) {

				return;
			}

			_updateBody(notificationQueueEntry);
		}
		catch (Exception exception) {
			if (_log.isWarnEnabled()) {
				_log.warn(exception);
			}
		}
	}

	private void _addNotificationQueueEntryAttachments(
			List<FileEntry> fileEntries,
			NotificationQueueEntry notificationQueueEntry)
		throws Exception {

		Group group = _groupLocalService.getCompanyGroup(
			notificationQueueEntry.getCompanyId());

		Repository repository = _portletFileRepository.addPortletRepository(
			group.getGroupId(), NotificationPortletKeys.NOTIFICATION_TEMPLATES,
			new ServiceContext());

		long guestUserId = _userLocalService.getGuestUserId(
			notificationQueueEntry.getCompanyId());

		Folder folder = _portletFileRepository.addPortletFolder(
			guestUserId, repository.getRepositoryId(),
			DLFolderConstants.DEFAULT_PARENT_FOLDER_ID,
			String.valueOf(
				notificationQueueEntry.getNotificationQueueEntryId()),
			new ServiceContext());

		for (FileEntry fileEntry : fileEntries) {
			FileEntry portletFileEntry =
				_portletFileRepository.addPortletFileEntry(
					null, repository.getGroupId(), guestUserId,
					NotificationTemplate.class.getName(), 0,
					NotificationPortletKeys.NOTIFICATION_TEMPLATES,
					folder.getFolderId(), fileEntry.getContentStream(),
					_portletFileRepository.getUniqueFileName(
						repository.getGroupId(), folder.getFolderId(),
						fileEntry.getFileName()),
					fileEntry.getMimeType(), false);

			_notificationQueueEntryAttachmentLocalService.
				addNotificationQueueEntryAttachment(
					notificationQueueEntry.getCompanyId(),
					portletFileEntry.getFileEntryId(),
					notificationQueueEntry.getNotificationQueueEntryId());
		}
	}

	private FileEntry _fetchFileEntry(
		long companyId, PermissionChecker permissionChecker, String src) {

		try {
			FileEntry fileEntry = _getFileEntry(companyId, src);

			if ((fileEntry != null) &&
				_fileEntryModelResourcePermission.contains(
					permissionChecker, fileEntry, ActionKeys.VIEW)) {

				return fileEntry;
			}
		}
		catch (Exception exception) {
			if (_log.isDebugEnabled()) {
				_log.debug(exception);
			}
		}

		return null;
	}

	private FileEntry _getFileEntry(long companyId, String src)
		throws Exception {

		Matcher matcher = _fileEntryURLPattern.matcher(src);

		if (!matcher.find()) {
			return null;
		}

		if (matcher.group(1) == null) {
			return _dlAppLocalService.fetchFileEntryByUuidAndGroupId(
				matcher.group(4), GetterUtil.getLong(matcher.group(3)));
		}

		Group group = _groupLocalService.fetchFriendlyURLGroup(
			companyId, "/" + matcher.group(1));

		if (group == null) {
			return null;
		}

		return _fileEntryFriendlyURLResolver.resolveFriendlyURL(
			group.getGroupId(), matcher.group(2));
	}

	private String _getVideoReference(String video) {
		Matcher matcher = _oembedURLPattern.matcher(video);

		if (!matcher.find()) {
			return "[Video]";
		}

		return StringBundler.concat("[Video: ", matcher.group(1), "]");
	}

	private void _updateBody(NotificationQueueEntry notificationQueueEntry)
		throws Exception {

		PermissionChecker permissionChecker = _permissionCheckerFactory.create(
			_userLocalService.getUser(notificationQueueEntry.getUserId()));

		Matcher imgMatcher = _imgPattern.matcher(
			notificationQueueEntry.getBody());

		List<FileEntry> fileEntries = new ArrayList<>();
		StringBuffer sb = new StringBuffer();

		while (imgMatcher.find()) {
			Matcher srcMatcher = _srcPattern.matcher(imgMatcher.group());

			FileEntry fileEntry = null;

			if (srcMatcher.find()) {
				fileEntry = _fetchFileEntry(
					notificationQueueEntry.getCompanyId(), permissionChecker,
					HtmlUtil.unescape(srcMatcher.group(1)));
			}

			if (fileEntry == null) {
				imgMatcher.appendReplacement(sb, "[Image unavailable]");

				continue;
			}

			fileEntries.add(fileEntry);

			imgMatcher.appendReplacement(
				sb,
				Matcher.quoteReplacement(
					StringBundler.concat(
						"[Image: ", HtmlUtil.escape(fileEntry.getTitle()),
						", attached]")));
		}

		imgMatcher.appendTail(sb);

		Matcher videoMatcher = _videoPattern.matcher(sb.toString());

		notificationQueueEntry.setBody(
			videoMatcher.replaceAll(
				matchResult -> Matcher.quoteReplacement(
					_getVideoReference(matchResult.group()))));

		if (!fileEntries.isEmpty()) {
			_addNotificationQueueEntryAttachments(
				fileEntries, notificationQueueEntry);
		}
	}

	private static final Log _log = LogFactoryUtil.getLog(
		NotificationQueueEntryModelListener.class);

	private static final Set<String> _externalReferenceCodes =
		SetUtil.fromArray(
			"L_CMP_PROJECT_SUBSCRIPTION_UPDATED_NOTIFICATION_TEMPLATE",
			"L_CMP_TASK_SUBSCRIPTION_UPDATED_NOTIFICATION_TEMPLATE");
	private static final Pattern _fileEntryURLPattern = Pattern.compile(
		"/documents/(?:d/([^/]+)/([^/?#]+)|(\\d+)/\\d+/[^/?#]+/" +
			"([-0-9a-fA-F]+))");
	private static final Pattern _imgPattern = Pattern.compile(
		"<img\\b[^>]*>", Pattern.CASE_INSENSITIVE);
	private static final Pattern _oembedURLPattern = Pattern.compile(
		"<oembed\\b[^>]*\\surl=\"([^\"]*)\"", Pattern.CASE_INSENSITIVE);
	private static final Pattern _srcPattern = Pattern.compile(
		"\\ssrc=\"([^\"]*)\"", Pattern.CASE_INSENSITIVE);
	private static final Pattern _videoPattern = Pattern.compile(
		"<figure\\b[^>]*\\bclass=\"media\"[^>]*>.*?</figure>|" +
			"<(iframe|oembed|video)\\b[^>]*>.*?</\\1>",
		Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

	@Reference
	private DLAppLocalService _dlAppLocalService;

	@Reference
	private FileEntryFriendlyURLResolver _fileEntryFriendlyURLResolver;

	@Reference(
		target = "(model.class.name=com.liferay.portal.kernel.repository.model.FileEntry)"
	)
	private ModelResourcePermission<FileEntry>
		_fileEntryModelResourcePermission;

	@Reference
	private GroupLocalService _groupLocalService;

	@Reference
	private NotificationQueueEntryAttachmentLocalService
		_notificationQueueEntryAttachmentLocalService;

	@Reference
	private NotificationTemplateLocalService _notificationTemplateLocalService;

	@Reference
	private PermissionCheckerFactory _permissionCheckerFactory;

	@Reference
	private PortletFileRepository _portletFileRepository;

	@Reference
	private UserLocalService _userLocalService;

}