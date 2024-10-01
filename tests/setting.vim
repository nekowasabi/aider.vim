" aider.vim settings
ex.
" Aider command configuration
let g:aider_command = 'aider --no-auto-commits'

" Floating window settings
let g:aider_buffer_open_type = 'floating'
let g:aider_floatwin_width = 100
let g:aider_floatwin_height = 20

" Additional prompt setting
let g:aider_additional_prompt = 'Your additional prompt here'

" Key mappings
nnoremap <silent> <leader>ar :AiderRun<CR>
" Add current file to Aider
nnoremap <silent> <leader>aa :AiderAddCurrentFile<CR>
" Add Aider web interface
nnoremap <silent> <leader>aw :AiderAddWeb<CR>
" Exit Aider
nnoremap <silent> <leader>ax :AiderExit<CR>
" Add current file to Aider ignore list
nnoremap <silent> <leader>ai :AiderAddIgnoreCurrentFile<CR>
" Open Aider ignore list
nnoremap <silent> <leader>aI :AiderOpenIgnore<CR>
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
