import { DBCategory } from '@/entities/category.entity'
import { formatDate } from '@/lib'
import {
  SlashCommandIntegerOption,
  SlashCommandSubcommandBuilder,
} from '@discordjs/builders'
import {
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js'
import { BaseCommand, Permission } from '.'

export class ListCommand implements BaseCommand {
  get definition(): SlashCommandSubcommandBuilder {
    return new SlashCommandSubcommandBuilder()
      .setName('list')
      .setDescription('対象時刻を一覧表示します。')
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

  async execute(
    interaction: ChatInputCommandInteraction<CacheType>
  ): Promise<void> {
    await interaction.deferReply({
      ephemeral: true,
    })

    const page = interaction.options.getInteger('page', false) || 1

    const items = await DBCategory.find({
      skip: (page - 1) * 20,
      take: 20,
    })
    if (items.length === 0) {
      await interaction.editReply('ひとつも登録されていません。')
      return
    }

    const embed = new EmbedBuilder()
      .setTitle('対象時刻一覧')
      .setColor('#00ff00')
      .setTimestamp()
    for (const item of items) {
      embed.addFields({
        name: item.name,
        value: `\`\`\`\n${item.text}\n\`\`\`\n・基準時刻: \`${
          item.base
        }\`\n・有効期間: \`${item.start}\` ～ \`${
          item.end
        }\`\n・登録日時: \`${formatDate(
          item.createdAt,
          'yyyy/MM/dd HH:mm:ss'
        )}\``,
        inline: true,
      })
    }

    await interaction.editReply({
      embeds: [embed],
    })
  }
}
