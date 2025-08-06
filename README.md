# aider.vim

aaa

Minimal helper plugin for [aider](https://github.com/Aider-AI/aider) with
neovim.

## Demo

You can invoke Aider from vim

<img src="./demo/aider_default.gif" alt="Demo GIF" width="500">

You can send the selected range to Aider as context

<img src="./demo/aider_visual_mode.gif" alt="Visual Mode Demo GIF" width="500">

You can send the current buffer to Aider as context

<img src="./demo/aider_add_current_file.gif" alt="Add current file Demo GIF" width="500">

You can send voice commands to Aider using Whisper

<img src="./demo/aider_voice.gif" alt="Voice input Demo GIF" width="500">

## Requirements

- [aider](https://github.com/paul-gauthier/aider)
- [denops.vim](https://github.com/vim-denops/denops.vim)

## Settings

### vimscript

Please add the following settings to your vimrc or init.vim.

```vim
" aider.vim settings
ex.
" Aider command configuration
let g:aider_command = 'aider --no-auto-commits'

" Floating window settings
let g:aider_buffer_open_type = 'floating'
let g:aider_floatwin_width = 100
let g:aider_floatwin_height = 20
let g:aider_floatwin_border = "double"
let g:aider_floatwin_border_style = "minimal"

" Additional prompt setting
let g:aider_additional_prompt = [
  "Your additional prompt here",
  "This will be displayed in the floating window when using visual mode selections",
  "You can see and edit it before sending to aider",
]

" Key mappings
nnoremap <silent> <leader>at :AiderRun<CR>
" Add current file to Aider
nnoremap <silent> <leader>aa :AiderAddCurrentFile<CR>
" Add current file as read-only to Aider
nnoremap <silent> <leader>ar :AiderAddCurrentFileReadOnly<CR>
" Add Aider web interface
nnoremap <silent> <leader>aw :AiderAddWeb<CR>
" Exit Aider
nnoremap <silent> <leader>ax :AiderExit<CR>
" Add current file to Aider ignore list
nnoremap <silent> <leader>ai :AiderAddIgnoreCurrentFile<CR>
" Open Aider ignore list
nnoremap <silent> <leader>aI :AiderOpenIgnore<CR>
" Paste content from clipboard into Aider
nnoremap <silent> <leader>ap :AiderPaste<CR>
" Hide Aider window
nnoremap <silent> <leader>ah :AiderHide<CR>
" Hide Aider window in terminal mode
tnoremap <C-x><C-x> <C-\><C-n>:AiderHide<CR>
vmap <leader>av :AiderVisualTextWithPrompt<CR>

" Autocommand group for Aider
augroup AiderOpenGroup
  autocmd!
  autocmd User AiderOpen call s:AiderOpenHandler()
augroup END

function! s:AiderOpenHandler() abort
  " Set key mappings for the Aider buffer
  tnoremap <buffer> <Esc> <C-\><C-n>
  nnoremap <buffer> <Esc> :AiderHide<CR>
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
    vim.api.nvim_set_keymap('n', '<leader>at', ':AiderRun<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aa', ':AiderAddCurrentFile<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ar', ':AiderAddCurrentFileReadOnly<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aw', ':AiderAddWeb<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ax', ':AiderExit<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ai', ':AiderAddIgnoreCurrentFile<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aI', ':AiderOpenIgnore<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>aI', ':AiderPaste<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('n', '<leader>ah', ':AiderHide<CR>', { noremap = true, silent = true })
    vim.api.nvim_set_keymap('v', '<leader>av', ':AiderVisualTextWithPrompt<CR>', { noremap = true, silent = true })
  end
  }
```

## Usage

To use aider.vim, you can run the following commands within Vim or Neovim:

`All commands with the name "Silent" send commands to aider without moving the focus to the aider buffer.`

- `:AiderRun` - Runs aider or display aider window.
- `:AiderAddCurrentFile` - Adds the current file to aider's context.
- `:AiderAddCurrentFileReadOnly` - Adds the current file as read-only to aider's
  context.
- `:AiderAddBuffers` - Adds all currently open buffers under Git management to
  aider's context.
- `:AiderSilentAddCurrentFile` - Without moving the focus to the aider buffer,
  adds the current file to aider's context and refreshes the buffer.
- `:AiderSilentAddCurrentFileReadOnly` - Without moving the focus to the aider
  buffer, adds the current file as read-only to aider's context.
- `:AiderExit` - Exits aider and cleans up the session.
- `:AiderVisualTextWithPrompt` - Edit the selected text in visual mode in a
  floating window and send it to aider. In the floating window, send to aider
  with `<CR>` in normal mode, and close the floating window with `Q`. You can
  also backup prompt with `q`.
- `:AiderAddPartialReadonlyContext` - Adds the selected text in visual mode as
  read-only context to Aider.
- `:AiderAddWeb` - Displays a prompt for the specified URL and adds it to the
  aider context.
- `:AiderOpenIgnore` - Opens the `.aiderignore` file in the git root directory
  if it exists.
- `:AiderAddIgnoreCurrentFile` - Adds the current file to the `.aiderignore`.
- `:AiderSendPromptByCommandline <prompt>` - Sends a prompt from the command
  line and displays the Aider window.
- `:AiderSilentSendPromptByCommandline <prompt>` - Sends a prompt from the
  command line and refreshes the buffer.
- `:AiderAsk <question>` - Sends a question to aider without adding any files to
  the context.
- `:AiderHide` - Hides the floating window and reloads the buffer.
- `:AiderPaste` - Pastes the content from the clipboard into the aider context.
- `:AiderHideVisualSelectFloatingWindow` - Hides the visual selection floating
  window used for displaying selected text.
- `:AiderVoice` - Sends voice commands to Aider (using Whisper).

### Advanced Usage

If you want to send a custom prompt to Aider, use
`AiderSendPromptByCommandline`. Set it up as follows:

```vim
" Send a prompt to Aider and display the Aider window
:AiderSendPromptByCommandline "/chat-mode architect"

" Send a prompt to Aider but do not display the Aider window
:AiderSilentSendPromptByCommandline "/chat-mode code"
```

## Additional Prompt

You can set an additional prompt that will be automatically added to every
interaction with aider. This is useful for setting consistent rules or
guidelines for the AI.

To use this feature, set the `g:aider_additional_prompt` variable in your vimrc
or init.vim:

```vim
let g:aider_additional_prompt = [
  "Your additional prompt here",
  "This will be displayed in the floating window when using visual mode selections",
  "You can see and edit it before sending to aider",
]
```

This prompt will be displayed in the floating window when using visual mode
selections, allowing you to see and edit it before sending to aider.

## ddu Source

aider.vim provides a ddu source and kind, which allows you to easily select
files from your git repository and add them to the aider context.

To use this feature, you need to have
[ddu.vim](https://github.com/Shougo/ddu.vim) installed.

Here's an example configuration for your ddu settings:

```vim
call ddu#custom#patch_global({
    \ 'sources': [{'name': 'aider'}],
    \ 'sourceOptions': {
    \   'aider': {'matchers': ['matcher_substring']},
    \ },
    \ 'kindOptions': {
    \   'aider': {
    \     'defaultAction': 'add',
    \   },
    \ },
    \ })

nnoremap <silent> <Leader>ad
      \ <Cmd>call ddu#start({'sources': [{'name': 'aider'}]})<CR>
```

With this configuration, you can press `<leader>ad` to open ddu with the aider
source. You can then select files and press `<CR>` to add them to the aider
context.

### DEMO

<img src="./demo/aider_ddu_integration.gif" alt="Ddu Integration Demo GIF" width="500">

## Acknowledgements

Aider CLI tool created by [Paul Gauthier](https://github.com/paul-gauthier).
