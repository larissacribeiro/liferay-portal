/**
 * SPDX-FileCopyrightText: (c) 2023 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import { useModal } from '@clayui/modal';
import ClayModal from '@clayui/modal';
import { sub } from 'frontend-js-web';
import React from 'react';
import WarningModal from '../WarningModal';
import { DeletedObjectDefinition } from '../ViewObjectDefinitions/ViewObjectDefinitions';


interface IProps {
    closeModal: () => void;
    error: string | any | undefined | unknown;
}

export default function ModalRelationshipDeletionNotAllowed({
    closeModal,
    error,
}: IProps) {
    const { observer, onClose } = useModal({
        onClose: () => closeModal(),
    });
    return (
        <>
            <WarningModal
                observer={observer}
                onClose={onClose}
                title={Liferay.Language.get('deletion-not-allowed')}
            >
                <ClayModal.Body><span>{error}</span></ClayModal.Body>

            </WarningModal>
        </>
    );
}