# Additional Language Modes (Modified)

Modified fork: https://github.com/yusuke-x1t/acode-additional-langmodes

Plugin ID: `acode.additional.langmodes.modified`

The Lua and Luau modes are synchronized from `yusuke-x1t/Acode` during the build. The workflow checks the plugin, builds the archive, and uploads a directly installable downloadable artifact named `acode.additional.langmodes.modified.zip`. It does not create a GitHub Release.

## Build

```sh
npm ci
npm run check
```

The build creates `acode.additional.langmodes.modified.zip` in the repository root.
