import { DBSendTemplate } from '@/entities/send-template'
import { scheduleSendTemplates } from '@/main'
import {
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from '@discordjs/builders'
import {
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js'
import cron from 'node-cron'
import { BaseCommand, Permission } from '.'

export class AddTemplateCommand implements BaseCommand {
  get definition(): SlashCommandSubcommandBuilder {
    return new SlashCommandSubcommandBuilder()
      .setName('add-template')
      .setDescription('新しくテンプレートスケジュールを登録します。')
      .addStringOption(
        new SlashCommandStringOption()
          .setName('name')
          .setDescription('テンプレート名')
          .setRequired(true)
      )
      .addStringOption(
        new SlashCommandStringOption()
          .setName('text')
          .setDescription('テキスト（改行は \\n を利用）')
          .setRequired(true)
      )
      .addStringOption(
        new SlashCommandStringOption()
          .setName('cron')
          .setDescription('スケジュール（CRON形式）')
          .setRequired(true)
      )
  }

  get permissions(): Permission[] {
    return [
      {
        identifier: 'ADMINISTRATOR',
        type: 'PERMISSION',
      },
    ]
  }

  async execute(
    interaction: ChatInputCommandInteraction<CacheType>
  ): Promise<void> {
    await interaction.deferReply({
      ephemeral: true,
    })

    const name = interaction.options.getString('name')
    const text = interaction.options.getString('text').replaceAll('\\n', '\n')
    const schedule = interaction.options.getString('cron')

    const count = await DBSendTemplate.count({
      where: [{ name }, { cron: schedule }],
    })
    if (count > 0) {
      await interaction.editReply('既に登録済みです。')
      return
    }
    if (!cron.validate(schedule)) {
      await interaction.editReply('スケジュールが不正です。')
      return
    }

    const template = new DBSendTemplate()
    template.name = name
    template.text = text
    template.cron = schedule
    await template.save().catch(async (e) => {
      console.error(e)
      await interaction.editReply('エラー: 登録に失敗しました。')
    })
    await scheduleSendTemplates()

    await interaction.editReply(':white_check_mark:')
    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('テンプレート登録完了')
          .setDescription(`\`${name}\`を登録しました。`)
          .setColor('#00ff00')
          .addFields(
            {
              name: 'テキスト',
              value: `\`\`\`\n${text}\n\`\`\``,
              inline: true,
            },
            {
              name: 'スケジュール',
              value: `\`${schedule}\``,
              inline: true,
            }
          )
          .setFooter({
            text: interaction.user.tag,
            iconURL: interaction.user.avatarURL(),
          })
          .setTimestamp(),
      ],
    })
  }
}
