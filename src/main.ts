import { Client, Message } from 'discord.js'
import cron from 'node-cron'
import 'reflect-metadata'
import { registerCommands, router } from './commands'
import configuration from './configuration'
import { DBCategory } from './entities/category.entity'
import { DBRecord } from './entities/record.entity'
import { DBSendTemplate } from './entities/send-template'
import {
  getPaddedDate,
  getPaddedTime,
  getTimeData,
  getTimeDiffText,
  getTodayDate,
  sendTemplate,
} from './lib'
import { addItem, AppDataSource, calcRank, isTodayTried } from './mysql'
import { parseTime, TimeData } from './times'

const client = new Client({
  intents: ['Guilds', 'GuildMessages', 'MessageContent'],
})
export let TIMES: TimeData[] = []

export function getClient() {
  return client
}

client.on('ready', async () => {
  console.log(`ready: ${client.user?.tag}`)
})

client.on('messageCreate', async (message: Message) => {
  if (message.author.id === client.user?.id) return
  if (message.channelId !== configuration.DISCORD_CHANNEL_ID) return
  const timeData = getTimeData(TIMES, message.content, message.createdAt, true)
  if (timeData) {
    // 有効期間内
    const dbRecordRepo = AppDataSource.getRepository(DBRecord)
    if (
      !(await isTodayTried(message.author, timeData.category, dbRecordRepo))
    ) {
      const record = await addItem(
        message,
        timeData.category,
        Math.abs(
          message.createdAt.getTime() - getTodayDate(timeData.base).getTime()
        )
      )
      message.reply(
        `${getPaddedDate(message.createdAt)} (\`${getPaddedTime(
          timeData.base
        )}\` との差: \`${getTimeDiffText(
          timeData,
          message.createdAt
        )}\` | ${await calcRank(record)}位)`
      )
      return
    }
    // 既にトライ済み
  }

  // 有効期間外
  const reply = await message.reply(getPaddedDate(message.createdAt))
  setTimeout(() => {
    reply
      .delete()
      .then(() => null)
      .catch(() => null)
  }, 300000) // 30秒後に削除
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return
  }

  await router(interaction)
})

export async function loadTimes() {
  const categories = await AppDataSource.getRepository(DBCategory).find()
  TIMES = categories.map((x) => {
    return {
      text: x.text,
      type: x.matchType,
      base: parseTime(x.base),
      start: parseTime(x.start),
      end: parseTime(x.end),
      category: x,
    }
  })
  console.log('Loaded times:', TIMES)
}

export async function scheduleSendTemplates() {
  cron.getTasks().forEach((task) => task.stop())
  const schedules = await AppDataSource.getRepository(DBSendTemplate).find()
  for (const schedule of schedules) {
    const cronSchedule = schedule.cron
    cron.schedule(cronSchedule, async () => sendTemplate(schedule))
  }
}

async function main() {
  console.log('Initializing database...')
  await AppDataSource.initialize()
  console.log('Database initialized')

  await loadTimes()
  await scheduleSendTemplates()

  await client.login(configuration.DISCORD_TOKEN)

  console.log('Login Successful.')

  await registerCommands()
}

;(async () => {
  await main()
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await AppDataSource.destroy()
    })
})()
