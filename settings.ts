import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    BotUsername = 'bot_username',
    PeopleToken = 'people_token',
    ZohoRoom = 'zoho_room',
    HolidayCountries = 'holiday_countries',
}

export const settings: Array<ISetting> = [
    {
        id: 'bot_username',
        type: SettingType.STRING,
        packageValue: 'rocket.cat',
        required: true,
        public: false,
        i18nLabel: 'Zoho_Bot_Username',
        i18nDescription: 'Zoho_Bot_Username_Description',
    },
    {
        id: AppSetting.PeopleToken,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: 'people_token',
        i18nDescription: 'people_token_description',
    },
    {
        id: AppSetting.ZohoRoom,
        type: SettingType.STRING,
        packageValue: '',
        required: true,
        public: true,
        i18nLabel: 'zoho_room',
        i18nDescription: 'zoho_room_description',
    },
    {
        id: AppSetting.HolidayCountries,
        type: SettingType.STRING,
        packageValue: 'us,br',
        required: true,
        public: true,
        i18nLabel: 'holiday_countries',
        i18nDescription: 'holiday_countries_description',
    },
];
