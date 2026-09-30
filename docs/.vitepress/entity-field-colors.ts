import type { ShikiTransformer } from 'shiki'

/**
 * Colors domain names in code blocks the way an IDE semantic highlighter does:
 * entity / class names dark gold in the light theme and gold in the dark theme,
 * field and association names green.
 * UI chrome (label, header, …) is left to the normal syntax theme.
 */

type Kind = 'entity' | 'field'

interface Range {
  start: number
  end: number
  kind: Kind
  priority: number
}

interface StringSpan {
  start: number
  end: number
  valueStart: number
  valueEnd: number
  value: string
}

const ENTITIES = [
  'CarReservation',
  'Client',
  'Country',
  'Brand',
  'Ride',
  'User',
  'Car'
]

const ENTITY_RE = new RegExp(`\\b(${ENTITIES.join('|')})\\b`, 'g')

const FIELDS = new Set([
  'id',
  'vin',
  'brandString',
  'year',
  'color',
  'price',
  'carDate',
  'carDatetime',
  'carBoolean',
  'comment',
  'brandAssoc',
  'rideList',
  'modifDate',
  'modifUser',
  'version',
  'dateFrom',
  'dateTo',
  'car',
  'client',
  'name',
  'birthDate',
  'contact',
  'address',
  'brand',
  'username',
  'password',
  'enabled',
  'admin',
  'country',
  'code',
  'lockDate',
  'lockUser'
])

/** Attribute values that are UI text, not a field or entity reference. */
const UI_ATTRS = new Set([
  'label',
  'header',
  'tooltip',
  'labelTooltip',
  'title',
  'placeholder',
  'message',
  'icon',
  'className',
  'textFormat',
  'suggestionsLoad',
  'width',
  'scrollHeight',
  'align',
  'key',
  'filterDisplay',
  'operation',
  'betweenFilter'
])

const COLORS: Record<Kind, { light: string; dark: string }> = {
  entity: { light: '#9a6700', dark: '#ffd56a' },
  field: { light: '#1a7f37', dark: '#7ee787' }
}

function isFieldPath(value: string): boolean {
  if (!value) return false
  return value.split('.').every((part) => FIELDS.has(part))
}

function langKind(lang: string): 'ts' | 'sql' | 'json' | 'other' {
  const name = lang.toLowerCase()
  if (name === 'sql') return 'sql'
  if (name === 'json') return 'json'
  if (['ts', 'tsx', 'typescript', 'js', 'jsx', 'javascript'].includes(name)) return 'ts'
  return 'other'
}

function scan(code: string, lang: 'ts' | 'sql' | 'json'): { idents: string; strings: StringSpan[] } {
  const idents = code.split('')
  const strings: StringSpan[] = []
  const n = code.length
  let i = 0

  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) idents[k] = ' '
  }

  while (i < n) {
    const c = code[i]
    const next = code[i + 1]

    if (lang === 'sql' && c === '-' && next === '-') {
      const from = i
      while (i < n && code[i] !== '\n') i++
      blank(from, i)
      continue
    }

    if (lang !== 'sql' && c === '/' && next === '/') {
      const from = i
      while (i < n && code[i] !== '\n') i++
      blank(from, i)
      continue
    }

    if (lang !== 'sql' && c === '/' && next === '*') {
      const from = i
      i += 2
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++
      if (i < n) i += 2
      blank(from, i)
      continue
    }

    if (c === '\'' || c === '"' || c === '`') {
      const quote = c
      const valueStart = i + 1
      i++
      while (i < n) {
        if (code[i] === '\\') {
          i += 2
          continue
        }
        if (code[i] === quote) break
        i++
      }
      const valueEnd = i
      strings.push({
        start: valueStart - 1,
        end: Math.min(valueEnd + 1, n),
        valueStart,
        valueEnd,
        value: code.slice(valueStart, valueEnd)
      })
      blank(valueStart - 1, Math.min(valueEnd + 1, n))
      if (i < n) i++
      continue
    }

    i++
  }

  return { idents: idents.join(''), strings }
}

function prevAttr(code: string, quoteIndex: number): string {
  const before = code.slice(0, quoteIndex)
  const match = /([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*\{?\s*$/.exec(before)
  return match?.[1] ?? ''
}

function add(ranges: Range[], start: number, end: number, kind: Kind, priority: number) {
  if (end > start) ranges.push({ start, end, kind, priority })
}

function collectTsRanges(code: string, idents: string, strings: StringSpan[]): Range[] {
  const ranges: Range[] = []
  const hasEntity = code.includes('@Entity')

  for (const span of strings) {
    const attr = prevAttr(code, span.start)
    const value = span.value

    if (attr === 'entity' || ENTITIES.includes(value)) {
      if (!UI_ATTRS.has(attr)) add(ranges, span.valueStart, span.valueEnd, 'entity', attr === 'entity' ? 2 : 1)
    }

    if (attr === 'field' || attr === 'assocField' || attr === 'displayField') {
      add(ranges, span.valueStart, span.valueEnd, 'field', 2)
    } else if (attr === 'sortField' && isFieldPath(value)) {
      add(ranges, span.valueStart, span.valueEnd, 'field', 2)
    } else if (!UI_ATTRS.has(attr) && isFieldPath(value)) {
      add(ranges, span.valueStart, span.valueEnd, 'field', 1)
    }
  }

  // displayField={['name', 'birthDate']} — values are not always preceded by the attribute name
  const displayArray = /\bdisplayField\s*=\s*\{\s*\[([\s\S]*?)\]/g
  for (const match of code.matchAll(displayArray)) {
    const body = match[1]
    const bodyStart = (match.index ?? 0) + match[0].length - body.length
    for (const str of body.matchAll(/(['"`])([^'"`]*)\1/g)) {
      const valueStart = bodyStart + (str.index ?? 0) + 1
      add(ranges, valueStart, valueStart + str[2].length, 'field', 2)
    }
  }

  for (const match of code.matchAll(/\bsuper\s*\(\s*[^,]+,\s*(['"`])([^'"`]*)\1/g)) {
    const quote = match[1]
    const value = match[2]
    const valueStart = (match.index ?? 0) + match[0].lastIndexOf(quote + value) + 1
    add(ranges, valueStart, valueStart + value.length, 'entity', 2)
  }

  if (hasEntity) {
    for (const match of idents.matchAll(/\bclass\s+([A-Z][A-Za-z0-9]*)/g)) {
      const name = match[1]
      const valueStart = (match.index ?? 0) + match[0].length - name.length
      add(ranges, valueStart, valueStart + name.length, 'entity', 2)
    }

    for (const match of idents.matchAll(/\(\)\s*=>\s*([A-Z][A-Za-z0-9]*)/g)) {
      const name = match[1]
      const valueStart = (match.index ?? 0) + match[0].length - name.length
      add(ranges, valueStart, valueStart + name.length, 'entity', 2)
    }

    const prop = /^[ \t]*([a-z][A-Za-z0-9]*)\??:[ \t]*(?:[A-Z]|string\b|number\b|boolean\b|any\b|Date\b)/gm
    for (const match of idents.matchAll(prop)) {
      const name = match[1]
      const valueStart = (match.index ?? 0) + match[0].indexOf(name)
      add(ranges, valueStart, valueStart + name.length, 'field', 2)
    }
  }

  for (const match of idents.matchAll(ENTITY_RE)) {
    add(ranges, match.index ?? 0, (match.index ?? 0) + match[0].length, 'entity', 2)
  }

  const access = /\.([a-z][A-Za-z0-9]*)\b/g
  for (const match of idents.matchAll(access)) {
    const name = match[1]
    if (!FIELDS.has(name)) continue
    const valueStart = (match.index ?? 0) + 1
    add(ranges, valueStart, valueStart + name.length, 'field', 2)
  }

  return ranges
}

function collectSqlRanges(code: string, idents: string): Range[] {
  const ranges: Range[] = []

  const markIdent = (matchIndex: number, full: string, ident: string, kind: Kind) => {
    const at = full.lastIndexOf(ident)
    if (at < 0) return
    add(ranges, matchIndex + at, matchIndex + at + ident.length, kind, 2)
  }

  for (const match of idents.matchAll(/\b(?:TABLE|REFERENCES|JOIN)\s+((?:[\w<>]+\.)?[a-zA-Z_][a-zA-Z0-9_]*)/gi)) {
    markIdent(match.index ?? 0, match[0], match[1].split('.').pop()!, 'entity')
  }

  for (const match of idents.matchAll(/\bON\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/gi)) {
    markIdent(match.index ?? 0, match[0], match[1], 'entity')
    markIdent(match.index ?? 0, match[0], match[2], 'field')
  }

  for (const match of idents.matchAll(/\bFOREIGN\s+KEY\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/gi)) {
    markIdent(match.index ?? 0, match[0], match[1], 'field')
  }

  for (const match of idents.matchAll(/\bREFERENCES\s+[a-zA-Z0-9_.<>]+\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/gi)) {
    markIdent(match.index ?? 0, match[0], match[1], 'field')
  }

  const create = /\bCREATE\s+TABLE\s+[a-zA-Z0-9_.<>]+\s*\(([\s\S]*?)\)\s*;/gi
  for (const match of idents.matchAll(create)) {
    const body = match[1]
    const bodyStart = (match.index ?? 0) + match[0].indexOf(body)
    const skip = /^(constraint|primary|unique|foreign|check)$/i
    for (const line of body.split('\n')) {
      const col = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/.exec(line)
      if (!col || skip.test(col[1])) continue
      const lineAt = body.indexOf(line)
      const identAt = line.indexOf(col[1])
      add(ranges, bodyStart + lineAt + identAt, bodyStart + lineAt + identAt + col[1].length, 'field', 2)
    }
  }

  return ranges
}

function collectJsonRanges(code: string, strings: StringSpan[]): Range[] {
  const ranges: Range[] = []
  for (const span of strings) {
    const after = code.slice(span.end).match(/^\s*(.)/)
    if (after?.[1] !== ':') continue
    if (/^[a-z][A-Za-z0-9]*$/.test(span.value)) {
      add(ranges, span.valueStart, span.valueEnd, 'field', 2)
    }
  }
  return ranges
}

export function collectRanges(code: string, lang: string): Range[] {
  const kind = langKind(lang)
  if (kind === 'other') return []
  const { idents, strings } = scan(code, kind)
  if (kind === 'sql') return collectSqlRanges(code, idents)
  if (kind === 'json') return collectJsonRanges(code, strings)
  return collectTsRanges(code, idents, strings)
}

function styleToString(style: unknown): string {
  if (typeof style === 'string') return style
  if (Array.isArray(style)) return style.map(String).join(';')
  return ''
}

/** Per-character kind inside one Shiki token. Higher priority wins. */
function maskToken(tokenStart: number, length: number, ranges: Range[]): (Kind | null)[] {
  const mask: (Kind | null)[] = Array.from({ length }, () => null)
  const sorted = [...ranges].sort((a, b) => a.priority - b.priority)
  const tokenEnd = tokenStart + length
  for (const range of sorted) {
    const from = Math.max(range.start, tokenStart)
    const to = Math.min(range.end, tokenEnd)
    for (let i = from; i < to; i++) mask[i - tokenStart] = range.kind
  }
  return mask
}

function paintStyle(style: string, kind: Kind): string {
  const { light, dark } = COLORS[kind]
  let next = style
  const set = (name: string, value: string) => {
    const re = new RegExp(`${name}:[^;]*`)
    if (re.test(next)) next = next.replace(re, `${name}:${value}`)
    else next = `${next}${next && !next.endsWith(';') ? ';' : ''}${name}:${value}`
  }
  set('--shiki-light', light)
  set('--shiki-dark', dark)
  return next.replace(/^;/, '')
}

export function entityFieldColors(): ShikiTransformer {
  return {
    name: 'chilibase-entity-field',
    preprocess(code, options) {
      const state = this as unknown as { source: string; ranges: Range[] }
      state.source = code
      state.ranges = collectRanges(code, options.lang)
    },
    span(node, _line, _col, _lineEl, token) {
      const state = this as unknown as { ranges?: Range[] }
      if (!state.ranges?.length || token.offset == null || !token.content) return
      const text = token.content
      const mask = maskToken(token.offset, text.length, state.ranges)
      if (!mask.some(Boolean)) return

      const paintNode = (target: { properties: Record<string, unknown> }, kind: Kind) => {
        const current = target.properties.class
        const list = Array.isArray(current)
          ? [...current.map(String)]
          : typeof current === 'string'
            ? current.split(/\s+/).filter(Boolean)
            : []
        const className = kind === 'entity' ? 'cb-entity' : 'cb-field'
        if (!list.includes(className)) list.push(className)
        target.properties.class = list
        target.properties.style = paintStyle(styleToString(target.properties.style), kind)
      }

      const only = mask.find((item): item is Kind => item != null)
      if (only && mask.every((item) => item === only)) {
        paintNode(node, only)
        return
      }

      const baseStyle = styleToString(node.properties.style)
      const children: unknown[] = []
      let i = 0
      while (i < text.length) {
        const kind = mask[i]
        let j = i + 1
        while (j < text.length && mask[j] === kind) j++
        const piece = text.slice(i, j)
        if (!kind) {
          children.push({ type: 'text', value: piece })
        } else {
          const child: { properties: Record<string, unknown>; type: string; tagName: string; children: unknown[] } = {
            type: 'element',
            tagName: 'span',
            properties: { style: baseStyle },
            children: [{ type: 'text', value: piece }]
          }
          paintNode(child, kind)
          children.push(child)
        }
        i = j
      }
      node.children = children as typeof node.children
    }
  }
}
