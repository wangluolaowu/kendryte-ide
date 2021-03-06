import { FieldContext, FieldInjectBak, FieldTemplate } from 'vs/kendryte/vs/workbench/patchSettings2/browser/typedFieldElementBase';
import { createDecorator, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { getDynamicEnum, isDynamicEnum, ISettingItemTemplate } from 'vs/kendryte/vs/workbench/config/common/type';
import { ITree } from 'vs/base/parts/tree/browser/tree';
import { attachEditableSelectBoxStyler, EditableSelectBox } from 'vs/kendryte/vs/base/browser/ui/editableSelect';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { SettingsTreeSettingElement } from 'vs/workbench/contrib/preferences/browser/settingsTreeModels';
import { EnumProviderService } from 'vs/kendryte/vs/platform/config/common/dynamicEnum';
import { SettingValueType } from 'vs/workbench/services/preferences/common/preferences';

interface Template {
	input: EditableSelectBox;
}

export class DynamicEnumInject extends FieldInjectBak<string, Template> {
	ID = 'settings.dynamic-enum.template';

	private contextViewService: IContextViewService;
	private themeService: IThemeService;

	protected dependency() {
		return [IContextViewService, IThemeService];
	}

	protected _template(tree: ITree, template: ISettingItemTemplate & FieldContext): Template {
		const input = new EditableSelectBox(template.controlElement, this.contextViewService);
		template.toDispose.push(input);
		template.toDispose.push(attachEditableSelectBoxStyler(input, this.themeService));

		template.toDispose.push(input.onDidChange(e => {
			this.fireChangeEvent(template, {
				value: e,
				type: template.context ? template.context.valueType : SettingValueType.Null,
			});
		}));

		return {
			input,
		};
	}

	protected _entry(tree: ITree, element: SettingsTreeSettingElement, template: FieldTemplate<string, Template>): void {
		const enumDef = getDynamicEnum(element.setting);
		if (!enumDef) {
			throw new TypeError('impossible');
		}
		if (typeof enumDef.service === 'string') {
			enumDef.service = createDecorator(enumDef.service);
		}
		const IDecorator = enumDef.service;

		const service: EnumProviderService<string> = this.instantiationService.invokeFunction((accessor: ServicesAccessor) => {
			return accessor.get(IDecorator);
		}) as EnumProviderService<string>;

		template.input.value = element.value;
		template.input.registerEnum(service.getDynamicEnum());
	}

	_detect(element: SettingsTreeSettingElement) {
		return isDynamicEnum(element.setting);
	}
}