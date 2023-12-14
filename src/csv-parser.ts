import { DQ, CR, LF, COMMA, AT, CRLF } from "./constants";
import { CSVHeaders, CSVParserOptions, CSVRecord, CSVRecords, Listener, ParseResult } from "./types";

export class CSVParser {
  private delimiter: string
  private strict: boolean
  private hasHeader: boolean
  private headerLength: number
  private encoding: 'utf8' | 'ascii'

  private source: string
  private index: number
  private line: number
  private col: number

  private recordNumber: number
  private columnNumber: number

  private events: Map<'data' | 'header', Listener[]>

  constructor(options: CSVParserOptions = {})
  {
    this.delimiter = options.delimiter ?? COMMA;
    this.encoding = options.encoding ?? 'utf8';
    this.strict = options.strict ?? false;
    this.hasHeader = options.headers ?? true;

    this.events = new Map([["data", []], ["header", []]])

    this.source = '';

    this.reset();
  }

  private reset()
  {
    this.index = 0;
    this.col = 0;
    this.line = 0;
    this.headerLength = 0;

    this.columnNumber = 0;
    this.recordNumber = 0;
  }

  private createErrorMessage(message: string): string
  {
    return `${message} ${AT} ${`line: ${this.line} column: ${this.col} index: ${this.index}`}`;
  }

  private throwError(message: string): never
  {
    throw Error(this.createErrorMessage(message));
  }

  private expect(char: string, pos = 0): boolean
  {
    const start = this.index + pos;
    const end = start + char.length;

    return this.source.substring(start, end) === char
  }

  private peekAt(pos: number): string
  {
    return this.source[this.index + pos];
  }

  private peek(): string
  {
    return this.source[this.index]
  }

  private hasData(): boolean{
    return Boolean(this.source[this.index])
  }

  private advance(count = 1): void
  {
    this.eatChar(count);
  }

  private eatChar(count = 1): string
  {
    let result = '';

    while (this.hasData() && count) {
      result += this.source[this.index++];

      count --;

      this.col++;
    }

    return result
  }

  private eatNewline(): void
  {
    this.advance();

    this.recordNumber++;
    this.columnNumber = 0;

    this.line++;
    this.col = 0;
  }

  private eatLineFeed(): string
  {
    const char = this.eatChar();

    this.line++;
    this.col = 0;

    return char;
  }

  private isTextData(char: string)
  {
    const code = char.codePointAt(0);

    if (!code) return false;

    switch (this.encoding)
    {
      case 'ascii':
      {
        if (code >= 0x20 && code <= 0x21 || code >= 0x23 && code <= 0x2B || code >= 0x2D && code <= 0x7E) return true;

        return false;
      }
      default:
      {
        switch(char)
        {
          case DQ:
          case LF:
          case CR:
          case this.delimiter:
            return false;
          default:
            return true;
        }
      }
    }
  }

  private addField(headers: CSVHeaders, records: CSVRecords, field: string): void
  {
    const { hasHeader, headerLength, recordNumber, columnNumber } = this;

    const offset = hasHeader ? 1 : 0;

    const record = records[recordNumber - offset] ?? {}

    const entries = Reflect.ownKeys(record).length;

    const key = hasHeader ? headers[columnNumber] : columnNumber;

    if (hasHeader && (entries >= headerLength)) this.throwError(`Invalid amount of fields in record ${entries}`);

    record[key] = field;
  }

  private addHeader(headers: CSVHeaders, field: string): void
  {
    headers.push(field)

    this.headerLength++;
  }

  private addRecord(records: CSVRecords): void
  {
    const record = records[records.length - 1]

    if (record) {
      this.validateColumnCount(record)

      this.emit('data', record)
    }

    records.push({})
  }

  private validateColumnCount(record: CSVRecord): void
  {
    const { headerLength, hasHeader } = this

    if (hasHeader)
    {
      const prevRecord = record

      const entries = Reflect.ownKeys(record).length;

      if (prevRecord && (entries < headerLength || (entries > headerLength))) this.throwError(`Invalid amount of fields in record: ${entries}`)
    }
  }

  private addFieldOrHeader(field: string, records: CSVRecords, headers: CSVHeaders): void
  {
    const { hasHeader, recordNumber: line } = this;

    if (line === 0 && hasHeader) this.addHeader(headers, field);
    else this.addField(headers, records, field);

    this.columnNumber++;
  }

  private eatEscapedField(): string
  {
    let value = "";

    this.advance();

    accumulator:
    while(this.hasData())
    {
      const char = this.peek()

      switch(char)
      {
        case DQ:
        {
          const nextChar = this.peekAt(1);

          if (!nextChar || this.expect(this.delimiter, 1) || this.expect(CRLF, 1) || this.expect(LF, 1)) break accumulator;

          if (!this.expect(DQ, 1)) this.throwError(`Unescaped double quote, expected '"'`);

          value += this.eatChar();

          this.advance();

          break;
        }
        case LF:
        {
          value += this.eatLineFeed()

          break;
        }
        case CR:
        case COMMA:
        case this.delimiter:
        {
          value += this.eatChar();

          break;
        }
        default:
        {
          if(this.isTextData(char)) {
            value += this.eatChar();

            break;
          }

          this.throwError(`Unexpected character "${char}"`);
        }
      }
    }

    if (this.peek() !== DQ) this.throwError(`Unterminated escaped field`);

    this.advance();

    return value;
  }

  private eatUnEscapedField(): string
  {
    let value = "";

    accumlator:
    while(this.hasData())
    {
      const char = this.peek()

      switch(char)
      {
        case CR:
        case LF:
        case this.delimiter:
          break accumlator
        case COMMA:
        {
          value += this.eatChar();

          break;
        }
        default:
        {
          if(!this.isTextData(char)) this.throwError(`Unexpected character "${char}"`);

          value += this.eatChar();
        }
      }
    }

    return value;
  }

  private parseEscapedField(records: CSVRecords, headers: CSVHeaders): void
  {
    const field = this.eatEscapedField();

    this.addFieldOrHeader(field, records, headers);
  }

  private parseUnEscapedField(records: CSVRecords, headers: CSVHeaders): void
  {
    const field = this.eatUnEscapedField()

    this.addFieldOrHeader(field, records, headers);
  }

  private emit(event: 'data' | 'header', data: any): CSVParser
  {
    const listeners = this.events.get(event)

    listeners.forEach(listener => listener(data))

    return this;
  }

  on(event: 'data' | 'header', listener: Listener): CSVParser
  {
    this.events.get(event).push(listener)

    return this;
  }

  off(event: 'data' | 'header', listener: Listener): CSVParser
  {
    const listeners = this.events.get(event)

    this.events.set(event, listeners.filter(cur => cur !== listener))

    return this;
  }

  parse(source: string): ParseResult
  {
    this.reset();

    this.source = source;

    const { hasHeader } = this

    const records: CSVRecords = [];
    const headers: CSVHeaders = [];

    if (!hasHeader) records.push({})

    while(this.index < source.length)
    {
      const char = this.peek();

      switch(char)
      {
        case CR:
        {
          if (this.peekAt(1) === LF)
          {
            this.advance();

            this.eatNewline();

            if (this.hasData()) this.addRecord(records)

            break;
          }

          this.throwError('Expected "lf"');
        }
        case LF:
        {
          if (this.strict) this.throwError(`Unexpected character "lf"`);

          this.eatNewline();

          if (this.hasData()) this.addRecord(records)

          break;
        }
        case this.delimiter:
        {
          /* Empty field */

          if (this.col === 0) this.parseUnEscapedField(records, headers)

          this.advance();

          const nextChar = this.peek();

          if (this.strict && nextChar === LF) this.throwError(`Unexpected "lf"`);

          /* Empty field */
          if (!nextChar || nextChar === this.delimiter || nextChar === CR || nextChar === LF) this.parseUnEscapedField(records, headers)

          break;
        }
        case DQ:
        {
          this.parseEscapedField(records, headers);

          break;
        }
        default: this.parseUnEscapedField(records, headers);
      }
    }

    this.validateColumnCount(records[records.length - 1]);

    return records
  }
}