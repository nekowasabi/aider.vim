# aider.vim

Minimal helper plugin for aider with neovim.

## Demo

<img src="./demo/demo.gif" alt="Demo GIF" width="500">
<img src="./demo/demo_visual_mode.gif" alt="Visual Mode Demo GIF" width="500">

## Requirements

- [aider](https://github.com/paul-gauthier/aider)
- [denops.vim](https://github.com/vim-denops/denops.vim)

## Settings

Please add the following settings to your vimrc or init.vim.

```vim
ex.
let g:aider_command = 'aider --no-auto-commits --4turbo'
let g:aider_split_direction = 'vsplit'
let g:conversion_path = '/path/to/conversion'
```

## Usage

To use aider.vim, you can run the following commands within Vim or Neovim:

- `:AiderRun` - Runs aider with the current file context.
- `:AiderRestart` - Restarts aider session.
- `:AiderAddCurrentFile` Adds the current file to aider's context.
- `:AiderSendPromptWithInput` Sends a custom prompt to aider.
- `:AiderExit` - Exits aider and cleans up the session.
- `:AiderVisualTextWithPrompt` - Sends the visual selection to aider with a
- `:AiderAddWeb` - Prompts for a URL and adds it to aider's context.
