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
let g:aider_command = 'aider --no-auto-commits'
let g:aider_buffer_open_type = 'floating'
let g:conversion_path = '/path/to/conversion'
let g:aider_floatwin_width = 100
let g:aider_floatwin_height = 20
nnoremap <silent> <leader>ar :AiderRun<CR>
nnoremap <silent> <leader>aa :AiderAddCurrentFile<CR>
nnoremap <silent> <leader>aw :AiderAddWeb<CR>
nnoremap <silent> <leader>ap :AiderSendPromptWithInput<CR>
nnoremap <silent> <leader>ax :AiderExit<CR>
vmap <leader>av :AiderVisualTextWithPrompt<CR>
```

## Usage

To use aider.vim, you can run the following commands within Vim or Neovim:

- `:AiderRun` - Runs aider or display aider window.
- `:AiderAddCurrentFile` Adds the current file to aider's context.
- `:AiderExit` - Exits aider and cleans up the session.
- `:AiderVisualTextWithPrompt` - Sends the visual selection to aider with a
- `:AiderAddWeb` - Prompts for a URL and adds it to aider's context.

## TODO

- [ ] Add must reading CONVENSION.md prompt.
