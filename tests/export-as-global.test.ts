import * as tstl from "typescript-to-lua";
import path from "path";
import { readFileSync } from "fs";

it("assigns globals", async () => {
	const result = tstl.transpileProject(path.join(__dirname, "tests.tsconfig.json"));
	expect(result.diagnostics).toHaveLength(0);


	const lua = readFileSync(path.join(__dirname, "out", "tests", "test.script.lua"), "utf-8");
    expect(lua).toMatchSnapshot();
});

it("works with modules", async () => {
	const result = tstl.transpileProject(path.join(__dirname, "tests.tsconfig.json"));
	expect(result.diagnostics).toHaveLength(0);


	const lua = readFileSync(path.join(__dirname, "out", "tests", "test-module.lua"), "utf-8");
    expect(lua).toMatchSnapshot();
});

it("handles organic returns", async () => {
	const result = tstl.transpileProject(path.join(__dirname, "tests.tsconfig.json"));
	expect(result.diagnostics).toHaveLength(0);


	const lua = readFileSync(path.join(__dirname, "out", "tests", "test-return.script.lua"), "utf-8");
    expect(lua).toMatchSnapshot();
});