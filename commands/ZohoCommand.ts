import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { ZohoApp } from '../ZohoApp';
import { processBirthdaysCommand } from './BirthdaysCommand';
import { processHelpCommand } from './HelpCommand';
import { processWhosoutCommand } from './WhosoutCommand';

export class ZohoCommand implements ISlashCommand {
    public command = 'zoho';
    public i18nParamsExample = 'Zoho_Params';
    public i18nDescription = 'Zoho_Description';
    public providesPreview = false;

    private CommandEnum = {
        Whosout: 'whosout',
        Birthdays: 'birthdays',
    };

    constructor(private readonly app: ZohoApp) { }
    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persistence: IPersistence): Promise<void> {
        const [command, ...params] = context.getArguments();
        if (!command) {
            return await processHelpCommand(this.app, context, read, modify);
        }

        switch (command) {
            case this.CommandEnum.Whosout:
                await processWhosoutCommand(this.app, context, read, modify, http, persistence, params);
                break;
            case this.CommandEnum.Birthdays:
                await processBirthdaysCommand(this.app, context, read, modify, http, persistence, params);
                break;
            default:
                await processHelpCommand(this.app, context, read, modify);
        }
    }
}
