import * as tstl from "typescript-to-lua";
import * as ts from "typescript";
import * as lua from "typescript-to-lua";
import { SourceNode } from "source-map";

function addGlobalExportTag(node: tstl.Node) {
  Object.assign(node, { __globalExport: true });
}

function hasGlobalExportTag(node: tstl.Node): boolean {
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  return node.__globalExport === true;
}

interface PluginGlobals {
  functions: Array<string>;
  vars: Array<string>; // Add variable names to be considered for global exports
}

interface PluginOptions {
  name: string;
  match: string;
  globals: PluginGlobals;
}

export default function(options: PluginOptions): tstl.Plugin {
  const fileMatcher = new RegExp(options.match ? options.match : ".*");

  return {
    printer: (program, emitHost, fileName, file) => {
      class Printer extends tstl.LuaPrinter {
        private exportedNames: Array<string> = [];

        // Gather the exported definitions that have been tagged from the exports tables for methods or variables that match our API
        public printVariableAssignmentStatement(statement: tstl.AssignmentStatement): SourceNode {
          statement.left.forEach((leftExpression) => {
            if (hasGlobalExportTag(statement) && lua.isTableIndexExpression(leftExpression)) {
              const table = leftExpression;
              if (lua.isStringLiteral(table.index)) {
                this.exportedNames.push(table.index.value);
              }
            }
          });
      
          return super.printVariableAssignmentStatement(statement);
        }

        // Hook the printing of the return to swap it with a block of exports for the API interface (only for matching script types)
        public printReturnStatement(statement: tstl.ReturnStatement): SourceNode {
          if (fileMatcher.test(fileName) && tstl.isReturnStatement(statement)) {
            const expressions = statement.expressions;
            if (expressions.length > 0 && tstl.isIdentifier(expressions[0])) {
              const identifier = expressions[0] as tstl.Identifier;
              if (identifier.exportable && identifier.text === "____exports") {
                const injectedStatements = this.exportedNames.map((n) =>
                  tstl.createAssignmentStatement(tstl.createIdentifier(n), tstl.createIdentifier(`____exports.${n}`))
                );
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

        if (fileMatcher.test(context.sourceFile.fileName)) {
          for (const statement of statements) {
            if (tstl.isAssignmentStatement(statement) && lua.isTableIndexExpression(statement.left[0])) {
              const table = statement.left[0];
              if (lua.isStringLiteral(table.index)) {
                if (
                  options.globals.functions.includes(table.index.value) && tstl.isFunctionDefinition(statement)
                ) {
                  addGlobalExportTag(statement);
                } else if (
                  options.globals.vars.includes(table.index.value)
                ) {
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
