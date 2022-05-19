import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    PeopleClientId = 'people_client_id',
    PeopleSecret = 'people_secret',
    PeopleRefreshToken = 'people_refresh_token',
    ZohoRoom = 'zoho_room',
    DepartmentRoomsJson = 'department_rooms_json'
}

export const settings: Array<ISetting> = [
    {
        id: AppSetting.PeopleClientId,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: AppSetting.PeopleClientId,
        i18nDescription: `${AppSetting.PeopleClientId}_description`,
    },
    {
        id: AppSetting.PeopleSecret,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: AppSetting.PeopleSecret,
        i18nDescription: `${AppSetting.PeopleSecret}_description`,
    },
    {
        id: AppSetting.PeopleRefreshToken,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: AppSetting.PeopleRefreshToken,
        i18nDescription: `${AppSetting.PeopleRefreshToken}_description`,
    },
    {
        id: AppSetting.ZohoRoom,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: AppSetting.ZohoRoom,
        i18nDescription: `${AppSetting.ZohoRoom}_description`,
    },
    {
        id: AppSetting.DepartmentRoomsJson,
        type: SettingType.STRING,
        packageValue: '',
        required: false,
        public: true,
        i18nLabel: AppSetting.DepartmentRoomsJson,
        i18nDescription: `${AppSetting.DepartmentRoomsJson}_description`,
    },
];
