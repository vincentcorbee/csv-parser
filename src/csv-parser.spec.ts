import { CSVParser } from "./csv-parser";

describe('CSVParser', () => {
  describe('Non strict mode', () => {
    it('should parse', () => {
      const parser = new CSVParser({ delimiter: ';', headers: true })

      const input = `name;id;key\nFoo;"123456";\nBar;"23456";"aaaaa"`;

      const result = parser.parse(input)

      expect(result).toMatchObject([{"id": "123456", "key": "", "name": "Foo"}, {"id": "23456", "key": "aaaaa", "name": "Bar"}])
    })

    it('should fail to parse when escaped field is unterminated', () => {
      const parser = new CSVParser({ delimiter: ';', headers: true })

      const input = `name;id;key\nFoo;"123456";\nBar;"23456";"aaaaa`;

      expect(() => parser.parse(input)).toThrow(`Unterminated escaped field at line: 2 column: 18 index: 44`)
    })

    it('should fail to parse when escaped field contains double quote that is not followed by a double quote', () => {
      const parser = new CSVParser({ delimiter: ';', headers: true })

      const input = `name;id;key\nFoo;"1234"56";\nBar;"23456";"aaaaa"`;

      expect(() => parser.parse(input)).toThrow(`Unescaped double quote, expected '\"' at line: 1 column: 9 index: 21`)
    })

    it('should fail to parse when headers are present but a record has wrong field count', () => {
      const parser = new CSVParser({ delimiter: ';', headers: true })

      const input = `name;id;key\nFoo;"123456";\nBar;"23456"`;

      expect(() => parser.parse(input)).toThrow(`Invalid amount of fields in record: 2 at line: 2 column: 11 index: 37`)
    })
  })

  describe('Strict mode', () => {
    it ('should parse', () => {
      const parser = new CSVParser({ delimiter: ';', headers: true })

      const input = `name;id;key\r\nFoo;"123456";\r\nBar;"23456";"aaaaa"`;

      const result = parser.parse(input)

      expect(result).toMatchObject([{"id": "123456", "key": "", "name": "Foo"}, {"id": "23456", "key": "aaaaa", "name": "Bar"}])
    })
    it ('should fail to parse when lines to not end with CRLF', () => {
      const parser = new CSVParser({ delimiter: ';', headers: true, strict: true })

      const input = `name;id;key\nFoo;"123456";\nBar;"23456";"aaaaa"`;

      expect(() => parser.parse(input)).toThrow(`Unexpected character "lf" at line: 0 column: 11 index: 11`)
    })
  })
})