"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const process_1 = require("process");
class Logger {
    constructor() {
        const __dirname = (0, process_1.cwd)();
        this.filePath = __dirname + '/logs/game.log';
        this.file = this.createFile();
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    static close() {
        if (Logger.instance) {
            Logger.instance.file.close();
        }
    }
    createFile() {
        const dir = path_1.default.dirname(this.filePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        return fs_1.default.createWriteStream(this.filePath, { flags: 'a' });
    }
    info(message) {
        this.file.write(this.format(message, 'INFO'));
    }
    debug(message) {
        this.file.write(this.format(message, 'DEBUG'));
    }
    log(message) {
        this.file.write(this.format(message, 'LOG'));
        console.log(message);
    }
    format(message, level) {
        return `${new Date().toISOString()} ${level}: ${message}\n`;
    }
    error(message) {
        this.file.write(this.format(message, 'ERROR'));
    }
    warn(message) {
        this.file.write(this.format(message, 'WARN'));
    }
    json(message, data) {
        this.file.write(this.format(`${message}: ${JSON.stringify(data, null, 2)}`, 'DATA'));
    }
    logToConsole(message) {
        console.log(message);
    }
}
exports.Logger = Logger;
