import { DBCategory } from '@/entities/category.entity'
import { isTimeFormat } from '@/lib'
import { loadTimes } from '@/main'
import {
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from '@discordjs/builders'
import {
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js'
import { BaseCommand, Permission } from '.'

export class RegisterCommand implements BaseCommand {
  get definition(): SlashCommandSubcommandBuilder {
    return new SlashCommandSubcommandBuilder()
      .setName('register')
      .setDescription('新しく対象時刻を登録します。')
      .addStringOption(
        new SlashCommandStringOption()
          .setName('name')
          .setDescription('時刻名')
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
          .setName('base')
          .setDescription('基準時刻（HH:mm:ss.SSSの形式。例: 06:59:59.999）')
          .setRequired(true)
      )
      .addStringOption(
        new SlashCommandStringOption()
          .setName('start')
          .setDescription(
            '有効期間の開始時刻（HH:mm:ss.SSSの形式。例: 06:59:59.999）'
          )
          .setRequired(true)
      )
      .addStringOption(
        new SlashCommandStringOption()
          .setName('end')
          .setDescription(
            '有効期間の終了時刻（HH:mm:ss.SSSの形式。例: 06:59:59.999）'
          )
          .setRequired(true)
      )
      .addStringOption(
        new SlashCommandStringOption()
          .setName('match_type')
          .setDescription(
            'マッチ種別（テキストとの比較条件。指定しない場合INCLUDE）'
          )
          .addChoices(
            {
              name: '完全一致',
              value: 'EQUAL',
            },
            {
              name: '前方一致',
              value: 'START',
            },
            {
              name: '後方一致',
              value: 'END',
            },
            {
              name: '部分一致',
              value: 'INCLUDE',
            }
          )
          .setRequired(false)
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
    const base = interaction.options.getString('base')
    const start = interaction.options.getString('start')
    const end = interaction.options.getString('end')
    const matchType = (interaction.options.getString('match_type', false) ||
      'INCLUDE') as DBCategory['matchType']

    if (!isTimeFormat(base) || !isTimeFormat(start) || !isTimeFormat(end)) {
      await interaction.editReply('エラー: 時刻の形式が不正です。')
      return
    }

    const count = await DBCategory.count({
      where: [{ name }],
    })
    if (count > 0) {
      await interaction.editReply('既に登録済みです。')
      return
    }

    const category = new DBCategory()
    category.name = name
    category.description = ''
    category.text = text
    category.base = base
    category.start = start
    category.end = end
    category.matchType = matchType
    await category.save().catch(async (e) => {
      console.error(e)
      await interaction.editReply('エラー: 登録に失敗しました。')
    })
    await loadTimes()

    await interaction.editReply(':white_check_mark:')
    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('対象時刻登録完了')
          .setDescription(`\`${name}\` を登録しました。`)
          .setColor('#00ff00')
          .addFields(
            {
              name: '名前',
              value: `\`${name}\``,
              inline: true,
            },
            {
              name: 'テキスト',
              value: `\`\`\`\n${text}\n\`\`\``,
              inline: true,
            },
            {
              name: '基準時刻',
              value: `\`${base}\``,
              inline: true,
            },
            {
              name: '有効期間の開始時刻',
              value: `\`${start}\``,
              inline: true,
            },
            {
              name: '有効期間の終了時刻',
              value: `\`${end}\``,
              inline: true,
            },
            {
              name: 'マッチ種別',
              value: `\`${matchType}\``,
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
