import { readFileSync } from "node:fs";
import { CSVParser } from "../src";
import path from "node:path";

const parser = new CSVParser({ delimiter: ',', headers: true, strict: false })

// const location = '/Users/vincentcorbee/Downloads/20230815-vertalingen-setlijsten-CN-FINAL.csv'
// const location = '/Users/vincentcorbee/www/npm-packages/csv-parser/sample-100000.csv'

const location = path.join(process.cwd(), 'test/csvs/large-dataset.csv')

const csv = readFileSync(location, { encoding: 'utf-8' })

const input = `name;id;key\r\nFoo;"123456";\r\nBar;"23456";"aaaaa`;

// parser.on('data', data => console.log(data))

const result = parser.parse(csv.trim())


console.log(JSON.stringify(result, null, 2))