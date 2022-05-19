import { IHttpRequest, IHttpResponse, RequestMethod } from "@rocket.chat/apps-engine/definition/accessors";
import { IApp } from "@rocket.chat/apps-engine/definition/IApp";
import { AppSetting } from "../settings/settings";

export class ZohoPeople {
    private token: string = '';

    constructor(
        private readonly app: IApp,
    ) {}

    private async request(method: RequestMethod, path: string, params: any, data: any): Promise<IHttpResponse> {
        // console.log(method, path, JSON.stringify(params));
        if (!this.token) {
            this.token = await this.refreshToken();
            // console.log('New token', this.token);
        }

		const url = `https://people.zoho.com/people/api/${ path }`;
		const options: IHttpRequest = {
			params,
			data,
			headers: { Authorization: this.token },
		};

        const http = this.app.getAccessors().http;
        const result = await http[method](url, options) as IHttpResponse;
        if (result && result.statusCode === 401 && result.content && result.content.indexOf('The provided OAuth token is invalid.') !== -1) {
            this.token = await this.refreshToken();
            return this.request(method, path, params, data);
        }
        return result;
    }

    private async refreshToken(): Promise<string> {
        const reader = this.app.getAccessors().reader;
        const http = this.app.getAccessors().http;
        const url = 'https://accounts.zoho.com/oauth/v2/token';
        const params = {
            client_id: await reader.getEnvironmentReader().getSettings().getValueById(AppSetting.PeopleClientId),
            client_secret: await reader.getEnvironmentReader().getSettings().getValueById(AppSetting.PeopleSecret),
            grant_type: 'refresh_token',
            redirect_uri: 'https://rocket.chat',
            refresh_token: await reader.getEnvironmentReader().getSettings().getValueById(AppSetting.PeopleRefreshToken),
        };
        const response = await http.post(url, { params });
        if (response && response.data && response.data.access_token) {
            return `Zoho-oauthtoken ${response.data.access_token}`;
        } else {
            throw new Error('Error refreshing token');
        }
    }

    public async getEmployees(sIndex = 0, limit = 200): Promise<any> {
        const employees: any = [];
        let hasMoreRecords = true;
        while (hasMoreRecords) {
            const result = await this.request(RequestMethod.GET, 'forms/employee/getRecords', {
                searchParams: '{searchField:"Employeestatus", searchOperator:"Is", searchText:"Active"}',
                sIndex,
                limit
            }, {});
            if (result.data && result.data.response && result.data.response.result) {
                for (const record of result.data.response.result) {
                    const employee: any = Object.values(record)[0];
                    employees.push(employee[0]);
                }
            }
            hasMoreRecords = !!(result && result.data && result.data.response && result.data.response.result && result.data.response.result.length === 200);
            sIndex += limit;
        }
        return employees;
    }

    public async getLeaves(date: Date, sIndex = 0, limit = 200): Promise<any> {
        date.setDate(date.getDate() + 1);
        const toParts = date.toDateString().split(' ');
        const to = `${ toParts[2] }-${ toParts[1] }-${ toParts[3] }`;
        date.setMonth(date.getMonth() - 2);
        const fromParts = date.toDateString().split(' ');
        const from = `${ fromParts[2] }-${ fromParts[1] }-${ fromParts[3] }`;

        console.log('Getting leaves from', from, 'to', to);

        const leaves: any = {};
        let hasMoreRecords = true;
        while (hasMoreRecords) {
            const result = await this.request(RequestMethod.GET, 'forms/leave/getRecords', {
                sIndex,
                limit,
                searchParams: `{searchField:From,searchOperator:Between,searchText:'${ from };${ to }'}`
            }, {});
            if (hasMoreRecords) {
                for (const record of result.data.response.result) {
                    const leave: any = (Object.values(record)[0] as any)[0];
                    const recordFrom = leave.From.split('-');
                    const recordTo = leave.To.split('-');
                    leave.From = `${ recordFrom[2] }-${ recordFrom[0] }-${ recordFrom[1] }`;
                    leave.To = `${ recordTo[2] }-${ recordTo[0] }-${ recordTo[1] }`;
                    leaves[leave['Employee_ID']] = [].concat(leaves[leave['Employee_ID']] || [], leave);
                }
            }
            hasMoreRecords = !!(result && result.data && result.data.response && result.data.response.result && result.data.response.result.length === 200);
            sIndex += limit;
        }
        return leaves;
    }

    public async getHolidays(date: Date, sIndex = 0): Promise<any> {
        const dateString = date.toISOString().split('T')[0];
        const holidays: any = {};
        let hasMoreRecords = true;
        while (hasMoreRecords) {
            const result = await this.request(RequestMethod.GET, 'leave/v2/holidays/get', {
                location: 'ALL',
                from: dateString,
                to: dateString,
                dateFormat: 'yyyy-MM-dd',
                sIndex
            }, {});
            hasMoreRecords = !!(result && result.data && result.data.data && result.data.data.length === 200);
            for (const holiday of (result.data && result.data.data) || []) {
                for (const locationId of holiday.LocationId.split(',')) {
                    if (locationId) {
                        if (!holidays[locationId]) {
                            holidays[locationId] = [];
                        }
                        holidays[locationId].push(holiday);
                    }
                }
            }
            sIndex += 200;
        }
        return holidays;
    }
}
