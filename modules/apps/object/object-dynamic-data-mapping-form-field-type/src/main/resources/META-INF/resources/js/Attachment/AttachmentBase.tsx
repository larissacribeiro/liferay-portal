/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {useModal} from '@clayui/modal';
import {
	convertToFormData,
	makeFetch,
	useConfig,
} from 'data-engine-js-components-web';
import {openSelectionModal} from 'frontend-js-components-web';
import {fetch} from 'frontend-js-web';
import React, {ChangeEventHandler, useRef, useState} from 'react';

import FileContainer from './FileContainer';
import CMSFilesItemSelectorModal, {
	CMSFile,
} from './util/CMSFilesItemSelectorModal';
import {validateFileExtension, validateFileSize} from './util/attachment';

import './Attachment.scss';

import type {LocalizedValue} from 'dynamic-data-mapping-form-field-type';

export type AttachmentFile = {
	contentURL: string;
	fileEntryId: string;
	source?: 'dm' | 'cms';
	storageDepot?: string;
	title: string;
};

type DMUploadedFile = {
	contentURL: string;
	fileEntryId: string;
	readOnly: boolean;
	title: string;
};

type CMSUploadResponse = {
	contentURL: string;
	file: {
		id: number;
		link: {
			href: string;
		};
	};
	id: number;
	title: string;
};

export interface AttachmentBaseProps<TValue> {
	acceptedFileExtensions: string;
	attachment: AttachmentFile | null;
	error: {} | {displayErrors: boolean; errorMessage: string; valid: boolean};
	fileSource: string;
	handleDelete: () => void;
	maximumFileSize: number;
	onAttachmentChange: (attachment: AttachmentFile, id: string) => void;
	overallMaximumUploadRequestSize: number;
	readOnly: boolean;
	setError: React.Dispatch<React.SetStateAction<{}>>;
	storageDepot?: string;
	storageLibraryPath?: string;
	tip: string;
	url: string;
	value: TValue;
}

const getBase64 = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result.split(',')[1]);
			}
			else {
				reject(new Error('Invalid FileReader result'));
			}
		};

		reader.onerror = reject;
		reader.readAsDataURL(file);
	});

const toAttachmentFile = (file: {
	contentURL: string;
	fileEntryId: string;
	title: string;
}): AttachmentFile => ({
	contentURL: file.contentURL,
	fileEntryId: file.fileEntryId,
	title: file.title,
});

export default function AttachmentBase({
	acceptedFileExtensions,
	attachment,
	fileSource,
	handleDelete,
	maximumFileSize,
	onAttachmentChange,
	overallMaximumUploadRequestSize,
	readOnly,
	setError,
	storageDepot,
	storageLibraryPath,
	url,
}: AttachmentBaseProps<string | LocalizedValue<string>>) {
	const {portletNamespace} = useConfig();

	const inputRef = useRef<HTMLInputElement>(null);

	const [isLoading, setLoading] = useState(false);

	const [cmsFiles, setCMSFiles] = useState<CMSFile[]>([]);

	const {
		observer: spaceItemSelectorObserver,
		onOpenChange: spaceItemSelectorOpenChange,
		open: spaceItemSelectorOpen,
	} = useModal();

	const isDepotFiles =
		Liferay.FeatureFlags['LPD-74813'] && fileSource === 'depotFiles';

	const isDocumentsAndMedia = fileSource === 'documentsAndMedia';

	const isUserComputerDepotUpload =
		Liferay.FeatureFlags['LPD-74813'] &&
		fileSource === 'userComputerToDepotFiles';

	const isUserComputerDMUpload =
		fileSource === 'userComputerToDocumentsAndMedia';

	const hasLibraryStorage =
		isUserComputerDepotUpload || isUserComputerDMUpload;

	const handleCMSItemsChange = (items: CMSFile[]) => {
		setCMSFiles(items);

		if (!items.length) {
			return;
		}

		const selectedItem = items[0];

		onAttachmentChange(
			{
				contentURL: selectedItem.embedded.file.fileURL,
				fileEntryId: String(selectedItem.embedded.id),
				title: selectedItem.title,
			},
			String(selectedItem.embedded.file.id)
		);
	};

	const handleSelectedItem = (selectedItem: any) => {
		if (!selectedItem) {
			return;
		}

		const selectedItemValue = JSON.parse(selectedItem.value);

		const error =
			validateFileExtension(
				acceptedFileExtensions,
				selectedItemValue.extension
			) ??
			validateFileSize(
				Number(selectedItemValue.size),
				Number(maximumFileSize),
				Number(overallMaximumUploadRequestSize)
			);

		if (error) {
			setError(error);
		}
		else {
			onAttachmentChange(
				toAttachmentFile({
					contentURL: selectedItemValue.url,
					fileEntryId: selectedItemValue.fileEntryId,
					title: selectedItemValue.title,
				}),
				selectedItemValue.fileEntryId
			);
		}
	};

	const DEFAULT_FOLDER_ERC = 'L_FILES';

	const resolveFolderId = async (
		spaceERC: string,
		folderName?: string
	): Promise<{
		objectEntryFolderExternalReferenceCode?: string;
		objectEntryFolderId?: number;
	}> => {
		if (!folderName) {
			return {objectEntryFolderExternalReferenceCode: DEFAULT_FOLDER_ERC};
		}

		try {
			const searchParams = new URLSearchParams({
				nestedFields: 'embedded,scope',
				pageSize: '30',
				search: folderName,
			});

			const searchResponse = await fetch(
				`/o/search/v1.0/search?${searchParams}`
			);

			if (searchResponse.ok) {
				const {items = []} = await searchResponse.json();

				const match = items.find((item: any) => {
					const data = item.embedded ?? item;

					return (
						data.title === folderName &&
						data.scope?.externalReferenceCode === spaceERC
					);
				});

				const id = match?.embedded?.id ?? match?.id;

				if (id) {
					return {objectEntryFolderId: id};
				}
			}

			const createResponse = await fetch(
				`/o/headless-object/v1.0/scopes/${spaceERC}/object-entry-folders`,
				{
					body: JSON.stringify({
						parentObjectEntryFolderExternalReferenceCode:
							DEFAULT_FOLDER_ERC,
						title: folderName,
					}),
					headers: {
						'Content-Type': 'application/json',
						'x-csrf-token': Liferay.authToken,
					},
					method: 'POST',
				}
			);

			if (createResponse.ok) {
				const {id} = await createResponse.json();

				if (id) {
					return {objectEntryFolderId: id};
				}
			}
		}
		catch (error) {
			console.warn('Folder resolution failed', error);
		}

		return {objectEntryFolderExternalReferenceCode: DEFAULT_FOLDER_ERC};
	};

	const uploadToCMS = async (
		file: File,
		storageLibraryPath: string | undefined,
		storageDepot: string | undefined
	): Promise<AttachmentFile & {id: string}> => {
		if (!storageDepot) {
			throw new Error('Storage depot ID is missing');
		}

		const fileBase64 = await getBase64(file);

		const cleanPath = storageLibraryPath?.replace(/^\//, '');

		const folder = await resolveFolderId(storageDepot, cleanPath);

		const body = {
			...folder,
			file: {
				fileBase64,
				name: file.name,
			},
			title: file.name,
		};

		const response = (await makeFetch({
			body: JSON.stringify(body),
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			} as {Accept: string} & Record<string, string>,
			method: 'POST',
			url: `/o/cms/basic-documents/scopes/${storageDepot}`,
		})) as CMSUploadResponse & {status?: string; title?: string};

		const rawUrl =
			response.contentURL ??
			response.file?.link?.href ??
			(response.id
				? `/o/cms/basic-documents/${response.id}/content`
				: null);

		const absoluteUrl = new URL(rawUrl, window.location.origin);
		absoluteUrl.searchParams.delete('download');

		return {
			contentURL: absoluteUrl.toString(),
			fileEntryId: String(response.id),
			id: String(response.file?.id),
			source: 'cms',
			title: response.title,
		};
	};

	const uploadToDM = async (
		file: File,
		url: string,
		portletNamespace: string
	): Promise<AttachmentFile & {id: string}> => {
		const {error, file: uploadedFile} = (await makeFetch({
			body: convertToFormData({
				[`${portletNamespace}file`]: file,
			}),
			method: 'POST',
			url,
		})) as {
			error?: {message: string};
			file: DMUploadedFile;
		};

		if (error) {
			throw new Error(error.message);
		}

		const attachmentFile = toAttachmentFile(uploadedFile);

		return {
			...attachmentFile,
			id: uploadedFile.fileEntryId,
		};
	};

	const handleUpload: ChangeEventHandler<HTMLInputElement> = async ({
		target: {files},
	}) => {
		const selectedFile = files?.[0];

		if (!selectedFile) {
			return;
		}

		const fileSizeError = validateFileSize(
			Number(selectedFile.size),
			Number(maximumFileSize),
			Number(overallMaximumUploadRequestSize)
		);

		if (fileSizeError) {
			setError(fileSizeError);

			return;
		}

		setError({});
		setLoading(true);

		try {
			let result: AttachmentFile & {id: string};

			if (isUserComputerDepotUpload) {
				result = await uploadToCMS(
					selectedFile,
					storageLibraryPath,
					storageDepot
				);
			}
			else {
				result = await uploadToDM(selectedFile, url, portletNamespace);
			}

			const {id, ...attachmentData} = result;

			onAttachmentChange(attachmentData, id);
		}
		catch (error: any) {
			setError({
				displayErrors: true,
				errorMessage:
					error?.message ||
					Liferay.Language.get('unable-to-upload-the-selected-file'),
				valid: false,
			});
		}
		finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="inline-item lfr-objects__attachment">
				{!readOnly && (
					<ClayButton
						className="lfr-objects__attachment-button"
						displayType="secondary"
						onClick={() => {
							setError({});

							if (isDocumentsAndMedia) {
								openSelectionModal({
									onSelect: handleSelectedItem,
									selectEventName: `${portletNamespace}selectAttachmentEntry`,
									title: Liferay.Language.get('select-file'),
									url,
								});
							}
							else if (hasLibraryStorage) {
								const filePicker = inputRef.current;

								if (filePicker) {
									filePicker.value = '';
									filePicker.click();
								}
							}
							else if (isDepotFiles) {
								spaceItemSelectorOpenChange(true);
							}
						}}
					>
						{Liferay.Language.get('select-file')}
					</ClayButton>
				)}

				<FileContainer
					attachment={attachment}
					loading={isLoading}
					onDelete={handleDelete}
					readOnly={readOnly}
				/>
			</div>

			{isDepotFiles && (
				<CMSFilesItemSelectorModal
					items={cmsFiles}
					observer={spaceItemSelectorObserver}
					onItemsChange={handleCMSItemsChange}
					onOpenChange={spaceItemSelectorOpenChange}
					open={spaceItemSelectorOpen}
				/>
			)}

			<input
				accept={acceptedFileExtensions
					.split(',')
					.map((extension) => `.${extension.trim()}`)
					.join(',')}
				onChange={handleUpload}
				ref={inputRef}
				style={{display: 'none'}}
				type="file"
			/>
		</>
	);
}
