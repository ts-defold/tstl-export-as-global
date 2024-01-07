# tstl-export-as-global-plugin
<a href="https://discord.gg/eukcq5m"><img alt="Chat with us!" src="https://img.shields.io/discord/766898804896038942.svg?colorB=7581dc&logo=discord&logoColor=white"></a>
> TypeScriptToLua plugin that transforms exports into globals

## Config
```json
"tstl": {
  "luaPlugins": [
    { 
      "name": "@ts-defold/tstl-export-as-global",
      "match": ".*script.ts$",
      "globals": { 
        "functions": [ "init", "on_input", "on_message", "on_reload", "update", "final"],
        "vars": ["who", "what", "where", "when", "why"]
      }
    }
  ]
}
```
The config accpets some additional arguments that are required to make this plugin work.
- `match`: regex pattern of file names to match to apply export transformations to
- `globals`: object that defines what to match to apply export transformations to
  - `functions`: array of names to match for export functions to expose as global
  - `vars`: array of names to match for exported variables to expose as global

## Features
Transform this TypeScript (with config values from above):
```ts
function no_export() {
    "not-exported";
}

export function init() {
    no_export();
    "init";
}

export function update(dt: number) {
    const val = dt * 100;
    val * val;
}

export function exported() {
    "exported";
}
```

To this lua:
```lua
--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local function no_export(self)
    local ____ = "not-exported"
end
function ____exports.init(self)
    no_export(nil)
    local ____ = "init"
end
function ____exports.update(self, dt)
    local val = dt * 100
    local ____ = val * val
end
function ____exports.exported(self)
    local ____ = "exported"
end
init = ____exports.init
update = ____exports.update
```

Any function marked for export is now exposed to the global (file) scope. This plugin was created to expose functions to file scope for the Defold runtime where the runtime expects to call these functions.
