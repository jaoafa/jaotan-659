import configuration from '@/configuration'
import { getClient } from '@/main'
import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from '@discordjs/builders'
import { ChatInputCommandInteraction, PermissionResolvable } from 'discord.js'
import { AddTemplateCommand } from './add-template'
import { ListCommand } from './list'
import { ListTemplateCommand } from './list-template'
import { RegisterCommand } from './register'
import { RemoveTemplateCommand } from './remove-template'
import { UnregisterCommand } from './unregister'

export interface Permission {
  readonly identifier: string | null
  readonly type: 'USER' | 'ROLE' | 'PERMISSION'
}

export abstract class BaseCommand {
  /** 定義: スラッシュサブコマンド */
  abstract get definition(): SlashCommandSubcommandBuilder
  /** 権限: サブコマンドの実行に必要なユーザー・ロール・パーミッション。NULLが指定された場合はすべて許可 */
  abstract get permissions(): Permission[] | null
  /** 実行: サブコマンドの実行定義 */
  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>
}

const routes: BaseCommand[] = [
  new RegisterCommand(),
  new UnregisterCommand(),
  new ListCommand(),
  new AddTemplateCommand(),
  new RemoveTemplateCommand(),
  new ListTemplateCommand(),
]

export async function registerCommands() {
  const builder = new SlashCommandBuilder()
    .setName('659')
    .setDescription('6:59! 6:59!')

  for (const route of routes) {
    console.log('SubCommand:', route)
    builder.addSubcommand(route.definition)
  }
  const client = getClient()
  if (!client.application) {
    throw new Error('Application not found.')
  }
  await client.application.commands.set(
    [builder.toJSON()],
    configuration.DISCORD_GUILD_ID
  )
}

export async function router(interaction: ChatInputCommandInteraction) {
  if (!interaction.command) {
    throw new Error('Command not found.')
  }
  if (!interaction.guild?.members) {
    throw new Error('Guild not found.')
  }

  if (interaction.command.name !== '659') {
    return
  }
  console.log(interaction.command.name, interaction.options.getSubcommand())
  const command = routes.find(
    (route) => route.definition.name === interaction.options.getSubcommand()
  )
  if (!command) return
  if (interaction.channelId !== configuration.DISCORD_CHANNEL_ID) {
    await interaction.reply({
      content: `このコマンドは、<#${configuration.DISCORD_CHANNEL_ID}>でのみ使用できます。`,
      ephemeral: true,
    })
    return
  }

  if (command.permissions) {
    const permissions = command.permissions.map((permission) => {
      if (permission.identifier) {
        const member = interaction.guild?.members.resolve(interaction.user)
        if (!member) return false
        switch (permission.type) {
          case 'USER': {
            return interaction.user.id === permission.identifier
          }
          case 'ROLE': {
            return member.roles.cache.has(permission.identifier)
          }
          case 'PERMISSION': {
            return member.permissions.has(
              permission.identifier as PermissionResolvable
            )
          }
        }
      }
      return true
    })
    if (!permissions.every(Boolean)) {
      await interaction.reply({
        content: 'このコマンドを実行する権限がありません。',
        ephemeral: true,
      })
      return
    }
  }
  await command.execute(interaction)
}
