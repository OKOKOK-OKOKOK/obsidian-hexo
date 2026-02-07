import * as fs from 'fs';

/**
 * 写入函数，参数为目标地址和内容
 * @param filePath
 * @param content
 */
export function writeTextFile(
    filePath: string,
    content: string
) {
    //fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
}
