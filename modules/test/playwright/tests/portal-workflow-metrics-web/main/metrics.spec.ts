/**
 * SPDX-FileCopyrightText: (c) 2025 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, expect, mergeTests} from '@playwright/test';

import {apiHelpersTest} from '../../../fixtures/apiHelpersTest';
import {dataApiHelpersTest} from '../../../fixtures/dataApiHelpersTest';
import {featureFlagsTest} from '../../../fixtures/featureFlagsTest';
import {isolatedSiteTest} from '../../../fixtures/isolatedSiteTest';
import {loginTest} from '../../../fixtures/loginTest';
import {workflowPagesTest} from '../../../fixtures/workflowPagesTest';
import {MetricsPage} from '../../../pages/portal-workflow-metrics-web/MetricsPage';
import {clickAndExpectToBeVisible} from '../../../utils/clickAndExpectToBeVisible';
import getRandomString from '../../../utils/getRandomString';
import {
	performLoginViaApi,
	performLogout,
	userData,
} from '../../../utils/performLogin';
import {PORTLET_URLS} from '../../../utils/portletUrls';
import getBasicWebContentStructureId from '../../../utils/structured-content/getBasicWebContentStructureId';
import getFormContainerDefinition from '../../layout-content-page-editor-web/main/utils/getFormContainerDefinition';
import getPageDefinition from '../../layout-content-page-editor-web/main/utils/getPageDefinition';
import {getWorkflowDefinition} from '../../portal-workflow-kaleo-designer-web/main/utils/getWorkflowDefinition';
import postSingleApproverCopy from '../../portal-workflow-kaleo-designer-web/main/utils/postSingleApproverCopy';

export const test = mergeTests(
	apiHelpersTest,
	dataApiHelpersTest,
	featureFlagsTest({
		'LPS-178052': {enabled: true},
	}),
	isolatedSiteTest,
	loginTest(),
	workflowPagesTest
);

const assignments = [];

async function navigateToSLASettings(
	page: Page,
	metricsPage: MetricsPage,
	processName: string
) {
	await expect(async () => {
		await metricsPage.goTo();

		await expect(
			page.getByRole('link', {exact: true, name: processName})
		).toBeVisible({timeout: 5_000});
	}).toPass({timeout: 60_000});

	await page.getByRole('link', {exact: true, name: processName}).click();

	await page.locator('#headerKebab').getByRole('button').click();

	await page.getByRole('link', {name: 'SLA Settings'}).click();
}

async function fillSLANodeDropdown(
	page: Page,
	labelFor: 'slaTimePause' | 'slaTimeStart' | 'slaTimeStop',
	optionText: string
) {
	const dropdownId = {
		slaTimePause: 'pause',
		slaTimeStart: 'start',
		slaTimeStop: 'stop',
	}[labelFor];

	await page
		.locator(
			`xpath=//label[@for="${labelFor}"]/following-sibling::div//input[contains(@class,"form-control-inset")]`
		)
		.click();

	await page
		.locator(`#dropDownList${dropdownId}`)
		.getByText(optionText, {exact: true})
		.click();
}

test('Can search assignees and steps in Performance by Assignee and Step views', async ({
	apiHelpers,
	metricsPage,
	page,
	performanceByAssigneePage,
	performanceByStepPage,
	processMetricsPage,
	site,
	workflowTasksPage,
}) => {
	test.slow();
	page.setViewportSize({height: 1080, width: 1920});

	await test.step('assign the "Single Approver" workflow to Web Content Article', async () => {
		await page.goto(
			`/group${site.friendlyUrlPath}${PORTLET_URLS.workflow}`
		);

		await page.waitForLoadState('networkidle');

		await page
			.getByRole('row', {name: 'Web Content Article'})
			.getByRole('button', {name: 'Edit'})
			.click();

		await page.getByRole('combobox').selectOption('Single Approver@1');

		await page.getByRole('button', {name: 'Save'}).click();
	});

	await test.step('create a new site page', async () => {
		const formId = getRandomString();

		const formDefinition = getFormContainerDefinition({
			id: formId,
		});

		const pageName = getRandomString();

		await apiHelpers.headlessDelivery.createSitePage({
			pageDefinition: getPageDefinition([formDefinition]),
			siteId: site.id,
			title: pageName,
		});
	});

	await test.step('create three users and three web contents', async () => {
		const role =
			await apiHelpers.headlessAdminUser.getRoleByName('Administrator');

		for (let i = 0; i < 3; i++) {
			const user = await apiHelpers.headlessAdminUser.postUserAccount();

			userData[user.alternateName] = {
				name: user.givenName,
				password: 'test',
				surname: user.familyName,
			};

			await apiHelpers.headlessAdminUser.assignUserToRole(
				role.externalReferenceCode,
				user.id
			);

			apiHelpers.data.push({
				id: user.id,
				type: 'userAccount',
			});

			const basicWebContentStructureId =
				await getBasicWebContentStructureId(apiHelpers);

			const webContent =
				await apiHelpers.jsonWebServicesJournal.addWebContent({
					ddmStructureId: basicWebContentStructureId,
					groupId: site.id,
					titleMap: {en_US: `Web content ${i}`},
				});

			apiHelpers.data.push({
				id: `${site.id}_${webContent.articleId}`,
				type: 'webContent',
			});

			assignments.push({user, webContent});
		}
	});

	await test.step('assign each web content to its corresponding user', async () => {
		for (const {user, webContent} of assignments) {
			await workflowTasksPage.goToAssignedToMyRoles();

			await workflowTasksPage.assignToUser(webContent.title, user);
		}
	});

	await test.step('log in as each user and approve their assigned web content task', async () => {
		for (const {user, webContent} of assignments) {
			await page.getByTitle('User Profile Menu').click();

			await page.getByRole('menuitem', {name: 'Sign Out'}).click();

			await page.waitForURL('**/home');

			await performLoginViaApi({
				page,
				screenName: user.alternateName,
			});

			await page.goto(
				`/group${site.friendlyUrlPath}${PORTLET_URLS.myWorkflowTasks}`
			);

			await workflowTasksPage.approve(webContent.title);
		}
	});

	await test.step('log back in as the test user and navigate to the View All Assignees page', async () => {
		await page.getByTitle('User Profile Menu').click();

		await page.getByRole('menuitem', {name: 'Sign Out'}).click();

		await performLoginViaApi({
			page,
			screenName: 'test',
		});

		await metricsPage.goTo();

		await workflowTasksPage.processSingleAprover.click();

		await workflowTasksPage.performanceTab.click();

		await processMetricsPage.viewAllAssigneesButton.click();
	});

	await test.step('assert that it is possible to search for an assignee in the View All Assignees page', async () => {
		await performanceByAssigneePage.searchBar.fill(
			assignments[0].user.alternateName
		);

		await page.getByRole('search').getByRole('button').click();

		await expect(
			page.getByRole('cell', {
				name: `${assignments[0].user.alternateName} ${assignments[0].user.alternateName}`,
			})
		).toBeVisible();

		await performanceByAssigneePage.searchBar.fill('something else');

		await page.getByRole('search').getByRole('button').click();

		await expect(page.getByText('No results found')).toBeVisible();
	});

	await metricsPage.goTo();

	await workflowTasksPage.processSingleAprover.click();

	await workflowTasksPage.performanceTab.click();

	await processMetricsPage.viewAllStepsButton.click();

	await test.step('assert that it is possible to seach and filter a step in the View All Steps page', async () => {
		await performanceByStepPage.searchBar.fill('Update');

		await page.getByRole('search').getByRole('button').click();

		const row = page
			.getByRole('row', {name: 'Update'})
			.filter({
				has: page.getByRole('cell', {name: '0 (0%)'}),
			})
			.filter({
				has: page.getByRole('cell', {name: '0min'}),
			});

		await expect(row).toBeVisible();

		await page.getByRole('button', {name: 'Last'}).click();

		await page.getByText('Yesterday').click();

		await expect(row).toBeVisible();
	});

	await page.locator('#backButton').getByRole('link').click();

	await test.step('assert custom date range filter displays selected dates', async () => {
		const panel = processMetricsPage.getPanel('Performance by Step');

		const dropdown = page.locator('.dropdown-menu.show');

		await clickAndExpectToBeVisible({
			target: dropdown,
			trigger: panel.getByRole('button', {name: 'Last 30 Days'}),
		});

		await dropdown.getByRole('menuitem', {name: 'Custom Range'}).click();

		const customRangeForm = page.locator(
			'.dropdown-menu.dropdown-menu-inline-table.show'
		);

		await customRangeForm
			.locator('input[name="dateStart"]')
			.fill('09/22/2018');

		await customRangeForm
			.locator('input[name="dateEnd"]')
			.fill('11/11/2018');

		await customRangeForm.getByRole('button', {name: 'Apply'}).click();

		await expect(
			panel.getByRole('button', {
				name: 'Sep 22, 2018 - Nov 11, 2018',
			})
		).toBeVisible();
	});
});

test('Pagination of Pending Items works correctly', async ({
	apiHelpers,
	metricsPage,
	page,
	site,
}) => {
	test.slow();
	await test.step('assign the "Single Approver" workflow to Web Content Article', async () => {
		await page.goto(
			`/group${site.friendlyUrlPath}${PORTLET_URLS.workflow}`
		);

		await page.waitForLoadState('networkidle');

		await page
			.getByRole('row', {name: 'Web Content Article'})
			.getByRole('button', {name: 'Edit'})
			.click();

		await page.getByRole('combobox').selectOption('Single Approver@1');

		await page.getByRole('button', {name: 'Save'}).click();
	});

	const basicWebContentStructureId =
		await getBasicWebContentStructureId(apiHelpers);

	for (let i = 1; i <= 21; i++) {
		const webContent =
			await apiHelpers.jsonWebServicesJournal.addWebContent({
				ddmStructureId: basicWebContentStructureId,
				groupId: site.id,
				titleMap: {en_US: `Web content ${i}`},
			});

		apiHelpers.data.push({
			id: `${site.id}_${webContent.articleId}`,
			type: 'webContent',
		});
	}
	await test.step('set web content workflow assignments to single approver', async () => {
		await metricsPage.goTo();

		await page
			.getByRole('cell', {name: 'Single Approver'})
			.getByRole('link')
			.click();

		await page
			.getByRole('link')
			.filter({hasText: 'Total Pending'})
			.first()
			.click();
	});

	await test.step('assert that the correct number of entries based on the selected entries per page option is displayed', async () => {
		await expect(
			page.getByRole('row').filter({hasText: 'Web content'})
		).toHaveCount(20);

		await page.getByLabel('Go to the next page').click();

		await expect(
			page.getByRole('row').filter({hasText: 'Web content'})
		).toHaveCount(1);
	});

	await test.step('assert that ascending Creation Date sorting is preserved when the user changes the pagination', async () => {
		await page.getByLabel('Items per Page').click();

		await page.getByRole('option').filter({hasText: '40'}).click();

		await page.getByRole('link', {name: 'Creation Date'}).dblclick();

		for (let i = 1; i <= 21; i++) {
			await expect(
				page
					.getByRole('cell', {
						exact: true,
						name: `Web Content Article: Web content ${i}`,
					})
					.last()
			).toBeVisible();
		}
	});
});

test(
	'Performance by Assignee card includes inactive users',
	{tag: '@LPD-90168'},
	async ({
		apiHelpers,
		metricsPage,
		page,
		site,
		workflowPage,
		workflowTasksPage,
	}) => {
		let user: TUserAccount;

		await test.step('create a user with the Administrator role', async () => {
			const role =
				await apiHelpers.headlessAdminUser.getRoleByName(
					'Administrator'
				);

			user = await apiHelpers.headlessAdminUser.postUserAccount();

			userData[user.alternateName] = {
				name: user.givenName,
				password: 'test',
				surname: user.familyName,
			};

			await apiHelpers.headlessAdminUser.assignUserToRole(
				role.externalReferenceCode,
				user.id
			);

			apiHelpers.data.push({id: user.id, type: 'userAccount'});
		});

		await test.step('assign the Single Approver workflow to Blogs Entry', async () => {
			await workflowPage.goto(site.friendlyUrlPath);

			await workflowPage.changeWorkflow('Blogs Entry', 'Single Approver');
		});

		await test.step('create a blog entry and approve it as the new user', async () => {
			const blogTitle = `Blog ${getRandomString()}`;

			await apiHelpers.headlessDelivery.postBlog(site.id, {
				headline: blogTitle,
			});

			await performLogout(page);

			await performLoginViaApi({page, screenName: user.alternateName});

			await workflowTasksPage.goToAssignedToMyRoles(site.friendlyUrlPath);

			await workflowTasksPage.assignToMe(blogTitle);

			await workflowTasksPage.assignedToMeLink.click();

			await workflowTasksPage.approve(blogTitle);

			await performLogout(page);

			await performLoginViaApi({page, screenName: 'test'});
		});

		const userName = `${user.givenName} ${user.familyName}`;

		await test.step('assert the active user appears in Performance by Assignee', async () => {
			await metricsPage.goTo(site.friendlyUrlPath);

			await metricsPage.chooseProcess('Single Approver');

			await workflowTasksPage.performanceTab.click();

			await expect(
				page.getByRole('cell', {name: userName})
			).toBeVisible();
		});

		await test.step('deactivate user and assert it still appears in Performance by Assignee', async () => {
			await apiHelpers.headlessAdminUser.patchUserAccount(user, {
				status: 5,
			});

			await metricsPage.goTo(site.friendlyUrlPath);

			await metricsPage.chooseProcess('Single Approver');

			await workflowTasksPage.performanceTab.click();

			await expect(
				page.getByRole('cell', {name: userName})
			).toBeVisible();
		});
	}
);

test(
	'All workflow processes including unpublished ones appear in metrics',
	{tag: '@LPD-90149'},
	async ({apiHelpers, metricsPage, page}) => {
		test.slow();

		const workflowDefinition = getWorkflowDefinition('sample-start-end');

		let workflows: WorkflowDefinition[];

		await test.step('create four workflow definitions', async () => {
			workflows = await Promise.all(
				[1, 2, 3, 4].map(async (index) => {
					const name = `${getRandomString()} Workflow ${index}`;

					const workflow =
						await apiHelpers.headlessAdminWorkflow.postWorkflowDefinitionSave(
							name,
							{
								...workflowDefinition,
								externalReferenceCode: getRandomString(),
							}
						);

					apiHelpers.data.push({
						id: workflow.id,
						type: 'workflowDefinition',
					});

					return workflow;
				})
			);
		});

		await test.step('deactivate the last two workflow definitions', async () => {
			for (const workflow of workflows.slice(2)) {
				await apiHelpers.headlessAdminWorkflow.deleteWorkflowDefinitionUndeploy(
					workflow.name,
					'1'
				);
			}
		});

		await test.step('assert all five workflows appear in the metrics list', async () => {
			await expect(async () => {
				await metricsPage.goTo();

				for (const workflow of [
					...workflows,
					{name: 'Single Approver'},
				]) {
					await expect(
						page.getByRole('link', {
							exact: true,
							name: workflow.name,
						})
					).toBeVisible({timeout: 5_000});
				}
			}).toPass({timeout: 60_000});
		});
	}
);

test(
	'Performance by Assignee table is updated after a completed task is deleted',
	{tag: '@LPD-90169'},
	async ({
		apiHelpers,
		metricsPage,
		page,
		site,
		workflowPage,
		workflowTasksPage,
	}) => {
		let blogId: number;

		await test.step('assign the Single Approver workflow to Blogs Entry', async () => {
			await workflowPage.goto(site.friendlyUrlPath);

			await workflowPage.changeWorkflow('Blogs Entry', 'Single Approver');
		});

		await test.step('create a blog entry and approve the workflow task', async () => {
			const blogTitle = `Blog ${getRandomString()}`;

			const blog = await apiHelpers.headlessDelivery.postBlog(site.id, {
				headline: blogTitle,
			});

			blogId = blog.id;

			await workflowTasksPage.goToAssignedToMyRoles(site.friendlyUrlPath);

			await workflowTasksPage.assignToMe(blogTitle);

			await workflowTasksPage.assignedToMeLink.click();

			await workflowTasksPage.approve(blogTitle);
		});

		await test.step('assert the admin appears with one completed task', async () => {
			await metricsPage.goTo(site.friendlyUrlPath);

			await metricsPage.chooseProcess('Single Approver');

			await workflowTasksPage.performanceTab.click();

			const adminRow = page.getByRole('row').filter({
				has: page.getByRole('cell', {exact: true, name: 'Test Test'}),
			});

			await expect(async () => {
				await page.reload();

				await expect(
					adminRow.getByText('1', {exact: true})
				).toBeVisible();
			}).toPass();
		});

		await test.step('delete the blog entry and assert the empty state', async () => {
			await apiHelpers.headlessDelivery.deleteBlog(blogId);

			await metricsPage.goTo(site.friendlyUrlPath);

			await metricsPage.chooseProcess('Single Approver');

			await workflowTasksPage.performanceTab.click();

			await expect(async () => {
				await page.reload();

				await expect(
					page
						.locator('.panel', {
							hasText: 'Performance by Assignee',
						})
						.getByText('There is no data at the moment.', {
							exact: true,
						})
				).toBeVisible();
			}).toPass();
		});
	}
);

test('Performance by step table reorders correctly when column headers are clicked',
	{tag: '@LPD-65880'}, async ({apiHelpers, metricsPage, page, processMetricsPage, site, workflowPage, workflowTasksPage}) => {
			test.slow();

		page.setViewportSize({height: 1080, width: 1920});

		const workflow = await postSingleApproverCopy(apiHelpers);

		apiHelpers.data.push({id: workflow.id, type: 'workflowDefinition'});

		const goToProcessMetrics = async () => {
			await metricsPage.goTo();

			await page
				.getByRole('link', {exact: true, name: workflow.name})
				.click();

			await page.waitForLoadState('networkidle');
		};

		const overdueValue = page.locator(
			'xpath=(//div[@class="header"][span[contains(text(),"Overdue")]]/following-sibling::div)[1]'
		);

		let blogHeadlines: string[];

		await test.step('assign the workflow copy to Blogs Entry in the isolated site', async () => {
			await workflowPage.goto(site.friendlyUrlPath);

			await workflowPage.changeWorkflow('Blogs Entry', workflow.name);
		});

		await test.step('create two SLAs on the workflow copy', async () => {
			await navigateToSLASettings(page, metricsPage, workflow.name);

			await page.locator('a.btn-primary').click();

			await page.locator('input#slaName').fill(getRandomString());

			await fillSLANodeDropdown(page, 'slaTimeStart', 'Process Begins');

			await fillSLANodeDropdown(
				page,
				'slaTimeStop',
				'Process Ends: Approved'
			);

			await page
				.locator('input#slaDurationHours')
				.pressSequentially('0003');

			await page.getByRole('button', {name: 'Save'}).click();

			await expect(page.getByText('SLA was saved.')).toBeVisible();

			await page.locator('a.btn-primary').click();

			await page.locator('input#slaName').fill(getRandomString());

			await fillSLANodeDropdown(
				page,
				'slaTimeStart',
				'Enters Task: Update'
			);

			await fillSLANodeDropdown(
				page,
				'slaTimeStop',
				'Process Ends: Approved'
			);

			await page
				.locator('input#slaDurationHours')
				.pressSequentially('0001');

			await page.getByRole('button', {name: 'Save'}).click();

			await expect(page.getByText('SLA was saved.')).toBeVisible();
		});

		await test.step('create three blog entries and submit for review', async () => {
			blogHeadlines = [1, 2, 3].map(() => `Blog ${getRandomString()}`);

			await Promise.all(
				blogHeadlines.map((headline) =>
					apiHelpers.headlessDelivery.postBlog(site.id, {headline})
				)
			);

			await workflowTasksPage.goToAssignedToMyRoles(site.friendlyUrlPath);

			await workflowTasksPage.assignToMe(blogHeadlines[0]);

			await workflowTasksPage.reject(blogHeadlines[0]);
		});

		await test.step('wait for all three items to become overdue', async () => {
			await expect(async () => {
				await goToProcessMetrics();

				await expect(overdueValue).not.toHaveText('0', {
					timeout: 5_000,
				});
			}).toPass({timeout: 120_000});

			await workflowTasksPage.resubmit(blogHeadlines[0]);

			await expect(async () => {
				await goToProcessMetrics();

				await expect(overdueValue).toHaveText('3', {timeout: 5_000});
			}).toPass({timeout: 180_000});
		});

		await test.step('approve all blog entries', async () => {
			await workflowTasksPage.goToAssignedToMyRoles(site.friendlyUrlPath);

			for (const headline of blogHeadlines) {
				await workflowTasksPage.assignToMe(headline);
			}

			for (const headline of blogHeadlines) {
				await workflowTasksPage.approve(headline);
			}
		});

		await test.step('assert performance by step table sort order', async () => {
			await goToProcessMetrics();

			await workflowTasksPage.performanceTab.click();

			await processMetricsPage.viewAllStepsButton.click();

			const rows = page.locator('tbody tr');

			await expect(rows.nth(0)).toContainText('Update');

			await expect(rows.nth(1)).toContainText('Review');

			await page.getByText('SLA Breached (%)').click();

			await expect(rows.nth(0)).toContainText('Review');

			await expect(rows.nth(1)).toContainText('Update');

			await page.getByText('Average Completion Time').click();

			await expect(rows.nth(0)).toContainText('Review');

			await expect(rows.nth(1)).toContainText('Update');

			await page.getByText('Average Completion Time').click();

			await expect(rows.nth(1)).toContainText('Review');
		});
	}

		);

test('Selecting a date range in the Completed Items panel deselects the previous one', async ({
	metricsPage,
	page,
	processMetricsPage,
	workflowTasksPage,
}) => {
	await metricsPage.goTo();

	await workflowTasksPage.processSingleAprover.click();

	await workflowTasksPage.performanceTab.click();

	const completedItemsPanel = processMetricsPage.getPanel('Completed Items');

	const dropdown = page.locator('.dropdown-menu.show');

	await clickAndExpectToBeVisible({
		target: dropdown,
		trigger: completedItemsPanel.getByRole('button', {
			name: 'Last 30 Days',
		}),
	});

	await dropdown.getByRole('menuitem', {name: 'Last 7 Days'}).click();

	await expect(
		completedItemsPanel.getByRole('button', {name: 'Last 7 Days'})
	).toBeVisible();

	await expect(
		completedItemsPanel.getByRole('button', {name: 'Last 30 Days'})
	).not.toBeVisible();
}
);

test.describe('SLA', () => {
	test(
		'User can create an SLA and read back all its fields',
		{tag: '@LPD-89858'},
		async ({apiHelpers, metricsPage, page}) => {
			test.slow();

			const slaDescription = 'SLA Description';
			const slaDays = '1';
			const slaHours = '0000';
			const slaName = 'SLA Name';
			const slaStart = 'Process Begins';
			const slaStop = 'Process Ends: Approved';

			const workflow = await postSingleApproverCopy(apiHelpers);

			apiHelpers.data.push({id: workflow.id, type: 'workflowDefinition'});

			await test.step('create an SLA', async () => {
				await navigateToSLASettings(page, metricsPage, workflow.name);

				await page.locator('a.btn-primary').click();

				await page.locator('input#slaName').fill(slaName);

				await page.locator('input#slaDescription').fill(slaDescription);

				await fillSLANodeDropdown(page, 'slaTimeStart', slaStart);

				await fillSLANodeDropdown(page, 'slaTimeStop', slaStop);

				await page.locator('input#slaDurationDays').fill(slaDays);

				await page
					.locator('input#slaDurationHours')
					.pressSequentially(slaHours);

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(page.getByText('SLA was saved.')).toBeVisible();
			});

			await test.step('assert all SLA fields are persisted correctly', async () => {
				await page
					.locator('.table-list-title')
					.getByRole('link', {name: slaName})
					.click();

				await expect(page.locator('input#slaName')).toHaveValue(
					slaName
				);

				await expect(page.locator('input#slaDescription')).toHaveValue(
					slaDescription
				);

				await expect(
					page.locator(
						'xpath=//label[@for="slaTimeStart"]/following-sibling::div//span[@class="label-item label-item-expand"]'
					)
				).toHaveText(slaStart);

				await expect(
					page.locator(
						'xpath=//label[@for="slaTimeStop"]/following-sibling::div//span[@class="label-item label-item-expand"]'
					)
				).toHaveText(slaStop);

				await expect(page.locator('input#slaDurationDays')).toHaveValue(
					slaDays
				);
			});
		}
	);

	test(
		'SLA form shows correct validation errors and saves successfully',
		{tag: '@LPD-89856'},
		async ({apiHelpers, metricsPage, page}) => {
			test.slow();

			const workflow = await postSingleApproverCopy(apiHelpers);

			apiHelpers.data.push({id: workflow.id, type: 'workflowDefinition'});

			await test.step('assert no-SLA message is shown on the process dashboard', async () => {
				await expect(async () => {
					await metricsPage.goTo();

					await expect(
						page.getByRole('link', {
							exact: true,
							name: workflow.name,
						})
					).toBeVisible({timeout: 5_000});
				}).toPass({timeout: 60_000});

				await page
					.getByRole('link', {exact: true, name: workflow.name})
					.click();

				await expect(
					page.getByText('No SLAs are defined for this process.')
				).toBeVisible();

				await page.locator('#headerKebab').getByRole('button').click();

				await page.getByRole('link', {name: 'SLA Settings'}).click();
			});

			await test.step('assert name is required', async () => {
				await page.locator('a.btn-primary').click();

				await fillSLANodeDropdown(
					page,
					'slaTimeStart',
					'Process Begins'
				);

				await fillSLANodeDropdown(
					page,
					'slaTimeStop',
					'Process Ends: Approved'
				);

				await page.locator('input#slaDurationDays').fill('1');

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(
					page.getByText('Please fill in the required fields.')
				).toBeVisible();

				await expect(
					page.getByText('A name is required.')
				).toBeVisible();

				await page.getByRole('button', {name: 'Cancel'}).click();
			});

			await test.step('assert start and stop are required', async () => {
				await page.locator('a.btn-primary').click();

				await page.locator('input#slaName').fill('SLA Name');

				await page.locator('input#slaDurationDays').fill('1');

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(
					page
						.getByText('At least one parameter is required.')
						.first()
				).toBeVisible();

				await page.getByRole('button', {name: 'Cancel'}).click();
			});

			await test.step('assert stop is required when start is set', async () => {
				await page.locator('a.btn-primary').click();

				await page.locator('input#slaName').fill('SLA Name');

				await fillSLANodeDropdown(
					page,
					'slaTimeStart',
					'Process Begins'
				);

				await page.locator('input#slaDurationDays').fill('1');

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(
					page
						.getByText('At least one parameter is required.')
						.first()
				).toBeVisible();

				await page.getByRole('button', {name: 'Cancel'}).click();
			});

			await test.step('assert duration is required', async () => {
				await page.locator('a.btn-primary').click();

				await page.locator('input#slaName').fill('SLA Name');

				await fillSLANodeDropdown(
					page,
					'slaTimeStart',
					'Process Begins'
				);

				await fillSLANodeDropdown(
					page,
					'slaTimeStop',
					'Process Ends: Approved'
				);

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(
					page.getByText('A duration time is required.')
				).toBeVisible();

				await page.getByRole('button', {name: 'Cancel'}).click();
			});

			await test.step('assert days field only accepts digits', async () => {
				await page.locator('a.btn-primary').click();

				await page
					.locator('input#slaDurationDays')
					.pressSequentially('_,-+!@#$%^*()=.?/;:{}[]|aA1');

				await expect(page.locator('input#slaDurationDays')).toHaveValue(
					'1'
				);

				await page.getByRole('button', {name: 'Cancel'}).click();
			});

			await test.step('assert hours must be below 23:59', async () => {
				await page.locator('a.btn-primary').click();

				await page.locator('input#slaName').fill('SLA Name');

				await fillSLANodeDropdown(
					page,
					'slaTimeStart',
					'Process Begins'
				);

				await fillSLANodeDropdown(
					page,
					'slaTimeStop',
					'Process Ends: Approved'
				);

				await page.locator('input#slaDurationDays').fill('1');

				await page
					.locator('input#slaDurationHours')
					.pressSequentially('2400');

				await page.locator('input#slaDurationHours').blur();

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(
					page.getByText('Value must be an hour below 23:59.')
				).toBeVisible();

				await page.getByRole('button', {name: 'Cancel'}).click();
			});

			await test.step('create a valid SLA and assert it is saved', async () => {
				await page.locator('a.btn-primary').click();

				await page.locator('input#slaName').fill('SLA Name');

				await page
					.locator('input#slaDescription')
					.fill('SLA Description');

				await fillSLANodeDropdown(
					page,
					'slaTimeStart',
					'Process Begins'
				);

				await fillSLANodeDropdown(
					page,
					'slaTimeStop',
					'Process Ends: Approved'
				);

				await page.locator('input#slaDurationDays').fill('1');

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(page.getByText('SLA was saved.')).toBeVisible();

				await expect(
					page.locator('.table-list-title').getByRole('link', {
						name: 'SLA Name',
					})
				).toBeVisible();
			});

			await test.step('assert duplicate name is rejected, then rename and save', async () => {
				await page.locator('a.btn-primary').click();

				await page.locator('input#slaName').fill('SLA Name');

				await page
					.locator('input#slaDescription')
					.fill('SLA Description');

				await fillSLANodeDropdown(
					page,
					'slaTimeStart',
					'Process Begins'
				);

				await fillSLANodeDropdown(
					page,
					'slaTimeStop',
					'Process Ends: Approved'
				);

				await page
					.locator('input#slaDurationHours')
					.pressSequentially('0001');

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(
					page.getByText('An SLA with the same name already exists.')
				).toBeVisible();

				await page.locator('input#slaName').fill('SLA Name1');

				await page.getByRole('button', {name: 'Save'}).click();

				await expect(page.getByText('SLA was saved.')).toBeVisible();

				await expect(
					page.locator('.table-list-title').getByRole('link', {
						name: 'SLA Name1',
					})
				).toBeVisible();
			});
		}
	);
});
