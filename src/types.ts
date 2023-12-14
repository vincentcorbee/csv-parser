export type CSVParserOptions = {
  delimiter?: string;
  headers?: boolean;
  strict?: boolean;
  encoding?: 'utf8' | 'ascii'
}

export type CSVHeaders = string[];

export type ParseResult = CSVRecords

export type CSVRecords = CSVRecord[]

export type CSVRecord = Record<string | number, any>

export type Listener = (data: any) => void