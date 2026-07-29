/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ApiHelper, {RequestResult} from './ApiHelper';

/**
 * Identifies the object entry an asset is linked to, together with the endpoint
 * and the relationship field that store the link. A CMP task and a CMP project
 * keep their links in different objects, so the backend resolves which one
 * applies and the frontend stays agnostic of the side it is linking.
 */
export type ObjectEntryLinkContext = {
	objectEntryId: string;
	objectRelationshipFieldName: string;
	restContextPath: string;
	scopeGroupId: string;
};

/**
 * The soft reference a link row stores to point back at the asset. The asset
 * lives in another object, so it is addressed by class name plus external
 * reference codes rather than by primary key.
 */
export type LinkedAsset = {
	classExternalReferenceCode: string;
	className: string;
	groupExternalReferenceCode: string;
};

type LinkRequest = {
	context: ObjectEntryLinkContext;
	linkedAsset: LinkedAsset;
};

/**
 * Narrows loose props to a usable link context, or null when the caller has no
 * object entry to link to. The creation menu and the file drop hand these
 * fields over one by one, and the plain content list has none of them, so the
 * completeness check belongs here rather than at each call site.
 */
export function toLinkContext(
	data: Partial<ObjectEntryLinkContext>
): ObjectEntryLinkContext | null {
	const {
		objectEntryId,
		objectRelationshipFieldName,
		restContextPath,
		scopeGroupId,
	} = data;

	if (
		!objectEntryId ||
		!objectRelationshipFieldName ||
		!restContextPath ||
		!scopeGroupId
	) {
		return null;
	}

	return {
		objectEntryId,
		objectRelationshipFieldName,
		restContextPath,
		scopeGroupId,
	};
}

/**
 * Narrows a content list item to the fields the link row stores, so the item
 * shape stays in one place instead of at every call site.
 */
export function toLinkedAsset({
	embedded,
	entryClassName,
}: {
	embedded: {
		externalReferenceCode: string;
		systemProperties?: {scope?: {externalReferenceCode?: string}};
	};
	entryClassName: string;
}): LinkedAsset {
	return {
		classExternalReferenceCode: embedded.externalReferenceCode,
		className: entryClassName,
		groupExternalReferenceCode:
			embedded.systemProperties?.scope?.externalReferenceCode ?? '',
	};
}

/**
 * Escapes a value for an OData string literal. An external reference code may
 * contain an apostrophe, which would otherwise close the literal early and
 * make the filter unparseable.
 */
function escapeLiteral(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Resolves the link row joining the object entry to the asset. The link row id
 * is not known to the caller, so it is looked up by the pair the row stores.
 */
async function fetchLinkId({
	context,
	linkedAsset,
}: LinkRequest): Promise<RequestResult<number | null>> {
	const filter = [
		`${context.objectRelationshipFieldName} eq '${escapeLiteral(
			context.objectEntryId
		)}'`,
		`className eq '${escapeLiteral(linkedAsset.className)}'`,
		`classExternalReferenceCode eq '${escapeLiteral(
			linkedAsset.classExternalReferenceCode
		)}'`,
		`groupExternalReferenceCode eq '${escapeLiteral(
			linkedAsset.groupExternalReferenceCode
		)}'`,
	].join(' and ');

	const {data, error, status, type} = await ApiHelper.get<{
		items: Array<{id: number}>;
	}>(
		`${context.restContextPath}/scopes/${
			context.scopeGroupId
		}?filter=${encodeURIComponent(filter)}`
	);

	if (error !== null) {
		return {data: null, error, status, type};
	}

	return {data: data.items?.[0]?.id ?? null, error: null};
}

/**
 * Links the asset to the object entry by creating a link row for the pair.
 */
async function linkAsset({
	context,
	linkedAsset,
}: LinkRequest): Promise<RequestResult<{id: number}>> {
	return ApiHelper.post<{id: number}>(
		`${context.restContextPath}/scopes/${context.scopeGroupId}`,
		{
			...linkedAsset,
			[context.objectRelationshipFieldName]: Number(
				context.objectEntryId
			),
		}
	);
}

/**
 * Unlinks the asset from the object entry by deleting the link row for the
 * pair. A missing row is reported as an error rather than ignored, since the
 * caller acted on a row the list had just shown.
 */
async function unlinkAsset({
	context,
	linkedAsset,
}: LinkRequest): Promise<RequestResult<null>> {
	const {
		data: linkId,
		error,
		status,
		type,
	} = await fetchLinkId({
		context,
		linkedAsset,
	});

	if (error !== null) {
		return {data: null, error, status, type};
	}

	if (linkId === null) {
		return {
			data: null,
			error: Liferay.Language.get('an-unexpected-error-occurred'),
		};
	}

	return ApiHelper.delete(`${context.restContextPath}/${linkId}`);
}

const ObjectEntryLinkService = {
	linkAsset,
	unlinkAsset,
};

export default ObjectEntryLinkService;
