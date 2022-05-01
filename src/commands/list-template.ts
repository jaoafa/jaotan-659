import { DBSendTemplate } from '@/entities/send-template'
import { formatDate } from '@/lib'
import {
  SlashCommandIntegerOption,
  SlashCommandSubcommandBuilder,
} from '@discordjs/builders'
import { CacheType, CommandInteraction, MessageEmbed } from 'discord.js'
import { BaseCommand, Permission } from '.'

export class ListTemplateCommand implements BaseCommand {
  get definition(): SlashCommandSubcommandBuilder {
    return new SlashCommandSubcommandBuilder()
      .setName('list-template')
      .setDescription('テンプレートを一覧表示します。')
      .addIntegerOption(
        new SlashCommandIntegerOption()
          .setName('page')
          .setDescription('ページ')
          .setMinValue(1)
          .setRequired(false)
      )
  }

  get permissions(): Permission[] {
    return null
  }

  async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
    await interaction.deferReply({
      ephemeral: true,
    })

    const page = interaction.options.getInteger('page', false) || 1

    const items = await DBSendTemplate.find({
      skip: (page - 1) * 20,
      take: 20,
    })
    if (items.length === 0) {
      await interaction.editReply('ひとつも登録されていません。')
      return
    }

    const embed = new MessageEmbed()
      .setTitle('テンプレート一覧')
      .setColor('#00ff00')
      .setTimestamp()
    for (const item of items) {
      embed.addField(
        item.name,
        `\`\`\`\n${item.text}\n\`\`\`\nスケジュール: \`${
          item.cron
        }\`\n・登録日時: \`${formatDate(
          item.createdAt,
          'yyyy/MM/dd HH:mm:ss'
        )}\``,
        true
      )
    }

    await interaction.editReply({
      embeds: [embed],
    })
  }
}
