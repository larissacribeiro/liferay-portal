/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {IView} from '@liferay/frontend-data-set-web';
import {
    IItemSelectorModalProps,
    ItemSelectorModal,
} from '@liferay/frontend-js-item-selector-web';
import React, {useState} from 'react';
import {v4 as uuidv4} from 'uuid';

const OBJECT_ENTRY_FOLDER_CLASS_NAME =
    'com.liferay.object.model.ObjectEntryFolder';

const ROOT_URL = `${window.location.origin}${Liferay.ThemeDisplay.getPathContext()}/o/search/v1.0/search`;

const SPACES_API_URL = '/o/headless-asset-library/v1.0/asset-libraries';

const BASE_SEARCH_PARAMS = {
    currentURL: '/web/cms/files',
    emptySearch: 'true',
    nestedFields: 'description,embedded,file.thumbnailURL,file.mimeType,file.name',
};

// 1. HELPER: The original filter used 'siteId', so we must prioritize that.
const getSpaceId = (item: any) => {
    return item.siteId || item.groupId || item.group?.id || item.id;
};

function getSpaceRootFilesURL(groupId: string) {
    // 2. SAFEGUARD: If we somehow don't get an ID, return the current valid URL or empty 
    // to prevent the "scopeGroupId eq undefined" crash.
    if (!groupId || groupId === 'undefined') {
        return ''; 
    }

    return `${ROOT_URL}?${new URLSearchParams({
        ...BASE_SEARCH_PARAMS,
        // We use the same filter logic as before
        filter: `cmsRoot eq true and cmsSection eq 'files' and status in (0, 2, 3) and scopeGroupId eq ${groupId}`,
    }).toString()}`;
}

function getCMSChildFolderURL(folderId: string) {
    return `${ROOT_URL}?${new URLSearchParams({
        ...BASE_SEARCH_PARAMS,
        filter: `folderId eq ${folderId}`,
    }).toString()}`;
}

type CMSFile = {
    id: number;
    title: string;
};

type Space = {
    id: string;
    name: string;
};

function CMSFilesItemSelectorModal({
    fdsProps,
    ...otherProps
}: Omit<
    IItemSelectorModalProps<CMSFile>,
    'itemTypeLabel' | 'fdsProps' | 'apiURL'
> & {
    fdsProps?: IItemSelectorModalProps<CMSFile>['fdsProps'];
}) {
    const [folderStructure, setFolderStructure] = useState<
        {folderId: string; folderName: string}[]
    >([]);
    
    const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

    // Initial URL loads the Spaces list
    const [url, setURL] = useState(SPACES_API_URL);

    function onSpaceClick(space: Space) {
        setSelectedSpace(space);
        setURL(getSpaceRootFilesURL(space.id)); 
        setFolderStructure([]);
    }

    function onChildFolderClick({
        folderId,
        folderName,
    }: {
        folderId: string;
        folderName: string;
    }) {
        setFolderStructure((prevStructure) => [
            ...prevStructure,
            {folderId, folderName},
        ]);
        setURL(getCMSChildFolderURL(folderId));
    }

    function onResetToSpaces() {
        setSelectedSpace(null);
        setFolderStructure([]);
        setURL(SPACES_API_URL);
    }

    const currentViews = !selectedSpace 
        ? [
            // --- SPACES VIEW (ROOT) ---
            {
                contentRenderer: 'cards',
                label: Liferay.Language.get('cards'),
                name: 'cards',
                schema: {
                    description: 'description',
                    title: 'name', 
                },
                setItemComponentProps: ({ item, props }: any) => ({
                    ...props,
                    // 3. FIX: Use helper to extract siteId
                    onClick: () => {
                        const spaceId = getSpaceId(item);
                        onSpaceClick({id: spaceId, name: item.name});
                    },
                    symbol: 'shapes',
                }),
                thumbnail: 'cards2',
            },
            {
                contentRenderer: 'table',
                customRenderer: {
                    component: ({ itemData, value }: any) => (
                        <ClayButton
                            displayType="link"
                            // 3. FIX: Use helper to extract siteId
                            onClick={() => {
                                const spaceId = getSpaceId(itemData);
                                onSpaceClick({id: spaceId, name: itemData.name});
                            }}
                        >
                            {value}
                        </ClayButton>
                    )
                },
                label: Liferay.Language.get('table'),
                name: 'table',
                schema: {
                    fields: [
                        {
                            fieldName: 'name',
                            label: Liferay.Language.get('name'),
                            sortable: true,
                        },
                        {
                            fieldName: 'description',
                            label: Liferay.Language.get('description'),
                            sortable: false,
                        },
                    ],
                },
            }
        ] as IView[]
        : [
            // --- FILES VIEW (NESTED) ---
            {
                contentRenderer: 'cards',
                label: Liferay.Language.get('cards'),
                name: 'cards',
                schema: {
                    description: 'embedded.description',
                    image: 'embedded.file.thumbnailURL',
                    title: 'embedded.title',
                },
                setItemComponentProps: ({
                    item,
                    props,
                }: {
                    item: any;
                    props: any;
                }) => {
                    if (
                        item.entryClassName ===
                        OBJECT_ENTRY_FOLDER_CLASS_NAME
                    ) {
                        return {
                            ...props,
                            onClick: () => {
                                onChildFolderClick({
                                    folderId: item.embedded.id,
                                    folderName: item.embedded.title,
                                });
                            },
                            onSelectChange: null,
                            symbol: 'folder',
                        };
                    }

                    const stickerProps = {
                        className: 'file-icon-color-5',
                        displayType: 'unstyled',
                    };

                    if (
                        !item.embedded?.file?.mimeType?.startsWith('image')
                    ) {
                        return {
                            ...props,
                            imgProps: null,
                            stickerProps,
                        };
                    }

                    return {
                        ...props,
                        stickerProps,
                    };
                },
                thumbnail: 'cards2',
            },
            {
                contentRenderer: 'table',
                label: Liferay.Language.get('table'),
                name: 'table',
                schema: {
                    fields: [
                        {
                            contentRenderer: 'cmsFilesTitleCellRenderer',
                            fieldName: 'embedded.title',
                            label: Liferay.Language.get('title'),
                            sortable: false,
                        },
                        {
                            fieldName: 'embedded.description',
                            label: Liferay.Language.get('description'),
                            sortable: false,
                        },
                        {
                            fieldName: 'embedded.file.name',
                            label: Liferay.Language.get('file-name'),
                            sortable: false,
                        },
                        {
                            fieldName: 'embedded.file.mimeType',
                            label: Liferay.Language.get('type'),
                            sortable: false,
                        },
                    ],
                },
                thumbnail: 'table',
            },
        ] as IView[];

    const getBreadcrumbs = () => {
        const breadcrumbs = [];

        if (selectedSpace) {
            breadcrumbs.push({
                label: Liferay.Language.get('spaces'), 
                onClick: onResetToSpaces,
            });

            if (folderStructure.length) {
                 breadcrumbs.push({
                    label: selectedSpace.name,
                    onClick: () => {
                        // 4. FIX: Use the specific space ID we stored in state
                        setURL(getSpaceRootFilesURL(selectedSpace.id));
                        setFolderStructure([]);
                    }
                 });
            } else {
                 breadcrumbs.push({
                     active: true,
                     label: selectedSpace.name,
                 });
            }

            folderStructure.forEach(({folderId, folderName}, index) => {
                const isLast = index === folderStructure.length - 1;
                breadcrumbs.push({
                    active: isLast,
                    label: folderName,
                    onClick: isLast ? undefined : () => {
                        setFolderStructure((prev) => prev.slice(0, index + 1));
                        setURL(getCMSChildFolderURL(folderId));
                    },
                });
            });
        }
        
        return breadcrumbs.length ? breadcrumbs : undefined;
    };

    return (
        <ItemSelectorModal
            {...otherProps}
            apiURL={url}
            breadcrumbs={getBreadcrumbs()}
            fdsProps={{
                pagination: {
                    deltas: [{label: 20}, {label: 40}, {label: 60}],
                    initialDelta: 20,
                },
                ...fdsProps,
                customRenderers: {
                    tableCell: [
                        {
                            component: ({itemData, value}) => {
                                // 5. Logic to distinguish "Inside Space" vs "Space List"
                                if (selectedSpace) {
                                    const {embedded, entryClassName} = itemData;

                                    return entryClassName === OBJECT_ENTRY_FOLDER_CLASS_NAME ? (
                                        <ClayButton
                                            className="c-p-0"
                                            displayType="link"
                                            onClick={() => {
                                                onChildFolderClick({
                                                    folderId: embedded.id,
                                                    folderName: embedded.title,
                                                });
                                            }}
                                        >
                                            {value}
                                        </ClayButton>
                                    ) : (
                                        value
                                    );
                                }

                                // Root (Spaces) List Renderer
                                return (
                                     <ClayButton
                                        className="c-p-0"
                                        displayType="link"
                                        onClick={() => {
                                            const spaceId = getSpaceId(itemData);
                                            onSpaceClick({id: spaceId, name: itemData.name});
                                        }}
                                    >
                                        {value}
                                    </ClayButton>
                                )
                            },
                            name: 'cmsFilesTitleCellRenderer',
                            type: 'internal',
                        },
                    ],
                },
                id: `itemSelectorModal-cms-${uuidv4()}`,
                views: currentViews,
            }}
            itemTypeLabel={Liferay.Language.get(selectedSpace ? 'files' : 'spaces')}
            locator={{
                // 6. Ensure locator ID doesn't try to find 'embedded' on a space object
                id: selectedSpace ? 'embedded.id' : 'id',
                label: selectedSpace ? 'embedded.title' : 'name',
                value: selectedSpace ? 'embedded.id' : 'id',
            }}
            multiSelect={false}
        />
    );
}

export default CMSFilesItemSelectorModal;