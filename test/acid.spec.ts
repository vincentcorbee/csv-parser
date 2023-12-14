import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { CSVParser } from "../src"


describe('Acid test', () => {

  it('should pass acid test', () => {
    const parser = new CSVParser();

    const files = readdirSync(path.join(__dirname, './csvs'));

    for (const file of files)
    {
      const csv = readFileSync(path.join(__dirname, './csvs', file), { encoding: 'utf-8' });
      const json = readFileSync(path.join(__dirname, './json', file.replace(/csv$/, 'json')), { encoding: 'utf-8' });

      const result = parser.parse(csv);

      expect(result).toMatchObject(JSON.parse(json));
    }
  })
})