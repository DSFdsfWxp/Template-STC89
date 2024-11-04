const fs = require('node:fs');
const process = require('node:process');
const child = require('node:child_process');

console.log("Keil C51 Compiler\n");

console.log("Reading project...");
let file = process.argv.slice(2)[0];
let project = Object.assign({
    "version": 1,
    "name": "unnamed",
    "src": [],
    "include": [],
    "outputDir": "build",
    "linkOpt": [],
    "compileOpt": [],
    "keilBinPath": ""
}, JSON.parse(fs.readFileSync(file).toString()));

if (project.version != 1) {
    console.error("Error: Not supported project version: " + String(project.version));
    process.exit(1);
}

let name = JSON.stringify(project.name);
let outputPath = `${file}/../${project.outputDir}`.replaceAll('\\', '/');
if (!outputPath.endsWith('/')) outputPath += '/';

console.log(`Compiling ${name}...`);

if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);

if (project.keilBinPath.trim()=='') {
    console.error("Error: keilBinPath is not set.");
    process.exit(1);
}
if (!project.keilBinPath.endsWith('\\')) project.keilBinPath += '\\';

let includes = `INCDIR(${project.include.join(';')})`;
let objFiles = [];

for (let src of project.src) {
    try {
        let res = child.spawnSync(`${project.keilBinPath}C51.EXE`, [src, includes].concat(project.compileOpt), {
            cwd: `${file}/..`,
            windowsHide: true,
            shell: true
        });
        if (res.status == 2) throw res.stdout.toString() + "\n\n" + res.stderr.toString();

        let outFilePathBase = `${file}/../${src}`.split('.');
        outFilePathBase.pop();
        outFilePathBase = outFilePathBase.join('.');
        let outFileNameBase = src.split('.');
        outFileNameBase.pop();
        outFileNameBase = outFileNameBase.join('.');

        fs.cpSync(`${outFilePathBase}.LST`, `${outputPath}${outFileNameBase}.LST`);
        fs.cpSync(`${outFilePathBase}.OBJ`, `${outputPath}${outFileNameBase}.OBJ`);
        fs.rmSync(`${outFilePathBase}.LST`);
        fs.rmSync(`${outFilePathBase}.OBJ`);

        objFiles.push(`${project.outputDir}/${outFileNameBase}.OBJ`);
    } catch (e) {
        console.error(`# Failed: ${src}\n${String(e)}`);
        process.exit(1);
    }
}

console.log(`Linking ${name}...`);

try {
    let res = child.spawnSync(`${project.keilBinPath}BL51.EXE`, [objFiles.join(','), 'TO', `${project.outputDir}/${project.name}`].concat(project.linkOpt), {
        cwd: `${file}/..`,
        windowsHide: true,
        shell: true
    });
    if (res.status == 2) throw res.stdout.toString() + "\n\n" + res.stderr.toString();
    let info = res.stdout.toString().trim().split('\n');
    info.pop();
    console.log(info.pop());
} catch(e) {
    console.error(`# Failed.\n${String(e)}`);
    process.exit(1);
}

console.log(`Generating hex file for ${name}...`);

try {
    let res = child.spawnSync(`${project.keilBinPath}OH51.EXE`, [`${project.outputDir}/${project.name}`], {
        cwd: `${file}/..`,
        windowsHide: true,
        shell: true
    });
    if (res.status == 2) throw res.stdout.toString() + "\n\n" + res.stderr.toString();
} catch(e) {
    console.error(`# Failed.\n${String(e)}`);
    process.exit(1);
}

console.log("Done.");