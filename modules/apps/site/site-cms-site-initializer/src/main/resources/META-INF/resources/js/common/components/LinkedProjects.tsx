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

import ProjectLinkService, {
	CMPProject,
	CMPTask,
} from '../services/ProjectLinkService';

import '../../../css/components/LinkedProjects.scss';

type Props = {
	assetKeywords?: string[];
	cmpProjectAssetRelationshipObjectDefinitionId?: number | null;
	cmpProjectObjectDefinitionId?: number | null;
	cmpTaskObjectDefinitionId?: number | null;
	entryClassName?: string;
	entryExternalReferenceCode?: string;
	entryScopeKey?: string;
	hasLinkProjectPermission?: boolean;
	projectViewURL?: string;
	taskViewURL?: string;
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
	assetKeywords,
	cmpProjectAssetRelationshipObjectDefinitionId,
	cmpProjectObjectDefinitionId,
	cmpTaskObjectDefinitionId,
	entryClassName,
	entryExternalReferenceCode,
	entryScopeKey,
	hasLinkProjectPermission = true,
	projectViewURL,
	taskViewURL,
}: Props) {
	const [projects, setProjects] = useState<CMPProject[]>([]);
	const [linkedProjects, setLinkedProjects] = useState<CMPProject[]>([]);
	const [expandedProjectIds, setExpandedProjectIds] = useState<Set<number>>(
		new Set()
	);
	const [tasksByProjectId, setTasksByProjectId] = useState<{
		[projectId: number]: CMPTask[];
	}>({});

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

	// The asset's associated tasks are loaded once, grouped by project, so each
	// card knows whether it has tasks (and should be expandable) before the
	// author expands it.

	useEffect(() => {
		const controller = new AbortController();

		ProjectLinkService.getLinkedTasks({
			assetKeywords,
			cmpTaskObjectDefinitionId,
			signal: controller.signal,
		}).then(({data, error}) => {
			if (!isMounted()) {
				return;
			}

			if (data) {
				setTasksByProjectId(data);
			}
			else if (error) {
				openToast({message: error, type: 'danger'});
			}
		});

		return () => controller.abort();
	}, [assetKeywords, cmpTaskObjectDefinitionId, isMounted]);

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

		openToast({
			message: Liferay.Language.get(
				'your-request-completed-successfully'
			),
			type: 'success',
		});
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

		if (!isMounted()) {
			return;
		}

		if (error) {
			setLinkedProjects((previous) => [...previous, project]);

			openToast({message: error, type: 'danger'});

			return;
		}

		openToast({
			message: Liferay.Language.get(
				'your-request-completed-successfully'
			),
			type: 'success',
		});
	};

	const toggleTasks = (project: CMPProject) => {
		setExpandedProjectIds((previous) => {
			const expandedIds = new Set(previous);

			if (expandedIds.has(project.id)) {
				expandedIds.delete(project.id);
			}
			else {
				expandedIds.add(project.id);
			}

			return expandedIds;
		});
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

			<div className="cms-linked-projects-list">
				{linkedProjects.map((project) => {
					const status = getStatus(project);

					const projectURL = projectViewURL
						? `${projectViewURL}${project.id}`
						: undefined;

					const expanded = expandedProjectIds.has(project.id);

					const tasks = tasksByProjectId[project.id] ?? [];

					const hasTasks = !!tasks.length;

					return (
						<div
							className="cms-linked-projects-card"
							key={project.id}
						>
							<div className="cms-linked-projects-card-title">
								{projectURL ? (
									<a
										className="cms-linked-projects-card-name"
										href={projectURL}
									>
										{project.title}
									</a>
								) : (
									<span className="cms-linked-projects-card-name">
										{project.title}
									</span>
								)}

								{project.dueDate ? (
									<div className="cms-linked-projects-card-due-date">
										{Liferay.Util.sub(
											Liferay.Language.get('due-date-x'),
											formatDueDate(project.dueDate)
										)}
									</div>
								) : null}

								{status ? (
									<ClayLabel
										className="cms-linked-projects-card-status"
										displayType={
											STATE_DISPLAY_TYPE[status.key] ??
											'secondary'
										}
										inverse
									>
										{status.name}
									</ClayLabel>
								) : null}

								{hasTasks && expanded ? (
									<ul className="cms-linked-projects-tasks">
										{tasks.map((task) => {
											const taskURL = taskViewURL
												? `${taskViewURL}${task.id}`
												: undefined;

											return (
												<li key={task.id}>
													{taskURL ? (
														<a href={taskURL}>
															{task.title}
														</a>
													) : (
														task.title
													)}
												</li>
											);
										})}
									</ul>
								) : null}
							</div>

							<div className="cms-linked-projects-card-actions">
								{hasTasks ? (
									<ClayButtonWithIcon
										aria-label={
											expanded
												? Liferay.Language.get(
														'collapse'
													)
												: Liferay.Language.get('expand')
										}
										borderless
										displayType="secondary"
										onClick={() => toggleTasks(project)}
										size="sm"
										symbol={
											expanded
												? 'angle-down'
												: 'angle-right'
										}
										title={
											expanded
												? Liferay.Language.get(
														'collapse'
													)
												: Liferay.Language.get('expand')
										}
									/>
								) : null}

								{hasLinkProjectPermission ? (
									<ClayButtonWithIcon
										aria-label={Liferay.Language.get(
											'remove'
										)}
										borderless
										displayType="secondary"
										onClick={() => unlinkProject(project)}
										size="sm"
										symbol="times-circle"
										title={Liferay.Language.get('remove')}
									/>
								) : null}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
