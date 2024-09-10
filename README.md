# aider.vim

Minimal helper plugin for aider with neovim.

## Demo

<img src="./demo/demo.gif" alt="Demo GIF" width="500">

<img src="./demo/demo_visual_mode.gif" alt="Visual Mode Demo GIF" width="500">

## Requirements

- [aider](https://github.com/paul-gauthier/aider)
- [denops.vim](https://github.com/vim-denops/denops.vim)

## Settings

以下の設定をvimrcまたはinit.vimに追加してください。

```vim
ex.
let g:aider_command = 'aider --no-auto-commits'
let g:aider_buffer_open_type = 'floating'
let g:aider_floatwin_width = 100
let g:aider_floatwin_height = 20
let g:aider_additional_prompt = 'Your additional prompt here'
nnoremap <silent> <leader>ar :AiderRun<CR>
nnoremap <silent> <leader>aa :AiderAddCurrentFile<CR>
nnoremap <silent> <leader>aw :AiderAddWeb<CR>
nnoremap <silent> <leader>ax :AiderExit<CR>
nnoremap <silent> <leader>ai :AiderAddIgnoreCurrentFile<CR>
nnoremap <silent> <leader>aI :AiderOpenIgnore<CR>
nnoremap <silent> <leader>ah :AiderHide<CR>
tnoremap <C-x><C-x> <C-\><C-n>:AiderHide<CR>
vmap <leader>av :AiderVisualTextWithPrompt<CR>
```

## Usage

To use aider.vim, you can run the following commands within Vim or Neovim:

- `:AiderRun` - Runs aider or display aider window.
- `:AiderAddCurrentFile` Adds the current file to aider's context.
- `:AiderExit` - Exits aider and cleans up the session.
- `:AiderVisualTextWithPrompt`
  - Edit the selected text in visual mode in a floating window and send it to
    aider.
  - In the floating window, send to aider with `<CR>` in normal mode, and close
    the floating window with `q`.
- `:AiderAddWeb` - Displays a prompt for the specified URL and adds it to the
  aider context.
- `:AiderOpenIgnore` - Opens the `.aiderignore` file in the git root directory
  if it exists.
- `:AiderAddIgnoreCurrentFile` - Adds the current file to the `.aiderignore`
- `:AiderAsk <question>` - Sends a question to aider without adding any files to
  the context

## Additional Prompt

You can set an additional prompt that will be automatically added to every
interaction with aider. This is useful for setting consistent rules or
guidelines for the AI.

To use this feature, set the `g:aider_additional_prompt` variable in your vimrc
or init.vim:

```vim
let g:aider_additional_prompt = 'Your additional prompt here'

This prompt will be displayed in the floating window when using visual mode selections, allowing you to see and edit it before sending to aider.
```
