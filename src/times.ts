import { DBCategory } from './entities/category.entity'

export interface Time {
  hour: number
  minute: number
  second: number
  millisecond: number
}
export interface TimeData {
  text: string
  type: 'EQUAL' | 'START' | 'END' | 'INCLUDE'
  base: Time
  start: Time
  end: Time
  category: DBCategory
}

export function parseTime(text: string) {
  const items = text.split(':')
  const hour = Number.parseInt(items[0], 10)
  const minute = Number.parseInt(items[1], 10)
  const temp = items[2].split('.')
  const second = Number.parseInt(temp[0], 10)
  const millisecond = Number.parseInt(temp[1], 10)
  return {
    hour,
    minute,
    second,
    millisecond,
  }
}
