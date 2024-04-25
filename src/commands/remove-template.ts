import { DBSendTemplate } from '@/entities/send-template'
import { scheduleSendTemplates } from '@/main'
import {
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from '@discordjs/builders'
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { BaseCommand, Permission } from '.'

export class RemoveTemplateCommand implements BaseCommand {
  get definition(): SlashCommandSubcommandBuilder {
    return new SlashCommandSubcommandBuilder()
      .setName('rm-template')
      .setDescription('テンプレートスケジュールの登録を解除します。')
      .addStringOption(
        new SlashCommandStringOption()
          .setName('name')
          .setDescription('テンプレート名')
          .setRequired(true),
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

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.channel) {
      return
    }
    await interaction.deferReply({
      ephemeral: true,
    })

    const name = interaction.options.getString('name')
    if (!name) {
      await interaction.editReply(
        'エラー: テンプレート名が指定されていません。',
      )
      return
    }

    const item = await DBSendTemplate.findOne({
      where: { name },
    })
    if (!item) {
      await interaction.editReply('登録されていません。')
      return
    }

    await item.remove().catch(async (error: unknown) => {
      console.error(error)
      await interaction.editReply('エラー: 登録解除に失敗しました。')
    })
    await scheduleSendTemplates()

    await interaction.editReply(':white_check_mark:')
    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('テンプレート登録解除完了')
          .setDescription(`\`${name}\`を登録解除しました。`)
          .setColor('#00ff00')
          .setFooter({
            text: interaction.user.tag,
            iconURL:
              interaction.user.avatarURL() ?? interaction.user.defaultAvatarURL,
          })
          .setTimestamp(),
      ],
    })
  }
}
