import { ILifecycleService } from 'vs/platform/lifecycle/common/lifecycle';
import { StatusbarAlignment } from 'vs/platform/statusbar/common/statusbar';
import { dispose, IDisposable } from 'vs/base/common/lifecycle';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IWorkspaceContextService, WorkbenchState } from 'vs/platform/workspace/common/workspace';
import { StatusBarItem } from 'vs/workbench/parts/maix/cmake/common/statusBarButton';
import {
	ACTION_ID_MAIX_CMAKE_BUILD,
	ACTION_ID_MAIX_CMAKE_CLEANUP,
	ACTION_ID_MAIX_CMAKE_RUN,
	ACTION_ID_MAIX_CMAKE_SELECT_TARGET,
	ACTION_ID_MAIX_CMAKE_SELECT_VARIANT,
	ACTION_ID_MAIX_CMAKE_UPLOAD,
} from 'vs/workbench/parts/maix/cmake/common/type';
import { StatusBarController } from 'vs/workbench/parts/maix/cmake/common/statusBarController';
import { localize } from 'vs/nls';

let entries: IDisposable[] = [];

export function addStatusBarCmakeButtons(access: ServicesAccessor) {
	const instantiationService: IInstantiationService = access.get(IInstantiationService);
	const lifecycleService: ILifecycleService = access.get(ILifecycleService);
	const workspaceContextService: IWorkspaceContextService = access.get(IWorkspaceContextService);

	lifecycleService.onShutdown(() => {
		entries.forEach((item) => {
			dispose(item);
		});
	});

	const selectTip = instantiationService.createInstance(StatusBarItem, StatusbarAlignment.LEFT, 3.9);
	selectTip.text = '$(book)';
	selectTip.tooltip = 'CMake';
	entries.push(selectTip);

	const selectVariantButton = instantiationService.createInstance(StatusBarItem, StatusbarAlignment.LEFT, 3.89);
	selectVariantButton.text = '';
	selectVariantButton.tooltip = localize('debug.select.variant', 'Click to select build variant');
	selectVariantButton.command = ACTION_ID_MAIX_CMAKE_SELECT_VARIANT;
	entries.push(selectVariantButton);

	const selectTargetButton = instantiationService.createInstance(StatusBarItem, StatusbarAlignment.LEFT, 3.88);
	selectTargetButton.text = '';
	selectTargetButton.tooltip = localize('debug.select.target', 'Click to select build target');
	selectTargetButton.command = ACTION_ID_MAIX_CMAKE_SELECT_TARGET;
	entries.push(selectTargetButton);

	const cleanButton = instantiationService.createInstance(StatusBarItem, StatusbarAlignment.LEFT, 3.8);
	cleanButton.text = '$(trashcan)';
	cleanButton.tooltip = localize('Cleanup', 'Cleanup');
	cleanButton.command = ACTION_ID_MAIX_CMAKE_CLEANUP;
	entries.push(cleanButton);

	const buildButton = instantiationService.createInstance(StatusBarItem, StatusbarAlignment.LEFT, 3.7);
	buildButton.text = '$(checklist)';
	buildButton.tooltip = localize('Build', 'Build');
	buildButton.command = ACTION_ID_MAIX_CMAKE_BUILD;
	entries.push(buildButton);

	const launchTargetButton = instantiationService.createInstance(StatusBarItem, StatusbarAlignment.LEFT, 3.6);
	launchTargetButton.text = '$(triangle-right)';
	launchTargetButton.tooltip = localize('Debug', 'Debug');
	launchTargetButton.command = ACTION_ID_MAIX_CMAKE_RUN;
	entries.push(launchTargetButton);

	const uploadTargetButton = instantiationService.createInstance(StatusBarItem, StatusbarAlignment.LEFT, 3.5);
	uploadTargetButton.text = '$(desktop-download)';
	uploadTargetButton.tooltip = localize('Upload', 'Upload');
	uploadTargetButton.command = ACTION_ID_MAIX_CMAKE_UPLOAD;
	entries.push(uploadTargetButton);

	const statusTip = instantiationService.createInstance(StatusBarItem, StatusbarAlignment.LEFT, 4);
	entries.push(statusTip);

	const controller = new StatusBarController(
		statusTip,
		selectVariantButton,
		selectTargetButton,
		[
			selectTip,
			selectVariantButton,
			selectTargetButton,
			uploadTargetButton,
			launchTargetButton,
			buildButton,
			cleanButton,
		],
	);

	const statusUpdate = (state) => {
		controller.setEmptyState(state === WorkbenchState.EMPTY);
	};
	const tipUpdate = workspaceContextService.onDidChangeWorkbenchState(statusUpdate);
	statusUpdate(workspaceContextService.getWorkbenchState());
	entries.push(tipUpdate);

	return controller;
}