/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ApiHelper, {RequestResult} from './ApiHelper';

/**
 * State keys for a CMP project, matching the `state` picklist defined by the
 * CMPProject object in site-initializer-cmp.
 */
export type CMPProjectStateKey =
	| 'blocked'
	| 'done'
	| 'inProgress'
	| 'notStarted';

export type CMPProject = {
	dueDate?: string;
	id: number;

	// The id of the CMPProjectAssetRelationship entry linking this project to
	// the current asset. Present only on linked projects; required to unlink.

	linkId?: number;

	scopeKey?: string;
	state?: {
		key: CMPProjectStateKey | string;
		name: string;
	};
	title: string;
};

export type CMPTask = {
	id: number;
	title: string;
};

/**
 * Identifies the asset being linked. `className` and `externalReferenceCode`
 * plus `scopeKey` are the fields the CMPProjectAssetRelationship object stores
 * to point back at the asset.
 */
export type AssetIdentity = {
	entryClassName?: string;
	entryExternalReferenceCode?: string;
	entryScopeKey?: string;
};

/**
 * PROVISIONAL. While `MOCK` is `true` the service is backed by the in-memory
 * store below so the panels can be exercised without the backend deployed. The
 * real code paths match the CMP backend contract on LPD-97809
 * (CMPProjectAssetRelationship object + /o/cmp/project-asset-relationships
 * REST). Flip `MOCK` to `false` once that backend is deployed, then delete the
 * mock block.
 */
const MOCK = false;

const MOCK_PROJECTS: CMPProject[] = [
	{
		dueDate: '2026-12-21',
		id: 1,
		scopeKey: 'MOCK-PROJECT-1',
		state: {key: 'inProgress', name: Liferay.Language.get('in-progress')},
		title: 'GOV Digital',
	},
	{
		dueDate: '2026-08-30',
		id: 2,
		scopeKey: 'MOCK-PROJECT-2',
		state: {key: 'notStarted', name: Liferay.Language.get('not-started')},
		title: 'Customer Success Spotlight',
	},
	{
		dueDate: '2025-06-12',
		id: 3,
		scopeKey: 'MOCK-PROJECT-3',
		state: {key: 'inProgress', name: Liferay.Language.get('in-progress')},
		title: 'TechLeaders Summit 2025',
	},
	{
		dueDate: '2026-09-01',
		id: 4,
		scopeKey: 'MOCK-PROJECT-4',
		state: {key: 'blocked', name: Liferay.Language.get('blocked')},
		title: 'Devcon 2026',
	},
];

// Tasks are associated to an asset today through the CMP task's "related
// assets" section (Liferay asset links), not a dedicated object. The reverse
// query used here (tasks of a project related to this asset) is still mocked
// until it is wired to that existing mechanism. LPD-97811 only guarantees the
// current task-linking flow keeps working; it does not add a new backend.

const MOCK_TASKS: {[projectId: number]: CMPTask[]} = {
	1: [
		{id: 101, title: 'Review Blog Post'},
		{id: 102, title: 'Write Document'},
		{id: 103, title: 'Publish Landing Page'},
	],
	3: [
		{id: 301, title: 'Prepare Keynote'},
		{id: 302, title: 'Book Venue'},
	],
};

const mockLinkIdsByAsset = new Map<string, Map<number, number>>();

let mockLinkIdCounter = 1;

function getMockLinks(assetKey: string): Map<number, number> {
	let links = mockLinkIdsByAsset.get(assetKey);

	if (!links) {
		links = new Map<number, number>();

		mockLinkIdsByAsset.set(assetKey, links);
	}

	return links;
}

function mockAssetKey({entryExternalReferenceCode}: AssetIdentity): string {
	return entryExternalReferenceCode ?? 'mock-asset';
}

function mockResult<T>(data: T): Promise<RequestResult<T>> {
	return Promise.resolve({data, error: null});
}

type ProjectSearchItem = {
	embedded: {
		dueDate?: string;
		externalReferenceCode: string;
		id: number;
		scopeKey: string;
		state?: {key: string; name: string};
		title: string;
	};
};

type ProjectAssetLinkSearchItem = {
	embedded: {
		classExternalReferenceCode: string;
		className: string;
		id: number;
		r_cmpProjectAssetLinks_c_cmpProjectId: number;
		scopeKey: string;
	};
};

const PROJECT_ASSET_RELATIONSHIPS_URL = '/o/cmp/project-asset-relationships';

function buildSearchURL(objectDefinitionId: number, page: number): string {
	return `/o/search/v1.0/search?emptySearch=true&nestedFields=embedded&page=${page}&pageSize=500&filter=${encodeURIComponent(
		`objectDefinitionId eq ${objectDefinitionId}`
	)}`;
}

/**
 * /o/search clamps pageSize to 500, so page through every result rather than
 * reading only the first page.
 */
async function fetchAllSearchItems<T>(
	objectDefinitionId: number,
	signal?: AbortSignal
): Promise<RequestResult<T[]>> {
	const items: T[] = [];

	let lastPage = 1;
	let page = 1;

	while (page <= lastPage) {
		const {data, error, status, type} = await ApiHelper.get<{
			items: T[];
			lastPage: number;
		}>(buildSearchURL(objectDefinitionId, page), signal);

		if (error !== null) {
			return {data: null, error, status, type};
		}

		items.push(...data.items);

		lastPage = data.lastPage;
		page += 1;
	}

	return {data: items, error: null};
}

/**
 * Lists every CMP project the author can link to, used to populate the
 * "Search or Select a Project" picker.
 */
async function getProjects({
	cmpProjectObjectDefinitionId,
	signal,
}: {
	cmpProjectObjectDefinitionId?: number | null;
	signal?: AbortSignal;
}): Promise<RequestResult<CMPProject[]>> {
	if (MOCK) {
		return mockResult(MOCK_PROJECTS);
	}

	if (!cmpProjectObjectDefinitionId) {
		return {data: [], error: null};
	}

	const {data, error, status, type} =
		await fetchAllSearchItems<ProjectSearchItem>(
			cmpProjectObjectDefinitionId,
			signal
		);

	if (error !== null) {
		return {data: null, error, status, type};
	}

	return {
		data: data.map(({embedded}) => ({
			dueDate: embedded.dueDate,
			id: embedded.id,
			scopeKey: embedded.scopeKey,
			state: embedded.state,
			title: embedded.title,
		})),
		error: null,
	};
}

/**
 * Lists the CMP projects already linked to the given asset. The relationship
 * object only stores project ids, so the result is joined against the loaded
 * `projects` to recover each project's title, due date, and state.
 */
async function getLinkedProjects({
	cmpProjectAssetRelationshipObjectDefinitionId,
	entryClassName,
	entryExternalReferenceCode,
	entryScopeKey,
	projects,
	signal,
}: AssetIdentity & {
	cmpProjectAssetRelationshipObjectDefinitionId?: number | null;
	projects: CMPProject[];
	signal?: AbortSignal;
}): Promise<RequestResult<CMPProject[]>> {
	if (MOCK) {
		const links = getMockLinks(mockAssetKey({entryExternalReferenceCode}));

		return mockResult(
			projects
				.filter((project) => links.has(project.id))
				.map((project) => ({...project, linkId: links.get(project.id)}))
		);
	}

	if (!cmpProjectAssetRelationshipObjectDefinitionId) {
		return {data: [], error: null};
	}

	const {data, error, status, type} =
		await fetchAllSearchItems<ProjectAssetLinkSearchItem>(
			cmpProjectAssetRelationshipObjectDefinitionId,
			signal
		);

	if (error !== null) {
		return {data: null, error, status, type};
	}

	const projectsById = new Map(
		projects.map((project) => [project.id, project])
	);

	const linkedProjects: CMPProject[] = [];

	data.forEach(({embedded}) => {

		// `className` narrows the match when the caller knows it (the content
		// editor). The content list's info panel only has the asset's external
		// reference code and scope key, so the className check is skipped there
		// and the effectively-unique classExternalReferenceCode + scopeKey pair
		// identifies the asset.

		if (
			(entryClassName && embedded.className !== entryClassName) ||
			embedded.classExternalReferenceCode !==
				entryExternalReferenceCode ||
			embedded.scopeKey !== entryScopeKey
		) {
			return;
		}

		const project = projectsById.get(
			embedded.r_cmpProjectAssetLinks_c_cmpProjectId
		);

		if (project) {
			linkedProjects.push({...project, linkId: embedded.id});
		}
	});

	return {data: linkedProjects, error: null};
}

/**
 * Links a CMP project to the asset. Auto-saved: called as soon as the author
 * picks a project. Returns the created relationship entry (its `id` is the
 * `linkId` needed to unlink later).
 */
async function linkProject({
	entryClassName,
	entryExternalReferenceCode,
	entryScopeKey,
	project,
}: AssetIdentity & {
	project: CMPProject;
}): Promise<RequestResult<{id: number}>> {
	if (MOCK) {
		const links = getMockLinks(mockAssetKey({entryExternalReferenceCode}));

		const linkId = mockLinkIdCounter++;

		links.set(project.id, linkId);

		return mockResult({id: linkId});
	}

	return ApiHelper.post<{id: number}>(
		`${PROJECT_ASSET_RELATIONSHIPS_URL}/scopes/${project.scopeKey}`,
		{
			classExternalReferenceCode: entryExternalReferenceCode,
			className: entryClassName,
			r_cmpProjectAssetLinks_c_cmpProjectId: project.id,
			scopeKey: entryScopeKey,
		}
	);
}

/**
 * Unlinks a CMP project from the asset. Auto-saved: called as soon as the
 * author removes a project. Keyed by the relationship entry id.
 */
async function unlinkProject({
	entryExternalReferenceCode,
	linkId,
	projectId,
}: {
	entryExternalReferenceCode?: string;
	linkId: number;
	projectId: number;
}): Promise<RequestResult<null>> {
	if (MOCK) {
		getMockLinks(mockAssetKey({entryExternalReferenceCode})).delete(
			projectId
		);

		return mockResult(null);
	}

	return ApiHelper.delete(`${PROJECT_ASSET_RELATIONSHIPS_URL}/${linkId}`);
}

type TaskSearchItem = {
	embedded: {
		id: number;
		keywords?: string[];
		r_cmpProjectToCMPTasks_c_cmpProjectId?: number;
		title: string;
	};
};

// A task is associated to an asset today through tag matching: the task owns
// identity tags prefixed with the CMPTask external reference code, and an asset
// is "related" to the task when it carries one of those tags in its keywords
// (this is the legacy mechanism the epic replaces for projects but keeps for
// tasks per LPD-97811).

const TASK_TAG_PREFIX = 'L_CMP_TASK';

/**
 * Lists the asset's associated tasks grouped by project id, resolved from the
 * asset's keywords (see TASK_TAG_PREFIX) in a single search. A project id
 * absent from the result simply has no associated tasks. Falls back to the mock
 * while MOCK is true or the task object definition id is unavailable.
 */
async function getLinkedTasks({
	assetKeywords,
	cmpTaskObjectDefinitionId,
	signal,
}: {
	assetKeywords?: string[];
	cmpTaskObjectDefinitionId?: number | null;
	signal?: AbortSignal;
}): Promise<RequestResult<{[projectId: number]: CMPTask[]}>> {
	if (MOCK) {
		return mockResult(MOCK_TASKS);
	}

	const taskTags = (assetKeywords ?? []).filter((keyword) =>
		keyword.startsWith(TASK_TAG_PREFIX)
	);

	if (!cmpTaskObjectDefinitionId || !taskTags.length) {
		return {data: {}, error: null};
	}

	const {data, error, status, type} = await ApiHelper.get<{
		items?: TaskSearchItem[];
	}>(
		`/o/search/v1.0/search?emptySearch=true&nestedFields=embedded&pageSize=500&filter=${encodeURIComponent(
			`objectDefinitionId eq ${cmpTaskObjectDefinitionId} and keywords/any(k:k in (${taskTags
				.map((tag) => `'${tag}'`)
				.join(',')}))`
		)}`,
		signal
	);

	if (error !== null) {
		return {data: null, error, status, type};
	}

	const tasksByProjectId: {[projectId: number]: CMPTask[]} = {};

	(data.items ?? []).forEach(({embedded}) => {
		const projectId = embedded.r_cmpProjectToCMPTasks_c_cmpProjectId;

		if (projectId === undefined) {
			return;
		}

		if (!tasksByProjectId[projectId]) {
			tasksByProjectId[projectId] = [];
		}

		tasksByProjectId[projectId].push({
			id: embedded.id,
			title: embedded.title,
		});
	});

	return {data: tasksByProjectId, error: null};
}

const ProjectLinkService = {
	getLinkedProjects,
	getLinkedTasks,
	getProjects,
	linkProject,
	unlinkProject,
};

export default ProjectLinkService;
