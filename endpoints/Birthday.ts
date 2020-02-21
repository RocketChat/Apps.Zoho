import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { ApiEndpoint } from '@rocket.chat/apps-engine/definition/api/ApiEndpoint';
import { IApiEndpointInfo } from '@rocket.chat/apps-engine/definition/api/IApiEndpointInfo';

import { ZohoApp } from '../ZohoApp';

export class BirthdayEndpoint extends ApiEndpoint {
    public path: string = 'birthday';

    constructor(public app: ZohoApp) {
        super(app);
    }

    // tslint:disable-next-line: max-line-length
    public async post(request: IApiRequest, endpoint: IApiEndpointInfo, read: IRead, modify: IModify, http: IHttp, persistence: IPersistence): Promise<IApiResponse> {
        this.app.getLogger().log(request);
        this.app.birthday.run(read, modify, http, persistence);
        return this.success();
    }
}
