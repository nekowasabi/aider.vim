# aider.vim

Minimal helper plugin for aider with neovim.

## Demo

<img src="./demo/demo.gif" alt="Demo GIF" width="500">

<img src="./demo/demo_visual_mode.gif" alt="Visual Mode Demo GIF" width="500">

## Requirements

- [aider](https://github.com/paul-gauthier/aider)
- [denops.vim](https://github.com/vim-denops/denops.vim)

## Settings

### vimscript
Please add the following settings to your vimrc or init.vim.

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
augroup AiderOpenGroup
  autocmd!
  autocmd User AiderOpen call s:AiderOpenHandler()
augroup END

function! s:AiderOpenHandler() abort
  " Set key mappings for the buffer
  execute 'tnoremap <buffer=' . a:args.buf . '> <Esc> <C-\><C-n>'
  execute 'nnoremap <buffer=' . a:args.buf . '> <Esc> :AiderHide<CR>'
endfunction
```

### lua (lazy.nvim)
Please add the following settings to your lazy settings.

```lua
{ "nekowasabi/aider.vim"
  , dependencies = "vim-denops/denops.vim"
  , config = function()
    vim.g.aider_command = 'aider --no-auto-commits'
    vim.g.aider_buffer_open_type = 'floating'
    vim.g.aider_floatwin_width = 100
    vim.g.aider_floatwin_height = 20

    vim.api.nvim_create_autocmd('User',
      {
        pattern = 'AiderOpen',
        callback =
            function(args)
              vim.keymap.set('t', '<Esc>', '<C-\\><C-n>', { buffer = args.buf })
              vim.keymap.set('n', '<Esc>', '<cmd>AiderHide<CR>', { buffer = args.buf })
            end
      })
    vim.api.nvim_set_keymap('n', '<leader>ar', ':AiderRun<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aa', ':AiderAddCurrentFile<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aw', ':AiderAddWeb<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ax', ':AiderExit<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ai', ':AiderAddIgnoreCurrentFile<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aI', ':AiderOpenIgnore<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ah', ':AiderHide<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('v', '<leader>av', ':AiderVisualTextWithPrompt<CR>', { noremap = true, silent = true })
  end
  }
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
- `:AiderHide` - Hides the floating window and reloads the buffer.

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
