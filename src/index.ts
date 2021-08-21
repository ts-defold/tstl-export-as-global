import * as tstl from "typescript-to-lua";
import * as ts from "typescript";
import * as lua from "typescript-to-lua";
import { SourceNode } from "source-map";

function addGlobalExportTag(node: tstl.FunctionDefinition) {
  Object.assign(node, { __globalExport: true });
}

function hasGlobalExportTag(node: tstl.FunctionDefinition): boolean {
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  return node.__globalExport === true;
}

interface PluginGlobals {
  functions: Array<string>
}

interface PluginOptions {
  name: string,
  match: string,
  globals: PluginGlobals
}

export default function(options: PluginOptions): tstl.Plugin {
  const fileMatcher = new RegExp(options.match ? options.match : ".*");

  return {
    printer: (program, emitHost, fileName, file) => {
      class Printer extends tstl.LuaPrinter {
        
        private exportedMethodNames: Array<string> = [];

        // Gather the exported function definitions that have been tagged from the exports tables for methods that match our API
        public printFunctionDefinition(statement: lua.FunctionDefinition): SourceNode {
          if (hasGlobalExportTag(statement) && lua.isTableIndexExpression(statement.left[0])) {
            const table = statement.left[0];
            if (lua.isStringLiteral(table.index)) {
              this.exportedMethodNames.push(table.index.value);
            }
          }

          return super.printFunctionDefinition(statement);
        }
        
        // Hook the printing of the return to swap it with a block of exports for the API interface (only for matching script types)
        public printReturnStatement(statement: tstl.ReturnStatement): SourceNode {
          if (tstl.isReturnStatement(statement)) {
            const expressions = (statement as tstl.ReturnStatement).expressions;
            if (expressions.length > 0 && tstl.isIdentifier(expressions[0])) {
              const identifier = expressions[0] as tstl.Identifier;
              if (fileMatcher.test(fileName) && identifier.exportable && identifier.text === "____exports") {
                const injectedStatements = this.exportedMethodNames.map(n => tstl.createAssignmentStatement(tstl.createIdentifier(n), tstl.createIdentifier(`____exports.${n}`)));
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
        const [file] = context.superTransformNode(node) as [tstl.File];
        const statements = file.statements;
        
        for (const statement of statements) {
          if (tstl.isAssignmentStatement(statement) && tstl.isFunctionDefinition(statement) && lua.isTableIndexExpression(statement.left[0])) {
            const table = statement.left[0];
            if (lua.isStringLiteral(table.index)) {
              if (fileMatcher.test(context.sourceFile.fileName) && options.globals.functions.includes(table.index.value)) {
                addGlobalExportTag(statement);
              }
            }
          }
        }

        return tstl.createFile(statements, file.luaLibFeatures, file.trivia);
      },
    },
  };
}
