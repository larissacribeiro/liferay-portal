/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayButtonWithIcon} from '@clayui/button';
import {Option, Picker} from '@clayui/core';
import ClayLabel from '@clayui/label';
import {useIsMounted} from '@liferay/frontend-js-react-web';
import {openToast} from 'frontend-js-components-web';
import React, {useEffect, useMemo, useState} from 'react';

import ProjectLinkService, {CMPProject} from '../services/ProjectLinkService';

import '../../../css/components/LinkedProjects.scss';

type Props = {
	cmpProjectAssetRelationshipObjectDefinitionId?: number | null;
	cmpProjectObjectDefinitionId?: number | null;
	entryClassName?: string;
	entryExternalReferenceCode?: string;
	entryScopeKey?: string;
	hasLinkProjectPermission?: boolean;
};

const STATE_DISPLAY_TYPE: {
	[key: string]: React.ComponentProps<typeof ClayLabel>['displayType'];
} = {
	blocked: 'danger',
	done: 'success',
	inProgress: 'info',
	notStarted: 'secondary',
	overdue: 'warning',
};

/**
 * Derives the badge shown on a project card. "Overdue" is not a stored state:
 * it is computed from the due date whenever the project is not yet done.
 */
function getStatus(project: CMPProject): {key: string; name: string} | null {
	const isOverdue =
		Boolean(project.dueDate) &&
		project.state?.key !== 'done' &&
		project.dueDate!.slice(0, 10) < new Date().toISOString().slice(0, 10);

	if (isOverdue) {
		return {key: 'overdue', name: Liferay.Language.get('overdue')};
	}

	return project.state ?? null;
}

function formatDueDate(dueDate?: string): string {
	if (!dueDate) {
		return '';
	}

	return new Date(dueDate).toLocaleDateString(
		Liferay.ThemeDisplay.getBCP47LanguageId(),
		{day: 'numeric', month: 'short', year: 'numeric'}
	);
}

/**
 * Links a CMP asset to one or more CMP projects. Selecting a project from the
 * picker links it, and removing a card unlinks it; both are auto-saved. Shared
 * by the content editor's Projects side panel and the content list's info
 * panel.
 */
export default function LinkedProjects({
	cmpProjectAssetRelationshipObjectDefinitionId,
	cmpProjectObjectDefinitionId,
	entryClassName,
	entryExternalReferenceCode,
	entryScopeKey,
	hasLinkProjectPermission = true,
}: Props) {
	const [projects, setProjects] = useState<CMPProject[]>([]);
	const [linkedProjects, setLinkedProjects] = useState<CMPProject[]>([]);

	const isMounted = useIsMounted();

	useEffect(() => {
		const controller = new AbortController();

		ProjectLinkService.getProjects({
			cmpProjectObjectDefinitionId,
			signal: controller.signal,
		}).then(({data, error}) => {
			if (!isMounted()) {
				return;
			}

			if (data) {
				setProjects(data);
			}
			else if (error) {
				openToast({message: error, type: 'danger'});
			}
		});

		return () => controller.abort();
	}, [cmpProjectObjectDefinitionId, isMounted]);

	useEffect(() => {
		const controller = new AbortController();

		ProjectLinkService.getLinkedProjects({
			cmpProjectAssetRelationshipObjectDefinitionId,
			entryClassName,
			entryExternalReferenceCode,
			entryScopeKey,
			projects,
			signal: controller.signal,
		}).then(({data, error}) => {
			if (!isMounted()) {
				return;
			}

			if (data) {
				setLinkedProjects(data);
			}
			else if (error) {
				openToast({message: error, type: 'danger'});
			}
		});

		return () => controller.abort();
	}, [
		cmpProjectAssetRelationshipObjectDefinitionId,
		entryClassName,
		entryExternalReferenceCode,
		entryScopeKey,
		isMounted,
		projects,
	]);

	// A project already linked to the asset cannot be linked twice, so it is
	// removed from the picker options.

	const linkedProjectIds = useMemo(
		() => new Set(linkedProjects.map(({id}) => id)),
		[linkedProjects]
	);

	const selectableProjects = useMemo(
		() => projects.filter(({id}) => !linkedProjectIds.has(id)),
		[linkedProjectIds, projects]
	);

	const linkProject = async (project: CMPProject) => {
		setLinkedProjects((previous) => [...previous, project]);

		const {data, error} = await ProjectLinkService.linkProject({
			entryClassName,
			entryExternalReferenceCode,
			entryScopeKey,
			project,
		});

		if (!isMounted()) {
			return;
		}

		if (error || !data) {
			setLinkedProjects((previous) =>
				previous.filter(({id}) => id !== project.id)
			);

			openToast({
				message:
					error ||
					Liferay.Language.get('an-unexpected-error-occurred'),
				type: 'danger',
			});

			return;
		}

		setLinkedProjects((previous) =>
			previous.map((linkedProject) =>
				linkedProject.id === project.id
					? {...linkedProject, linkId: data.id}
					: linkedProject
			)
		);
	};

	const unlinkProject = async (project: CMPProject) => {
		if (project.linkId === undefined) {
			return;
		}

		setLinkedProjects((previous) =>
			previous.filter(({id}) => id !== project.id)
		);

		const {error} = await ProjectLinkService.unlinkProject({
			entryExternalReferenceCode,
			linkId: project.linkId,
			projectId: project.id,
		});

		if (error && isMounted()) {
			setLinkedProjects((previous) => [...previous, project]);

			openToast({message: error, type: 'danger'});
		}
	};

	return (
		<div className="cms-linked-projects">
			{hasLinkProjectPermission ? (
				<Picker<CMPProject>
					aria-label={Liferay.Language.get('projects')}
					items={selectableProjects}
					onSelectionChange={(key) => {
						const project = selectableProjects.find(
							({id}) => id === Number(key)
						);

						if (project) {
							linkProject(project);
						}
					}}
					placeholder={Liferay.Language.get(
						'search-or-select-a-project'
					)}
					selectedKey=""
				>
					{(project) => (
						<Option key={project.id} textValue={project.title}>
							{project.title}
						</Option>
					)}
				</Picker>
			) : null}

			<div className="cms-linked-projects-list mt-3">
				{linkedProjects.map((project) => {
					const status = getStatus(project);

					return (
						<div
							className="align-items-start cms-linked-projects-card d-flex justify-content-between"
							key={project.id}
						>
							<div>
								{project.projectURL ? (
									<a
										className="font-weight-semi-bold"
										href={project.projectURL}
									>
										{project.title}
									</a>
								) : (
									<span className="font-weight-semi-bold">
										{project.title}
									</span>
								)}

								{project.dueDate ? (
									<div className="text-2 text-secondary">
										{Liferay.Util.sub(
											Liferay.Language.get('due-date-x'),
											formatDueDate(project.dueDate)
										)}
									</div>
								) : null}

								{status ? (
									<ClayLabel
										className="mt-1"
										displayType={
											STATE_DISPLAY_TYPE[status.key] ??
											'secondary'
										}
										inverse
									>
										{status.name}
									</ClayLabel>
								) : null}
							</div>

							{hasLinkProjectPermission ? (
								<ClayButtonWithIcon
									aria-label={Liferay.Language.get('remove')}
									borderless
									displayType="secondary"
									onClick={() => unlinkProject(project)}
									size="sm"
									symbol="times-circle"
									title={Liferay.Language.get('remove')}
								/>
							) : null}
						</div>
					);
				})}
			</div>
		</div>
	);
}
