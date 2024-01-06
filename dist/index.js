"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const tstl = __importStar(require("typescript-to-lua"));
const ts = __importStar(require("typescript"));
const lua = __importStar(require("typescript-to-lua"));
function addGlobalExportTag(node) {
    Object.assign(node, { __globalExport: true });
}
function hasGlobalExportTag(node) {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    return node.__globalExport === true;
}
function default_1(options) {
    const fileMatcher = new RegExp(options.match ? options.match : ".*");
    return {
        printer: (program, emitHost, fileName, file) => {
            class Printer extends tstl.LuaPrinter {
                constructor() {
                    super(...arguments);
                    this.exportedNames = [];
                }
                // Gather the exported definitions that have been tagged from the exports tables for methods or variables that match our API
                printVariableDeclarationStatement(statement) {
                    statement.left.forEach((declaration) => {
                        if (hasGlobalExportTag(declaration)) {
                            this.exportedNames.push(declaration.text);
                        }
                    });
                    return super.printVariableDeclarationStatement(statement);
                }
                printFunctionDefinition(statement) {
                    if (hasGlobalExportTag(statement) && lua.isTableIndexExpression(statement.left[0])) {
                        const table = statement.left[0];
                        if (lua.isStringLiteral(table.index)) {
                            this.exportedNames.push(table.index.value);
                        }
                    }
                    return super.printFunctionDefinition(statement);
                }
                // Hook the printing of the return to swap it with a block of exports for the API interface (only for matching script types)
                printReturnStatement(statement) {
                    if (fileMatcher.test(fileName) && tstl.isReturnStatement(statement)) {
                        const expressions = statement.expressions;
                        if (expressions.length > 0 && tstl.isIdentifier(expressions[0])) {
                            const identifier = expressions[0];
                            if (identifier.exportable && identifier.text === "____exports") {
                                const injectedStatements = this.exportedNames.map((n) => tstl.createAssignmentStatement(tstl.createIdentifier(n), tstl.createIdentifier(`____exports.${n}`)));
                                return super.printBlock(tstl.createBlock(injectedStatements));
                            }
                        }
                    }
                    return super.printReturnStatement(statement);
                }
            }
            return new Printer(emitHost, program, fileName).print(file);
        },
        visitors: {
            [ts.SyntaxKind.SourceFile]: (node, context) => {
                const [file] = context.superTransformNode(node);
                const statements = file.statements;
                if (fileMatcher.test(context.sourceFile.fileName)) {
                    for (const statement of statements) {
                        if (tstl.isVariableDeclarationStatement(statement)) {
                            for (const declaration of statement.left) {
                                if (tstl.isIdentifier(declaration) &&
                                    options.globals.vars.includes(declaration.text)) {
                                    addGlobalExportTag(declaration);
                                }
                            }
                        }
                        else if (tstl.isAssignmentStatement(statement) && lua.isTableIndexExpression(statement.left[0])) {
                            const table = statement.left[0];
                            if (lua.isStringLiteral(table.index)) {
                                if ((options.globals.functions.includes(table.index.value) || options.globals.vars.includes(table.index.value))) {
                                    addGlobalExportTag(statement);
                                }
                            }
                        }
                    }
                }
                return tstl.createFile(statements, file.luaLibFeatures, file.trivia);
            },
        },
    };
}
exports.default = default_1;
