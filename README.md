# aider.vim

Minimal helper plugin for aider with neovim(vim).

# Demo

<img src="./demo/demo.gif" width="500">

# Requirements

This plugin also requires [aider](https://github.com/paul-gauthier/aider) to be
installed. This plugin requires
[denops.vim](https://github.com/vim-denops/denops.vim) to be installed.

# Settings

Please add the following settings to your vimrc or init.vim

```vim
example
let g:aider_command = 'aider --no-auto-commits --4turbo'
let g:aider_split_direction = 'vsplit'
```

# Usage

To use aider.vim, you can run the following commands within Vim or Neovim:

`:AiderSendPrompt` - Sends a custom prompt to aider. `:AiderAddCurrentFile` -
Adds the current file to aider's context. `:AiderRun` - Runs aider with the
current file context.
