import { IKendryteMainIpcChannel, IKendryteServiceRunnerChannel } from 'vs/kendryte/vs/services/ipc/node/ipc';
import { CancellationToken } from 'vs/base/common/cancellation';
import { Emitter, Event } from 'vs/base/common/event';
import { createDecorator, IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IRemoteProgress } from 'vs/kendryte/vs/services/ipc/common/type';
import { ILogService } from 'vs/platform/log/common/log';
import { inspect } from 'util';
import { registerMainIPC } from 'vs/kendryte/vs/platform/instantiation/electron-main/mainIpcExtensions';
import { registerMainSingleton } from 'vs/kendryte/vs/platform/instantiation/common/mainExtensions';
import { IKendryteServerService } from 'vs/kendryte/vs/services/ipc/electron-main/ipcType';
import { TPromise } from 'vs/base/common/winjs.base';
import { URI } from 'vs/base/common/uri';
import { IMainChannelLogService } from 'vs/kendryte/vs/services/channelLogger/electron-main/service';
import { processErrorStack } from 'vs/kendryte/vs/base/electron-main/errorStack';
import { memoize } from 'vs/base/common/decorators';

class KendryteIPCMainService implements IKendryteMainIpcChannel {
	_serviceBrand: any;

	private onNotify = new Emitter<IRemoteProgress>();

	constructor(
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@ILogService protected readonly logger: ILogService,
	) {
	}

	@memoize
	private get mainChannelLogService() {
		return this.instantiationService.invokeFunction((access) => {
			return access.get<IMainChannelLogService>(IMainChannelLogService);
		});
	}

	public call<T>(command: string, arg?: any, cancellationToken?: CancellationToken): Thenable<T> {
		this.logger.debug('[IPC] command', command);
		// arg = this.instantiationService.invokeFunction(parseArgs, arg || []);
		switch (command) {
			case 'stopLogEvent':
				return this.mainChannelLogService._handleStopLogEvent(arg[0], arg[1]) as TPromise<any>;
		}
		throw new Error(`No command "${command}" found`);
	}

	public listen<T>(event: string, arg?: any): Event<T> {
		this.logger.debug('[IPC] listen', event);
		switch (event) {
			case 'progress': // TODO: this no impl
				return this.onNotify.event as Event<any>;
			case 'logEvent':
				return this.mainChannelLogService._handleLogEvent(arg[0], arg[1]) as Event<any>;
			default:
				throw new Error(`No event "${event}" found`);
		}
	}
}

registerMainIPC(IKendryteMainIpcChannel, KendryteIPCMainService);
registerMainSingleton(IKendryteServerService, KendryteIPCMainService);

class RemoteServiceRunner implements IKendryteServiceRunnerChannel {
	_serviceBrand: any;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILogService private readonly logService: ILogService,
	) {
	}

	public async call<T>(command: string, arg?: any): TPromise<T> {
		arg = this.instantiationService.invokeFunction(parseArgs, arg || []);

		const [id, method] = command.split(':');
		this.logService.info(`Service IPC Call: ${id}.${method}(${arg.map((v) => '' + v).join(', ')});`);

		try {
			return await this._call(id, method, arg);
		} catch (e) {
			this.logService.error('Service IPC Call Error:\n' + processErrorStack(e));
			return TPromise.wrapError(e);
		}
	}

	private _call(id: string, method: string, arg?: any): Promise<any> {
		return this.instantiationService.invokeFunction((access: ServicesAccessor) => {
			const service = access.get(createDecorator(id));
			return service[method](...arg);
		});
	}

	public listen<T>(event: string, arg?: any): Event<T> {
		const [id, method] = event.split(':');
		try {
			if (Array.isArray(arg)) {
				arg = this.instantiationService.invokeFunction(parseArgs, arg || []);
				return this._listen(id, method, arg);
			} else {
				return this._listen(id, method);
			}
		} catch (e) {
			this.logService.error('Service IPC Listen Error:', e);
			throw e;
		}
	}

	private _listen(id: string, method: string, arg?: any): Event<any> {
		return this.instantiationService.invokeFunction((access: ServicesAccessor) => {
			const service = access.get(createDecorator(id));
			if (arg) {
				this.logService.info(`Service IPC Listen: ${id}.${method}(${arg.map(e => inspect(e)).join(', ')});`);
				return service[method](...arg); // must be sync func
			} else {
				this.logService.info(`Service IPC Listen: ${id}.${method} [getter];`);
				return service[method];
			}
		});
	}
}

function parseArgs(access: ServicesAccessor, param: any[]) {
	return param.map((item) => {
		if (item && item.__type) {
			switch (item.__type) {
				case 'URI':
					return URI.parse(item.value);
				case 'ChannelLogger':
					return access.get(IMainChannelLogService).receive(item.value.id, item.value.window);
			}
		}

		return item;
	});
}

registerMainIPC(IKendryteServiceRunnerChannel, RemoteServiceRunner);
