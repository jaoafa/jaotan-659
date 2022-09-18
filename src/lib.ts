import { TextChannel } from 'discord.js'
import configuration from './configuration'
import { DBSendTemplate } from './entities/send-template'
import { getClient } from './main'
import { Time, TimeData } from './times'

/**
 * Time に対応する今日の日時を返す
 *
 * @param {Time} time 時間データ
 * @returns {Date} 時間データに対応する今日の日時
 */
export function getTodayDate(time: Time): Date {
  const today = new Date()
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    time.hour,
    time.minute,
    time.second,
    time.millisecond
  )
}

/**
 * テキストから時間データを取得する
 *
 * @param TIMES 時間データ群
 * @param text テキスト
 * @param date 投稿日時
 * @param isValid 有効時間のみ取得するか
 * @returns {TimeData | null} 時間データ (該当するものがない場合 null)
 */
export function getTimeData(
  TIMES: TimeData[],
  text: string,
  date: Date,
  isValid: boolean
): TimeData | null {
  const times = TIMES.filter((time) => {
    switch (time.type) {
      case 'EQUAL':
        return text === time.text
      case 'START':
        return text.startsWith(time.text)
      case 'END':
        return text.endsWith(time.text)
      case 'INCLUDE':
        return text.includes(time.text)
      default:
        return false
    }
  }).filter((time) => {
    if (!isValid) return true
    const before = time.start
    const after = time.end
    return (
      before.hour <= date.getHours() &&
      date.getHours() <= after.hour &&
      before.minute <= date.getMinutes() &&
      date.getMinutes() <= after.minute &&
      before.second <= date.getSeconds() &&
      date.getSeconds() <= after.second &&
      before.millisecond <= date.getMilliseconds() &&
      date.getMilliseconds() <= after.millisecond
    )
  })
  let result = null
  let i = Number.MAX_VALUE
  for (const time of times) {
    const tmp = getTodayDate(time.base)
    const diff = Math.abs(date.getTime() - tmp.getTime())
    if (diff < i) {
      result = time
      i = diff
    }
  }
  // 最も投稿時刻に近い時間データを返す。
  return times.length > 0 ? result : null
}

function paddingZero(num: number, length = 2): string {
  return ('0'.repeat(length) + num.toString()).slice(-length)
}

export function isTimeFormat(str: string) {
  return /^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(str)
}

export function getPaddedDate(date: Date): string {
  return `${paddingZero(date.getHours())}:${paddingZero(
    date.getMinutes()
  )}:${paddingZero(date.getSeconds())}.${paddingZero(
    date.getMilliseconds(),
    3
  )}`
}

export function getPaddedTime(time: Time): string {
  return `${paddingZero(time.hour)}:${paddingZero(time.minute)}:${paddingZero(
    time.second
  )}.${paddingZero(time.millisecond, 3)}`
}

export function formatDate(date: Date, format: string): string {
  format = format.replace(/yyyy/g, String(date.getFullYear()))
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2))
  format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2))
  format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2))
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2))
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2))
  format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3))
  return format
}

/**
 * 時間データと指定日時を比較し、差時間テキストを返す
 *
 * @param timeData 時間データ
 * @param date 指定日時
 * @returns {string} 差時間テキスト
 */
export function getTimeDiffText(timeData: TimeData, date: Date): string {
  const time = getTodayDate(timeData.base)
  const diff = Math.abs(date.getTime() - time.getTime())

  const hour = paddingZero(Math.floor(diff / 1000 / 60 / 60))
  const minute = paddingZero(Math.floor(diff / 1000 / 60) % 60)
  const second = paddingZero(Math.floor(diff / 1000) % 60)
  const millisecond = paddingZero(Math.floor(diff / 10) % 100, 3)

  if (hour !== '00') {
    return `${hour}時間${minute}分${second}.${millisecond}秒`
  } else if (minute !== '00') {
    return `${minute}分${second}.${millisecond}秒`
  } else if (second !== '00') {
    return `${second}.${millisecond}秒`
  } else {
    return `0.${millisecond}秒`
  }
}

export async function sendTemplate(template: DBSendTemplate) {
  const client = getClient()
  const channelAny = client.channels.resolve(configuration.DISCORD_CHANNEL_ID)
  if (!channelAny) {
    console.error('channel not found')
    return
  }
  if (!(channelAny instanceof TextChannel)) {
    console.error('channel is not text channel')
    return
  }
  const channel = channelAny as TextChannel
  const lastMessage = channel.lastMessage
  if (lastMessage && lastMessage.content === template.text) {
    return
  }
  await channel.send(template.text)
}
